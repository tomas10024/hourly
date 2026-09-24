import { describe, expect, it } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie.js';

const expiresAt = new Date('2026-10-24T12:00:00.000Z');

function app() {
  const app = express();
  app.use(cookieParser());
  app.post('/set', (_req, res) => {
    setRefreshCookie(res, 'secret-value', expiresAt);
    res.end();
  });
  app.post('/clear', (_req, res) => {
    clearRefreshCookie(res);
    res.end();
  });
  app.post('/read', (req, res) => {
    res.json({ token: readRefreshCookie(req) });
  });
  return app;
}

describe('refresh cookie', () => {
  it('is httpOnly, SameSite and limited to /api/auth', async () => {
    const res = await request(app()).post('/set').expect(200);
    const cookie = res.headers['set-cookie']![0]!;

    expect(cookie).toMatch(new RegExp(`^${REFRESH_COOKIE}=secret-value;`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).toContain(`Expires=${expiresAt.toUTCString()}`);
  });

  it('is not Secure outside production, so it works over local http', async () => {
    const res = await request(app()).post('/set').expect(200);
    expect(res.headers['set-cookie']![0]).not.toContain('Secure');
  });

  it('is cleared with the same path, otherwise the browser would keep it', async () => {
    const res = await request(app()).post('/clear').expect(200);
    const cookie = res.headers['set-cookie']![0]!;

    expect(cookie).toMatch(new RegExp(`^${REFRESH_COOKIE}=;`));
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('reads the token back, and nothing when the cookie is absent or empty', async () => {
    const withCookie = await request(app())
      .post('/read')
      .set('Cookie', `${REFRESH_COOKIE}=abc`)
      .expect(200);
    expect(withCookie.body.token).toBe('abc');

    expect((await request(app()).post('/read').expect(200)).body.token).toBeNull();
    expect(
      (await request(app()).post('/read').set('Cookie', `${REFRESH_COOKIE}=`).expect(200)).body
        .token,
    ).toBeNull();
  });
});
