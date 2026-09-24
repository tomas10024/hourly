import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { actorId, requireActor } from '../lib/actor.js';
import { signAccessToken } from '../lib/tokens.js';
import { authenticate, requireRole } from './auth.js';
import { errorHandler } from './error.js';

/**
 * `authenticate` checks the account behind a valid token with one lookup.
 * The lookup is mocked, so these tests need no database.
 */
const findUnique = vi.hoisted(() => vi.fn());
vi.mock('../lib/prisma.js', () => ({ prisma: { user: { findUnique } } }));

const specialist = { id: 'a0000000-0000-4000-8000-000000000003', role: 'SPECIALIST' as const };
const admin = { id: 'a0000000-0000-4000-8000-000000000001', role: 'ADMIN' as const };

function app() {
  const app = express();
  app.use('/api', authenticate);
  app.get('/api/who', (req, res) => {
    res.json({ actor: actorId(req), auth: req.auth });
  });
  app.get('/api/private', (req, res) => {
    res.json({ actor: requireActor(req) });
  });
  app.get('/api/admin-only', requireRole('ADMIN'), (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/auth/refresh', (req, res) => {
    res.json({ auth: req.auth });
  });
  app.use(errorHandler);
  return app;
}

const bearer = (user: { id: string; role: 'SPECIALIST' | 'ADMIN' }) =>
  `Bearer ${signAccessToken(user)}`;

beforeEach(() => {
  findUnique.mockReset();
  findUnique.mockResolvedValue({ isBlocked: false });
});

describe('authenticate', () => {
  it('lets an anonymous request through as a guest', async () => {
    const res = await request(app()).get('/api/who').expect(200);

    expect(res.body).toEqual({ actor: null, auth: null });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('identifies the user and role from a valid token', async () => {
    const res = await request(app())
      .get('/api/who')
      .set('Authorization', bearer(specialist))
      .expect(200);

    expect(res.body).toEqual({
      actor: specialist.id,
      auth: { userId: specialist.id, role: 'SPECIALIST' },
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: specialist.id } }),
    );
  });

  it('accepts the scheme name in any case, as RFC 9110 requires', async () => {
    const token = signAccessToken(specialist);
    await request(app()).get('/api/who').set('Authorization', `bearer ${token}`).expect(200);
  });

  it('refuses a bad token even on a public endpoint, instead of falling back to guest', async () => {
    const res = await request(app())
      .get('/api/who')
      .set('Authorization', 'Bearer not.a.token')
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(res.headers['www-authenticate']).toContain('error="invalid_token"');
  });

  it.each(['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer a b', 'token'])(
    'refuses a malformed Authorization header (%s)',
    async (header) => {
      const res = await request(app()).get('/api/who').set('Authorization', header).expect(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    },
  );

  it('reports an expired token as TOKEN_EXPIRED', async () => {
    const issued = new Date(Date.now() - 60 * 60 * 1000);
    const res = await request(app())
      .get('/api/who')
      .set('Authorization', `Bearer ${signAccessToken(specialist, issued)}`)
      .expect(401);

    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('refuses the token of an account that no longer exists', async () => {
    findUnique.mockResolvedValue(null);
    const res = await request(app())
      .get('/api/who')
      .set('Authorization', bearer(specialist))
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('refuses a blocked account at once, while its token is still valid', async () => {
    findUnique.mockResolvedValue({ isBlocked: true });
    const res = await request(app())
      .get('/api/who')
      .set('Authorization', bearer(specialist))
      .expect(403);

    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('ignores the header on /auth/refresh, so an expired token cannot block its own renewal', async () => {
    const res = await request(app())
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer expired.or.garbage')
      .expect(200);

    expect(res.body.auth).toBeNull();
  });
});

describe('requireActor', () => {
  it('answers 401 with a bearer challenge when nobody is signed in', async () => {
    const res = await request(app()).get('/api/private').expect(401);

    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    expect(res.headers['www-authenticate']).toBe('Bearer realm="hourly"');
  });

  it('returns the signed-in user', async () => {
    const res = await request(app())
      .get('/api/private')
      .set('Authorization', bearer(specialist))
      .expect(200);

    expect(res.body.actor).toBe(specialist.id);
  });
});

describe('requireRole', () => {
  it('answers 401 to a guest - signing in might help', async () => {
    const res = await request(app()).get('/api/admin-only').expect(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('answers 403 to a signed-in user of another role - signing in again would not', async () => {
    const res = await request(app())
      .get('/api/admin-only')
      .set('Authorization', bearer(specialist))
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.details).toEqual({ requiredRoles: ['ADMIN'], role: 'SPECIALIST' });
  });

  it('lets the right role through', async () => {
    await request(app()).get('/api/admin-only').set('Authorization', bearer(admin)).expect(200);
  });
});
