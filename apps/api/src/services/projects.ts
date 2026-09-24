import type { ProjectStatus } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';

/**
 * Project domain rules.
 *
 * Kept out of the route handlers because they are pure functions: they can be
 * unit tested without a database, and the routes are left with nothing but
 * "load - check - write - serialize".
 */

/**
 * Which status may follow which.
 *
 * `PUBLISHED -> IN_PROGRESS` is deliberately absent: a project starts being
 * worked on only when one of its proposals is accepted, which is handled by
 * the proposal endpoint inside a transaction. Allowing it here would let a
 * project reach IN_PROGRESS with no specialist assigned.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * 422 rather than 400: the request is well formed, but it contradicts the
 * current state of the data.
 */
export function assertStatusTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (from === to) return;

  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    const hint =
      from === 'PUBLISHED' && to === 'IN_PROGRESS'
        ? ' A project starts progressing when a proposal is accepted (PATCH /proposals/{id}).'
        : '';

    throw new HttpError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot change project status from ${from} to ${to}.${hint}`,
      { from, to, allowed: ALLOWED_STATUS_TRANSITIONS[from] },
    );
  }
}

/**
 * The budget range must stay consistent after a partial update, so this is
 * checked against the merged values rather than the request body alone.
 */
export function assertBudgetRange(min: number | null, max: number | null): void {
  if (min !== null && max !== null && min > max) {
    throw new HttpError(
      422,
      'INVALID_BUDGET_RANGE',
      'budgetMin must not be greater than budgetMax',
      { budgetMin: min, budgetMax: max },
    );
  }
}

/**
 * Only the two parties of a project may act on it - editing it, managing its
 * tasks, sharing it or reading its report.
 *
 * In lab 1 the actor comes from a header and is therefore not trustworthy;
 * the check exists to express the domain rule. Once lab 2 derives the actor
 * from a JWT, the very same call becomes a real authorization check.
 */
export function assertCanManage(
  project: { clientId: string | null; specialistId: string | null },
  actorId: string,
): void {
  if (project.clientId !== actorId && project.specialistId !== actorId) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      'Only the client or the assigned specialist of this project may do that',
    );
  }
}
