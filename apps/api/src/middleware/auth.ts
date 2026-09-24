import type { RequestHandler } from 'express';
import type { Role } from '@hourly/shared';
import { prisma } from '../lib/prisma.js';
import { requireRoleOf } from '../lib/actor.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { HttpError, unauthorized } from './error.js';

/** Who is making the request, as proven by a verified access token. */
export interface AuthContext {
  userId: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `authenticate`: `null` for an anonymous request. */
    auth?: AuthContext | null;
  }
}

/**
 * Endpoints that authenticate by other means - a password or the refresh
 * cookie - and so ignore the `Authorization` header entirely.
 *
 * Clients commonly attach the access token to every request. Once it has
 * expired, checking it here would turn `/auth/refresh` into a 401 - the very
 * call meant to replace it - and would stop an expired user from signing out.
 */
const TOKEN_FREE_PATHS = new Set(['/auth/register', '/auth/login', '/auth/refresh', '/auth/logout']);

const BEARER = /^Bearer ([A-Za-z0-9_\-.]+)$/i;

/**
 * Establishes `req.auth` for every request under `/api`.
 *
 *   no `Authorization` header  -> anonymous (`req.auth = null`); public
 *                                 endpoints work, the rest answer 401 through
 *                                 `requireActor`
 *   a header that fails        -> 401 at once, even on a public endpoint: a
 *                                 bad token is an error, not a quiet fallback
 *                                 to guest rights
 *   a valid token              -> `req.auth = { userId, role }`
 *
 * Beyond the signature, one primary-key lookup checks that the account still
 * exists and is not blocked. That keeps tokens of deleted users from creating
 * rows that point at nobody, and makes blocking take effect immediately rather
 * than when the token expires. The role is taken from the token itself.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  req.auth = null;

  const header = req.header('Authorization');
  if (header === undefined || TOKEN_FREE_PATHS.has(req.path)) {
    next();
    return;
  }

  const match = BEARER.exec(header.trim());
  if (!match) {
    throw unauthorized('INVALID_TOKEN', 'The Authorization header must be "Bearer <token>"');
  }

  const claims = verifyAccessToken(match[1]!);

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { isBlocked: true },
  });
  if (!user) throw unauthorized('INVALID_TOKEN', 'The account no longer exists');
  if (user.isBlocked) throw new HttpError(403, 'ACCOUNT_BLOCKED', 'This account is blocked');

  req.auth = { userId: claims.sub, role: claims.role };
  next();
};

/**
 * Route-level guard: only the listed roles may pass.
 *
 *   router.get('/users', requireRole('ADMIN'), handler)
 *
 * 401 for an anonymous caller (sign in first), 403 for a signed-in user whose
 * role does not fit (signing in again will not help).
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    requireRoleOf(req, ...roles);
    next();
  };
}
