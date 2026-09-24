import { HttpError } from '../middleware/error.js';

/**
 * Account moderation rules.
 *
 * The administrator can block and delete accounts, but never their own:
 * blocking yourself locks you out, and deleting the last administrator leaves
 * the platform with nobody able to moderate it. "Your own account" is a
 * clearer rule than "the last administrator" and covers both.
 */
export function assertNotSelf(targetId: string, actorId: string): void {
  if (targetId === actorId) {
    throw new HttpError(
      422,
      'CANNOT_MODIFY_SELF',
      'An administrator cannot block or delete their own account',
    );
  }
}

/**
 * An account may be deleted only while nothing else depends on it.
 *
 * Deleting cascades: a specialist's work sessions would disappear from the
 * client's report, and a client's projects would be left without an owner.
 * Both destroy the other party's records, so such an account answers 409 and
 * is meant to be blocked instead - blocking keeps the history intact.
 */
export function assertDeletable(history: { projects: number; workSessions: number }): void {
  if (history.projects > 0 || history.workSessions > 0) {
    throw new HttpError(
      409,
      'USER_HAS_WORK_HISTORY',
      'The account takes part in projects or has logged work; block it instead',
      history,
    );
  }
}
