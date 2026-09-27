import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler, unauthorized } from '../middleware/error.js';
import { loginLimit } from './rate-limit.js';

/**
 * The login limit counts failed attempts for one e-mail from one address.
 * Each test uses its own e-mail, so the shared in-memory counters of the
 * module do not leak from one test into another.
 */
function loginApp() {
  const app = express();
  app.use(express.json());
  app.post('/login', loginLimit, (req, res) => {
    const { password } = req.body as { password: string };
    if (password !== 'teisingas') throw unauthorized('INVALID_CREDENTIALS', 'Incorrect');
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

const attempt = (app: express.Express, email: string, password: string) =>
  request(app).post('/login').send({ email, password });

describe('loginLimit', () => {
  it('answers 429 with Retry-After after ten failed attempts', async () => {
    const app = loginApp();
    for (let i = 0; i < 10; i++) await attempt(app, 'spejikas@example.lt', 'blogas').expect(401);

    const res = await attempt(app, 'spejikas@example.lt', 'blogas').expect(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('stops even the right password once the limit is reached', async () => {
    const app = loginApp();
    for (let i = 0; i < 10; i++) await attempt(app, 'uzrakinta@example.lt', 'blogas').expect(401);
    await attempt(app, 'uzrakinta@example.lt', 'teisingas').expect(429);
  });

  it('does not count successful sign-ins', async () => {
    const app = loginApp();
    for (let i = 0; i < 15; i++) await attempt(app, 'daznas@example.lt', 'teisingas').expect(200);
  });

  it('keeps a separate count per e-mail', async () => {
    const app = loginApp();
    for (let i = 0; i < 10; i++) await attempt(app, 'pirmas@example.lt', 'blogas').expect(401);
    await attempt(app, 'Antras@Example.lt ', 'blogas').expect(401);
  });
});
