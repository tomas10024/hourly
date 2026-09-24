import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@valandine/shared';
import { env } from '../env.js';
import { unauthorized } from '../middleware/error.js';
import { randomToken } from './secure-token.js';

/**
 * The two tokens of a signed-in user.
 *
 * Access token - a short-lived JWT sent as `Authorization: Bearer`. It is
 * self-contained: the signature proves who the user is and which role they
 * hold, without a database lookup to decode it.
 *
 * Refresh token - a long-lived opaque secret in an `httpOnly` cookie, used
 * only to obtain a new access token. It is not a JWT because nobody needs to
 * read it; the server looks it up by hash, which is also what makes it
 * revocable (see `services/auth.ts`).
 */

export const JWT_ISSUER = 'valandine-api';
export const JWT_AUDIENCE = 'valandine';

/**
 * The one algorithm we sign with and the only one `verify` accepts. Pinning it
 * defeats `alg: none` tokens and algorithm-confusion attacks, where a token
 * announces a different algorithm than the server expects.
 */
const ALGORITHM = 'HS256';

/**
 * What an access token asserts. `iat`, `exp`, `iss` and `aud` are checked by
 * `jsonwebtoken` itself; this schema makes sure a correctly signed token also
 * has the shape the rest of the code relies on.
 */
const AccessClaims = z.object({
  sub: z.uuid(),
  role: Role,
});
export type AccessClaims = z.infer<typeof AccessClaims>;

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** `now` exists for tests; production code never passes it. */
export function signAccessToken(user: { id: string; role: Role }, now: Date = new Date()): string {
  return jwt.sign({ role: user.role, iat: toSeconds(now) }, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.ACCESS_TOKEN_TTL,
    subject: user.id,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

/**
 * Checks signature, algorithm, issuer, audience and expiry.
 *
 * An expired token gets its own code, `TOKEN_EXPIRED`, because the client's
 * reaction differs: refresh and retry, rather than sign in again. Every other
 * failure is reported as `INVALID_TOKEN` without saying which check failed.
 */
export function verifyAccessToken(token: string, now: Date = new Date()): AccessClaims {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTimestamp: toSeconds(now),
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorized('TOKEN_EXPIRED', 'Access token has expired');
    }
    throw unauthorized('INVALID_TOKEN', 'Access token is invalid');
  }

  const claims = AccessClaims.safeParse(decoded);
  if (!claims.success) throw unauthorized('INVALID_TOKEN', 'Access token is invalid');
  return claims.data;
}

/** A fresh refresh token: the value for the cookie and what the database keeps. */
export function newRefreshToken(now: Date = new Date()): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { ...randomToken(), expiresAt };
}
