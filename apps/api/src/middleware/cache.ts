import type { RequestHandler } from 'express';

/**
 * Caching - the "cacheable" constraint of REST.
 *
 * Every response declares whether and by whom it may be stored:
 *
 *   /auth/*, /public/*  no-store           tokens and capability-token views
 *                                          must not be kept anywhere
 *   everything else     private, no-cache  only the caller's own browser may
 *                                          keep it, and must revalidate first
 *
 * `private` because a response depends on who asks (visibility, `_links`), so
 * a shared cache must never hand one user's answer to another. `no-cache` does
 * not forbid caching - it requires a check before reuse. Express attaches a
 * weak `ETag` to every body; a client that sends it back in `If-None-Match`
 * gets 304 Not Modified with no body when nothing changed, which saves the
 * transfer while never serving stale data.
 *
 * Mounted under `/api`, so `req.path` is relative to it.
 */
export const cacheControl: RequestHandler = (req, res, next) => {
  const sensitive = req.path.startsWith('/auth/') || req.path.startsWith('/public/');
  res.setHeader('Cache-Control', sensitive ? 'no-store' : 'private, no-cache');
  next();
};
