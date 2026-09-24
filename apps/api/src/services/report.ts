import type { ProjectReport, ReportTaskLine, TaskStatus } from '@hourly/shared';
import { csvNumber } from '../lib/csv.js';

/**
 * Turning logged work into money.
 *
 * Shared by the project report and by the public share-link view, so the
 * client sees exactly the same totals whether they are signed in or following
 * a read-only link.
 *
 * The input is plain numbers rather than Prisma rows: the caller converts the
 * decimals, and this stays a pure function that can be tested on its own.
 */

type SessionInput = {
  endedAt: Date | null;
  durationMinutes: number | null;
  appliedRate: number | null;
};

type TaskInput = {
  id: string;
  title: string;
  status: TaskStatus;
  hourlyRate: number | null;
  sessions: SessionInput[];
};

export type TaskSummary = {
  lines: ReportTaskLine[];
  totalMinutes: number;
  totalAmount: number;
};

/**
 * Money is summed in whole cents.
 *
 * Adding euros as floating point numbers drifts (0.1 + 0.2 !== 0.3), and the
 * `Money` schema requires two decimal places, so every amount is accumulated
 * as an integer and divided only once, at the end.
 */
function sessionCents(durationMinutes: number, rate: number): number {
  return Math.round((durationMinutes * rate * 100) / 60);
}

export function summarizeTasks(tasks: TaskInput[], projectRate: number | null): TaskSummary {
  const lines: ReportTaskLine[] = [];
  let totalMinutes = 0;
  let totalCents = 0;

  for (const task of tasks) {
    let minutes = 0;
    let cents = 0;
    let counted = 0;
    const rates = new Set<number | null>();

    for (const session of task.sessions) {
      // A running session has no duration yet and must not be billed: the
      // report has to match work that is actually finished.
      if (session.endedAt === null || session.durationMinutes === null) continue;

      counted += 1;
      minutes += session.durationMinutes;
      rates.add(session.appliedRate);

      // Hours with no rate anywhere still count towards the time, but add
      // nothing to the amount - the work is recorded, simply not priced.
      if (session.appliedRate !== null) {
        cents += sessionCents(session.durationMinutes, session.appliedRate);
      }
    }

    /**
     * Which rate to show on the line:
     *   no sessions yet   - the rate that would apply (task overrides project);
     *   one rate used     - that rate;
     *   several rates     - null, because no single number describes the line.
     * The amount is summed per session either way, so it stays correct.
     */
    const singleRate = rates.size === 1 ? ([...rates][0] ?? null) : null;
    const appliedRate = counted === 0 ? (task.hourlyRate ?? projectRate) : singleRate;

    lines.push({
      taskId: task.id,
      title: task.title,
      status: task.status,
      totalMinutes: minutes,
      appliedRate,
      amount: cents / 100,
    });

    totalMinutes += minutes;
    totalCents += cents;
  }

  return { lines, totalMinutes, totalAmount: totalCents / 100 };
}

/**
 * The same report as a table.
 *
 * The rows are built here, next to the numbers they come from, so the JSON and
 * the CSV can never disagree about what a report contains. Turning the rows
 * into a file is left to `lib/csv.ts`.
 */
export function reportToCsvRows(report: ProjectReport): string[][] {
  const rows: string[][] = [
    ['Project', report.project.title],
    ['Status', report.project.status],
    ['Generated at', report.generatedAt],
    [],
    ['Task', 'Status', 'Minutes', 'Hours', 'Rate, EUR/h', 'Amount, EUR'],
  ];

  for (const line of report.lines) {
    rows.push([
      line.title,
      line.status,
      String(line.totalMinutes),
      csvNumber(line.totalMinutes / 60),
      csvNumber(line.appliedRate),
      csvNumber(line.amount),
    ]);
  }

  rows.push([
    'Total',
    '',
    String(report.totalMinutes),
    csvNumber(report.totalMinutes / 60),
    '',
    csvNumber(report.totalAmount),
  ]);

  return rows;
}
