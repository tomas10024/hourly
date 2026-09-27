import type { Request } from 'express';
import type { Links, PageQuery } from '@hourly/shared';
import { pageLinks } from './links.js';

/**
 * Pagination shared by every list endpoint.
 *
 * Each route runs `findMany({ ...pageArgs(query) })` and `count()` in one
 * `$transaction`, so the total is taken from the same state of the data as
 * the rows, and then wraps both with `pageOf`. The envelope therefore looks
 * the same everywhere: `{ items, page, perPage, total, totalPages, _links }`.
 */

/** `skip`/`take` for Prisma. */
export function pageArgs({ page, perPage }: PageQuery): { skip: number; take: number } {
  return { skip: (page - 1) * perPage, take: perPage };
}

export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  _links: Links;
}

/**
 * A page past the end is answered 200 with no items rather than 404: the
 * collection exists, it just has nothing that far, and `totalPages` tells the
 * client where it ends.
 */
export function pageOf<T>(
  req: Request,
  items: T[],
  total: number,
  { page, perPage }: PageQuery,
): Page<T> {
  const totalPages = Math.ceil(total / perPage);
  return {
    items,
    page,
    perPage,
    total,
    totalPages,
    _links: pageLinks(req, { page, perPage, totalPages }),
  };
}
