import type { ProjectStatus } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';

/**
 * Work session domain rules.
 *
 * The whole point of the system is that logged time can be trusted, so none of
 * these numbers may come from the client: the duration is measured by the
 * server, and the rate is resolved from the data rather than sent in.
 */

/** Tolerance for clock differences between the client and the server. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Duration in whole minutes.
 *
 * Stored alongside the timestamps so that totals can be summed directly,
 * without recomputing differences over thousands of rows.
 */
export function durationMinutes(startedAt: Date, endedAt: Date): number {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
}

/** A session must end after it started; equal timestamps are meaningless too. */
export function assertChronology(startedAt: Date, endedAt: Date | null): void {
  if (endedAt !== null && endedAt.getTime() <= startedAt.getTime()) {
    throw new HttpError(422, 'INVALID_TIME_RANGE', 'endedAt must be later than startedAt', {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    });
  }
}

/** Work cannot be logged for time that has not happened yet. */
export function assertNotInFuture(value: Date, field: 'startedAt' | 'endedAt'): void {
  if (value.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new HttpError(422, 'TIMESTAMP_IN_FUTURE', `${field} cannot be in the future`, {
      [field]: value.toISOString(),
    });
  }
}

/**
 * The rate that applies to a session.
 *
 * The hierarchy is project -> task -> session, and the rate is looked up from
 * the closest level that defines one: a task rate overrides the project rate,
 * and a project without any rate leaves the session unpriced (the hours are
 * still counted).
 *
 * The result is written into the session when it ends, so later changes to the
 * project or task rate never rewrite work that was already done.
 */
export function resolveAppliedRate(
  taskRate: number | null,
  projectRate: number | null,
): number | null {
  return taskRate ?? projectRate;
}

/**
 * Time can only be logged against work that is actually running: a draft or
 * published project has no specialist yet, and a finished one must keep the
 * totals its report was built from.
 */
export function assertProjectAcceptsWork(project: { status: ProjectStatus }): void {
  if (project.status !== 'IN_PROGRESS') {
    throw new HttpError(
      422,
      'PROJECT_NOT_IN_PROGRESS',
      `Work can only be logged on an IN_PROGRESS project, this one is ${project.status}`,
      { status: project.status },
    );
  }
}

/** Only the specialist doing the work may log time on it. */
export function assertIsAssignedSpecialist(
  project: { specialistId: string | null },
  actorId: string,
): void {
  if (project.specialistId === null || project.specialistId !== actorId) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      'Only the specialist assigned to the project may log work sessions',
    );
  }
}

/**
 * A session belongs to whoever recorded it - not even the client of the
 * project may edit or delete someone else's log entry.
 */
export function assertIsSessionAuthor(
  session: { specialistId: string },
  actorId: string,
): void {
  if (session.specialistId !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the author of the work session may change it');
  }
}
