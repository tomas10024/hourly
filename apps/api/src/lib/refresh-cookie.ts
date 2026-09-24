import type { CookieOptions, Request, Response } from 'express';
import { env } from '../env.js';

/**
 * The refresh token cookie.
 *
 *   httpOnly - page scripts cannot read it, so an XSS bug cannot steal it;
 *   secure   - sent over HTTPS only (off for local http, see `env.ts`);
 *   sameSite - not sent along with requests started by other sites (CSRF);
 *   path     - sent only to `/api/auth`, never with ordinary API calls, so
 *              the long-lived secret travels as rarely as possible.
 */
export const REFRESH_COOKIE = 'vl_refresh';

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.REFRESH_COOKIE_SAMESITE,
  path: '/api/auth',
});

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), expires: expiresAt });
}

/** Browsers only drop a cookie when path and flags match the ones it was set with. */
export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}

export function readRefreshCookie(req: Request): string | null {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value !== '' ? value : null;
}
