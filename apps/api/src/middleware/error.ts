import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { isProduction } from '../env.js';

/**
 * An application error carrying an HTTP status and a machine-readable code.
 *
 * Thrown anywhere (`throw new HttpError(404, ...)`) and turned into a response
 * in exactly one place - `errorHandler`. Routes therefore contain no
 * `res.status(...).json(...)` for failures and every error looks the same.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    /** Response headers that belong to the error, e.g. `WWW-Authenticate`. */
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Machine-readable codes of 401 responses. */
export type UnauthorizedCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED';

/**
 * A 401 response.
 *
 * HTTP requires every 401 to carry `WWW-Authenticate` naming the scheme the
 * client should use (RFC 9110). For bearer tokens, RFC 6750 adds
 * `error="invalid_token"` when a token was sent but rejected, and no error at
 * all when none was sent - which lets a client tell "log in" from "refresh".
 */
export function unauthorized(code: UnauthorizedCode, message: string): HttpError {
  const rejectedToken = code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED';
  const challenge = rejectedToken
    ? `Bearer realm="hourly", error="invalid_token", error_description="${message}"`
    : 'Bearer realm="hourly"';
  return new HttpError(401, code, message, undefined, { 'WWW-Authenticate': challenge });
}

/** Unknown address - the last route before error handling. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Not found: ${req.method} ${req.path}` },
  });
};

/* -------------------------------------------------------------------------- */
/* Recognising errors thrown by libraries                                     */
/* -------------------------------------------------------------------------- */

/**
 * `express.json()` failures.
 *
 * When the body is not valid JSON, body-parser throws a `SyntaxError` carrying
 * `type: 'entity.parse.failed'`. Without this branch such a request would come
 * back as a 500, even though the fault lies with the request, not the server.
 */
type BodyParserError = { type: string; status?: number; statusCode?: number };

function isBodyParserError(err: unknown): err is BodyParserError {
  return (
    typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string'
  );
}

/**
 * Prisma failures.
 *
 * Recognised by shape (`name` + `code`) rather than `instanceof`, so that this
 * file stays independent of the database layer. The meaning of each code is
 * documented in the Prisma error reference.
 */
type PrismaKnownError = { name: string; code: string; meta?: Record<string, unknown> };

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { name?: unknown; code?: unknown };
  return (
    candidate.name === 'PrismaClientKnownRequestError' && typeof candidate.code === 'string'
  );
}

/** Prisma code -> our HTTP response. `null` means we did not expect it. */
function fromPrisma(err: PrismaKnownError): HttpError | null {
  switch (err.code) {
    // The record being updated or deleted does not exist.
    case 'P2025':
      return new HttpError(404, 'NOT_FOUND', 'Resource not found');

    // A unique constraint was violated. In this project that always means a
    // domain conflict: a second open work session, or a second accepted
    // proposal for the same project.
    case 'P2002':
      return new HttpError(409, 'CONFLICT', 'Such a record already exists', {
        constraint: err.meta?.target ?? err.meta?.modelName,
      });

    // The referenced foreign key does not exist (e.g. an unknown `projectId`).
    // 422, because the JSON is well formed but contradicts the current data.
    case 'P2003':
      return new HttpError(422, 'INVALID_REFERENCE', 'Referenced record does not exist', {
        field: err.meta?.field_name,
      });

    // The value does not fit into the column.
    case 'P2000':
      return new HttpError(422, 'VALUE_TOO_LONG', 'Field value is too long', {
        column: err.meta?.column_name,
      });

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* The single place where an error becomes a response                         */
/* -------------------------------------------------------------------------- */

/**
 * Error handling. Registered LAST (`app.use(errorHandler)`).
 *
 * Express 5 also forwards rejected promises from `async` handlers, so routes
 * need no try/catch - a plain `throw` is enough.
 *
 * Status code policy:
 *   400 - request syntax (malformed JSON, bad parameters)
 *   401 - not authenticated: no token, or a rejected one
 *   403 - authenticated, but the role or ownership does not allow it
 *   404 - resource not found
 *   409 - domain conflict (unique constraint violation)
 *   422 - well-formed request with unacceptable content
 *   500 - server fault (the reason is withheld in production)
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Zod validation: `details` is a tree of field errors so the client can
  //    highlight the exact input that failed.
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: z.treeifyError(err),
      },
    });
    return;
  }

  // 2. An error we raised deliberately.
  if (err instanceof HttpError) {
    if (err.headers) res.set(err.headers);
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // 3. Malformed or oversized request body.
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({
        error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
      });
      return;
    }
    if (err.type === 'entity.too.large') {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
      });
      return;
    }
  }

  // 4. Database constraints.
  if (isPrismaKnownError(err)) {
    const mapped = fromPrisma(err);
    if (mapped) {
      res.status(mapped.status).json({
        error: { code: mapped.code, message: mapped.message, details: mapped.details },
      });
      return;
    }
  }

  // 5. Anything else is our own fault. In production the reason is withheld so
  //    we do not leak internal details.
  const message = err instanceof Error ? err.message : String(err);
  if (!isProduction) console.error(err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : message,
    },
  });
};
