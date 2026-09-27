import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit, type Options, type RateLimitInfo } from 'express-rate-limit';
import { env } from '../env.js';
import { HttpError } from '../middleware/error.js';
import { normalizeEmail } from '../services/auth.js';

/**
 * Brute-force protection for the endpoints that take secrets.
 *
 * A password cannot be guessed through the API faster than these limits allow:
 *
 *   login    - 10 FAILED attempts per 15 minutes for one e-mail from one
 *              address. Only failures count, so a user who signs in often is
 *              never slowed down, and keying by e-mail too means one attacker
 *              cannot lock everybody out of a shared network.
 *   register - 30 accounts per hour from one address (mass sign-ups).
 *   refresh  - 30 FAILED attempts per 15 minutes from one address (guessing
 *              refresh tokens; a working client never fails).
 *
 * Over the limit the answer is 429 with `Retry-After` in seconds, in the same
 * error envelope as every other failure. The counters live in memory, which
 * is right for a single instance; several instances would need a shared store
 * (e.g. Redis).
 */

const MINUTE = 60 * 1000;

function limiter(options: Partial<Options>): RequestHandler {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !env.AUTH_RATE_LIMIT,
    handler: (req, _res, next, used) => {
      const { resetTime } = (req as Request & { rateLimit: RateLimitInfo }).rateLimit;
      const seconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(used.windowMs / 1000);
      next(
        new HttpError(
          429,
          'TOO_MANY_REQUESTS',
          'Too many attempts; try again later',
          { retryAfterSeconds: seconds },
          { 'Retry-After': String(seconds) },
        ),
      );
    },
    ...options,
  });
}

/** One address, and for login also the e-mail being tried. */
const byAddress = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown');

function byAddressAndEmail(req: Request): string {
  const { email } = (req.body ?? {}) as { email?: unknown };
  return `${byAddress(req)}|${typeof email === 'string' ? normalizeEmail(email) : ''}`;
}

export const loginLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: byAddressAndEmail,
});

export const registerLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 30,
  keyGenerator: byAddress,
});

export const refreshLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 30,
  skipSuccessfulRequests: true,
  keyGenerator: byAddress,
});
