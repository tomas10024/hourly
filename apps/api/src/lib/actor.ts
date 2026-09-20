import type { Request } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/error.js';

/**
 * Identity of the user performing the request.
 *
 * Lab 1 has no authentication yet, so the caller is identified by the
 * `X-Actor-Id` header. This is NOT a security measure - anyone can set that
 * header. Its only purpose is to let us implement the domain rules that need
 * a user (`scope=owned`, project ownership, session author) without having to
 * rewrite the routes in lab 2.
 *
 * Lab 2 changes only the body of this file:
 *
 *   export function actorId(req) {
 *     return req.user?.id ?? null;   // from a verified JWT
 *   }
 *
 * Routes stay untouched because they only ever call `actorId` / `requireActor`.
 */

/** Header name; also referenced by the OpenAPI document so the two agree. */
export const ACTOR_HEADER = 'X-Actor-Id';

/**
 * The acting user, when one is supplied.
 *
 * Returns `null` when the header is absent, so endpoints that also work
 * anonymously (the public project list) can adapt their behaviour.
 */
export function actorId(req: Request): string | null {
  const raw = req.header(ACTOR_HEADER);
  if (raw === undefined || raw.trim() === '') return null;

  const parsed = z.uuid().safeParse(raw.trim());
  if (!parsed.success) {
    throw new HttpError(400, 'INVALID_ACTOR', `${ACTOR_HEADER} header must be a UUID`);
  }
  return parsed.data;
}

/**
 * The acting user for endpoints that make no sense without one
 * (creation, `scope=owned`).
 *
 * 400 rather than 401: lab 1 has no authentication, so this is not
 * "unauthenticated" but "a required header is missing from the request".
 * In lab 2 this branch naturally becomes a 401 response.
 */
export function requireActor(req: Request): string {
  const id = actorId(req);
  if (id === null) {
    throw new HttpError(
      400,
      'ACTOR_REQUIRED',
      `This endpoint requires the ${ACTOR_HEADER} header (replaced by a JWT in lab 2)`,
    );
  }
  return id;
}
