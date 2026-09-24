import type { Request } from 'express';
import type { Role } from '@hourly/shared';
import { HttpError, unauthorized } from '../middleware/error.js';

/**
 * Identity of the user performing the request.
 *
 * Routes never look at tokens or headers themselves; they only ask this file
 * who is acting. The identity comes from `req.auth`, which `authenticate`
 * (`middleware/auth.ts`) fills in from a verified JWT.
 *
 * In lab 1 the very same functions read an unverified `X-Actor-Id` header.
 * Replacing that with a JWT changed only this file - the routes calling
 * `actorId` / `requireActor` stayed as they were.
 */

/**
 * The acting user, or `null` for an anonymous request, so endpoints that
 * also work anonymously (the public project list) can adapt their behaviour.
 */
export function actorId(req: Request): string | null {
  return req.auth?.userId ?? null;
}

/** The role of the acting user, or `null` for an anonymous request. */
export function actorRole(req: Request): Role | null {
  return req.auth?.role ?? null;
}

/**
 * The acting user for endpoints that make no sense without one.
 *
 * 401 carries `WWW-Authenticate: Bearer`, telling the client to sign in.
 */
export function requireActor(req: Request): string {
  const auth = req.auth;
  if (!auth) throw unauthorized('AUTH_REQUIRED', 'Sign in to use this endpoint');
  return auth.userId;
}

/**
 * The acting user, provided their role is one of `roles`.
 *
 * 401 when nobody is signed in, 403 when the role does not fit: the caller is
 * known, and signing in again would not change the answer.
 */
export function requireRoleOf(req: Request, ...roles: Role[]): string {
  const id = requireActor(req);
  const role = req.auth!.role;
  if (!roles.includes(role)) {
    throw new HttpError(403, 'FORBIDDEN', `Only ${roles.join(' or ')} may do this`, {
      requiredRoles: roles,
      role,
    });
  }
  return id;
}
