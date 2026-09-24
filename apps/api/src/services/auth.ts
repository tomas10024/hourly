/**
 * Authentication rules that need no HTTP and no database.
 *
 * The routes in `routes/auth.ts` load the data and act on the answers given
 * here, so the decisions themselves can be tested in isolation.
 */

/**
 * E-mail addresses are compared case-insensitively and without surrounding
 * spaces, so `Rasa@ZaliaLanka.lt ` and `rasa@zalialanka.lt` are one account.
 * Applied both when registering and when signing in.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * What a presented refresh token means.
 *
 *   ok       - valid; rotate it: revoke this one, issue the next in the family
 *   unknown  - never issued by us (or the row is gone)
 *   expired  - issued, but its lifetime is over
 *   reused   - it was already rotated or revoked and is being played again
 *
 * `reused` is the signal of theft. Rotation makes every refresh token
 * single-use, so a second use means two parties hold the same token - the
 * user and someone who copied it. We cannot tell which one is presenting it,
 * so the whole family (every token descended from that login) is revoked and
 * both are signed out. The legitimate user signs in again; the thief cannot.
 *
 * Revocation is checked before expiry: an old stolen token replayed after it
 * expired is still evidence of theft.
 */
export type RefreshVerdict = 'ok' | 'unknown' | 'expired' | 'reused';

export function classifyRefresh(
  row: { revokedAt: Date | null; expiresAt: Date } | null,
  now: Date = new Date(),
): RefreshVerdict {
  if (row === null) return 'unknown';
  if (row.revokedAt !== null) return 'reused';
  if (row.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'ok';
}
