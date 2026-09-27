import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { HttpError, errorHandler, methodNotAllowed, notFound, unauthorized } from './error.js';

/**
 * Error handling tests.
 *
 * They cover exactly the status codes the lab assignment asks us to
 * demonstrate: 400 for a bad request, 404 for a missing resource and 422 for
 * unacceptable content. A minimal app is assembled here because error
 * handling must not depend on the routes, which do not exist yet.
 */
function appThatThrows(error: unknown) {
  const app = express();
  app.use(express.json());
  app.post('/test', (_req, _res) => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps HttpError to the status it carries', async () => {
    const app = appThatThrows(new HttpError(404, 'NOT_FOUND', 'Project not found'));
    const res = await request(app).post('/test').send({}).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Project not found');
  });

  it('maps ZodError to 422 with a tree of field errors', async () => {
    const schema = z.object({ title: z.string().min(3) });
    let thrown: unknown;
    try {
      schema.parse({ title: 'ab' });
    } catch (error) {
      thrown = error;
    }

    const res = await request(appThatThrows(thrown)).post('/test').send({}).expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });

  it('maps malformed JSON to 400 rather than 500', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    const res = await request(app)
      .post('/test')
      .set('content-type', 'application/json')
      .send('{"title": ')
      .expect(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('maps Prisma P2025 (record not found) to 404', async () => {
    const prismaError = Object.assign(new Error('Record to update not found'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2025',
    });
    const res = await request(appThatThrows(prismaError)).post('/test').send({}).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('maps Prisma P2002 (unique constraint) to 409', async () => {
    const prismaError = Object.assign(new Error('Unique constraint failed'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: 'work_sessions_one_open_per_specialist' },
    });
    const res = await request(appThatThrows(prismaError)).post('/test').send({}).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.details.constraint).toContain('one_open_per_specialist');
  });

  it('maps Prisma P2003 (missing foreign key) to 422', async () => {
    const prismaError = Object.assign(new Error('Foreign key constraint failed'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2003',
      meta: { field_name: 'projectId' },
    });
    const res = await request(appThatThrows(prismaError)).post('/test').send({}).expect(422);
    expect(res.body.error.code).toBe('INVALID_REFERENCE');
  });

  it('maps Prisma P2020 (value out of range) to 422', async () => {
    const prismaError = Object.assign(new Error('Value out of range for the type'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2020',
    });
    const res = await request(appThatThrows(prismaError)).post('/test').send({}).expect(422);
    expect(res.body.error.code).toBe('VALUE_OUT_OF_RANGE');
  });

  it('maps an unknown error to 500 without revealing its message', async () => {
    const res = await request(appThatThrows(new Error('Invalid `prisma.project.create()`')))
      .post('/test')
      .send({})
      .expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal server error');
  });

  it('maps a path that cannot be percent-decoded to 400 rather than 500', async () => {
    const app = express();
    app.get('/test/:id', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    const res = await request(app).get('/test/%E0%A4%A').expect(400);
    expect(res.body.error.code).toBe('MALFORMED_URL');
  });

  it('keeps the 4xx status of a library error it has no special case for', async () => {
    const unsupported = Object.assign(new Error('unsupported content encoding "br"'), {
      status: 415,
      type: 'encoding.unsupported',
    });
    const res = await request(appThatThrows(unsupported)).post('/test').send({}).expect(415);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('sends the headers an HttpError carries', async () => {
    const error = new HttpError(429, 'TOO_MANY_REQUESTS', 'Slow down', undefined, {
      'Retry-After': '60',
    });
    const res = await request(appThatThrows(error)).post('/test').send({}).expect(429);
    expect(res.headers['retry-after']).toBe('60');
  });
});

describe('unauthorized', () => {
  it('asks for a bearer token without an error when none was sent', async () => {
    const error = unauthorized('AUTH_REQUIRED', 'Sign in required');
    const res = await request(appThatThrows(error)).post('/test').send({}).expect(401);

    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    expect(res.headers['www-authenticate']).toBe('Bearer realm="hourly"');
  });

  it.each(['INVALID_TOKEN', 'TOKEN_EXPIRED'] as const)(
    'flags a rejected token (%s) as invalid_token, per RFC 6750',
    async (code) => {
      const res = await request(appThatThrows(unauthorized(code, 'Access token has expired')))
        .post('/test')
        .send({})
        .expect(401);

      expect(res.body.error.code).toBe(code);
      expect(res.headers['www-authenticate']).toBe(
        'Bearer realm="hourly", error="invalid_token", error_description="Access token has expired"',
      );
    },
  );
});

describe('methodNotAllowed', () => {
  function appWith405() {
    const router = express.Router();
    router.get('/items/:id', (_req, res) => res.json({ ok: true }));
    router.delete('/items/:id', (_req, res) => res.status(204).end());
    const app = express();
    app.use(router);
    app.use(methodNotAllowed([router]));
    app.use(notFound);
    app.use(errorHandler);
    return app;
  }

  it('lists the supported methods of a known address in Allow', async () => {
    const res = await request(appWith405()).put('/items/1').expect(405);
    expect(res.headers.allow).toBe('GET, DELETE, HEAD');
    expect(res.body.error.details.allowed).toEqual(['GET', 'DELETE', 'HEAD']);
  });

  it('leaves an unknown address to the 404 handler', async () => {
    await request(appWith405()).put('/nothing').expect(404);
  });

  it('does not stand in the way of a supported method', async () => {
    await request(appWith405()).get('/items/1').expect(200);
  });
});
