import { hashToken, randomToken } from '../lib/secure-token.js';

/**
 * Share links: capability tokens.
 *
 * A share link is the second way into the system, next to a user account. It
 * is not tied to anyone: whoever holds the token may read one specific
 * project, read-only, until the link expires or is revoked.
 *
 * The token is an opaque secret (see `lib/secure-token.ts`): only its hash is
 * stored, and it is shown to its creator exactly once, when the link is made.
 */

/** 32 random bytes as base64url - 43 URL-safe characters. */
export function generateShareToken(): { token: string; tokenHash: string } {
  return randomToken();
}

export function hashShareToken(token: string): string {
  return hashToken(token);
}

export function expiresAtFromNow(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Whether a link still grants access.
 *
 * Revocation and expiry are kept apart in the data (one is a decision, the
 * other is time passing) but they are answered identically to the visitor.
 */
export function isShareUsable(
  link: { revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  if (link.revokedAt !== null) return false;
  return link.expiresAt.getTime() > now.getTime();
}

/** The address handed to the client, pointing at the web application. */
export function shareUrl(webOrigin: string, token: string): string {
  return `${webOrigin.replace(/\/$/, '')}/p/${token}`;
}
