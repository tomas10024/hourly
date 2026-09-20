import type { Request } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/error.js';

/**
 * Request input validation.
 *
 * Each function takes a Zod schema and returns already typed data, so no
 * route has to deal with `any`. The split into three functions is not about
 * convenience but about status codes:
 *
 *   parseParams / parseQuery -> 400  (the SYNTAX of the address or parameters
 *                                     is wrong; the server cannot even make
 *                                     sense of the request - `id` is not a
 *                                     UUID, `scope=xyz`)
 *   parseBody                -> 422  (the request is understood and the JSON
 *                                     parses, but its content violates the
 *                                     domain rules)
 *
 * This split follows RFC 9110 (400) and RFC 4918 (422) and is demonstrated by
 * the Postman collection.
 */

/** The most common path parameter - a resource identifier. */
export const IdParam = z.object({ id: z.uuid() });

/**
 * Path parameters (`/projects/:id`).
 *
 * A malformed UUID returns 400 rather than 404, because such an address
 * cannot exist at all - the request itself is at fault.
 */
export function parseParams<T extends z.ZodType>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    throw new HttpError(
      400,
      'INVALID_PATH_PARAM',
      'Invalid path parameter',
      z.treeifyError(result.error),
    );
  }
  return result.data;
}

/**
 * Query parameters (`?scope=owned&page=2`).
 *
 * The schemas use `z.coerce` because everything arrives from the query string
 * as text ("2") while the code needs a number (2).
 */
export function parseQuery<T extends z.ZodType>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new HttpError(
      400,
      'INVALID_QUERY',
      'Invalid query parameters',
      z.treeifyError(result.error),
    );
  }
  return result.data;
}

/**
 * Request body.
 *
 * `parse` instead of `safeParse`: the thrown `ZodError` travels to
 * `errorHandler`, which turns it into a 422 carrying a tree of field errors.
 * That way every route reports validation failures identically and none of
 * them needs a try/catch.
 */
export function parseBody<T extends z.ZodType>(schema: T, req: Request): z.infer<T> {
  return schema.parse(req.body);
}
