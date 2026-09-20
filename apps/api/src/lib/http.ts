import type { Response } from 'express';

/**
 * Uniform success responses shared by every route.
 *
 * Keeping status codes and headers in one place means no route has to
 * remember whether creation returns 200 or 201, or whether a delete
 * response may carry a body.
 */

/**
 * Resource created.
 *
 * REST requires both the 201 code and a `Location` header pointing at the
 * new resource. The body is returned because the server fills in fields the
 * client cannot know (`id`, `createdAt`, initial status).
 */
export function created<T>(res: Response, location: string, body: T): void {
  res.status(201).location(location).json(body);
}

/**
 * Action succeeded, nothing to return (used for deletions).
 *
 * 204 is preferred over 200 because there is no representation left to send.
 * The standard forbids a body in a 204 response, hence `end()`.
 */
export function noContent(res: Response): void {
  res.status(204).end();
}
