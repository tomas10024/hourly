import { describe, expect, it } from 'vitest';
import { ProjectReport, PublicProjectView } from '@valandine/shared';
import { toCsv } from '../lib/csv.js';
import { reportToCsvRows, summarizeTasks } from './report.js';

type Session = {
  endedAt: Date | null;
  durationMinutes: number | null;
  appliedRate: number | null;
};

const finished = (minutes: number, rate: number | null): Session => ({
  endedAt: new Date('2026-09-19T13:00:00Z'),
  durationMinutes: minutes,
  appliedRate: rate,
});

const running: Session = {
  endedAt: null,
  durationMinutes: null,
  appliedRate: null,
};

const task = (id: string, sessions: Session[], hourlyRate: number | null = null) => ({
  id,
  title: `Task ${id}`,
  status: 'IN_PROGRESS' as const,
  hourlyRate,
  sessions,
});

const ID = '11111111-1111-4111-8111-111111111111';

describe('summarizeTasks', () => {
  it('turns minutes and a rate into money', () => {
    const { lines, totalMinutes, totalAmount } = summarizeTasks(
      [task(ID, [finished(240, 35)])],
      35,
    );
    expect(totalMinutes).toBe(240);
    expect(totalAmount).toBe(140); // 4 h x 35
    expect(lines[0]?.appliedRate).toBe(35);
  });

  it('sums several sessions of one task', () => {
    const { totalMinutes, totalAmount } = summarizeTasks(
      [task(ID, [finished(240, 35), finished(120, 35)])],
      35,
    );
    expect(totalMinutes).toBe(360);
    expect(totalAmount).toBe(210);
  });

  it('leaves a running session out of both the hours and the amount', () => {
    const { totalMinutes, totalAmount } = summarizeTasks(
      [task(ID, [finished(60, 30), running])],
      30,
    );
    expect(totalMinutes).toBe(60);
    expect(totalAmount).toBe(30);
  });

  it('counts unpriced hours as time but not as money', () => {
    const { totalMinutes, totalAmount, lines } = summarizeTasks(
      [task(ID, [finished(90, null)])],
      null,
    );
    expect(totalMinutes).toBe(90);
    expect(totalAmount).toBe(0);
    expect(lines[0]?.appliedRate).toBeNull();
  });

  it('rounds to whole cents', () => {
    // 50 min at 10 EUR/h = 8.333... -> 8.33
    const { totalAmount } = summarizeTasks([task(ID, [finished(50, 10)])], 10);
    expect(totalAmount).toBe(8.33);
  });

  it('shows the rate that would apply while no work is logged yet', () => {
    const withTaskRate = summarizeTasks([task(ID, [], 45)], 35);
    expect(withTaskRate.lines[0]?.appliedRate).toBe(45);

    const inherited = summarizeTasks([task(ID, [], null)], 35);
    expect(inherited.lines[0]?.appliedRate).toBe(35);
  });

  it('reports no single rate when the sessions were charged differently', () => {
    const { lines, totalAmount } = summarizeTasks(
      [task(ID, [finished(60, 30), finished(60, 40)])],
      30,
    );
    expect(lines[0]?.appliedRate).toBeNull();
    expect(totalAmount).toBe(70); // the amount is still exact
  });

  it('adds up across tasks', () => {
    const { totalMinutes, totalAmount } = summarizeTasks(
      [
        task('22222222-2222-4222-8222-222222222222', [finished(120, 35)]),
        task('33333333-3333-4333-8333-333333333333', [finished(60, 45)], 45),
      ],
      35,
    );
    expect(totalMinutes).toBe(180);
    expect(totalAmount).toBe(115); // 70 + 45
  });

  it('produces values the report and public-view schemas accept', () => {
    const summary = summarizeTasks([task(ID, [finished(50, 10)])], 10);

    expect(() =>
      ProjectReport.parse({
        project: { id: ID, title: 'Project', status: 'IN_PROGRESS', hourlyRate: 10 },
        generatedAt: new Date().toISOString(),
        lines: summary.lines,
        totalMinutes: summary.totalMinutes,
        totalAmount: summary.totalAmount,
      }),
    ).not.toThrow();

    expect(() =>
      PublicProjectView.parse({
        project: {
          id: ID,
          title: 'Project',
          description: 'Description of the shared project.',
          status: 'IN_PROGRESS',
          externalClientName: null,
        },
        tasks: summary.lines,
        totalMinutes: summary.totalMinutes,
        totalAmount: summary.totalAmount,
        expiresAt: new Date().toISOString(),
      }),
    ).not.toThrow();
  });
});

describe('reportToCsvRows', () => {
  const report = {
    project: { id: ID, title: 'Kavines sistema', status: 'IN_PROGRESS' as const, hourlyRate: 35 },
    generatedAt: '2026-09-20T12:00:00.000Z',
    lines: [
      {
        taskId: ID,
        title: 'Meniu, su kableliu',
        status: 'DONE' as const,
        totalMinutes: 240,
        appliedRate: 35,
        amount: 140,
      },
      {
        taskId: '22222222-2222-4222-8222-222222222222',
        title: 'Neapmokamas darbas',
        status: 'TODO' as const,
        totalMinutes: 30,
        appliedRate: null,
        amount: 0,
      },
    ],
    totalMinutes: 270,
    totalAmount: 140,
  };

  it('starts with the project heading and a column row', () => {
    const rows = reportToCsvRows(report);
    expect(rows[0]).toEqual(['Project', 'Kavines sistema']);
    expect(rows[4]).toEqual(['Task', 'Status', 'Minutes', 'Hours', 'Rate, EUR/h', 'Amount, EUR']);
  });

  it('converts minutes into hours and formats money', () => {
    const rows = reportToCsvRows(report);
    expect(rows[5]).toEqual(['Meniu, su kableliu', 'DONE', '240', '4.00', '35.00', '140.00']);
  });

  it('leaves the rate empty when no rate applied', () => {
    expect(reportToCsvRows(report)[6]?.[4]).toBe('');
  });

  it('ends with a total row', () => {
    const rows = reportToCsvRows(report);
    expect(rows.at(-1)).toEqual(['Total', '', '270', '4.50', '', '140.00']);
  });

  it('produces a file whose fields are escaped', () => {
    const csv = toCsv(reportToCsvRows(report));
    expect(csv).toContain('"Meniu, su kableliu"');
    expect(csv.split('\r\n')[0]).toBe('Project,Kavines sistema');
  });
});
