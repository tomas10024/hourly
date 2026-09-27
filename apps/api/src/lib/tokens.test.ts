import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { HttpError } from '../middleware/error.js';
import { hashToken } from './secure-token.js';
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  newRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens.js';

const user = { id: 'a0000000-0000-4000-8000-000000000003', role: 'SPECIALIST' as const };
const sid = 'f0000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-24T12:00:00.000Z');

/** Runs `fn` and returns the HttpError it throws, failing if it does not. */
function rejection(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }
  throw new Error('Expected an HttpError');
}

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('signAccessToken', () => {
  it('carries the user id as sub, the role and the sign-in, with the standard claims', () => {
    const payload = jwt.decode(signAccessToken(user, sid, now)) as jwt.JwtPayload;

    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe('SPECIALIST');
    expect(payload.sid).toBe(sid);
    expect(payload.iss).toBe(JWT_ISSUER);
    expect(payload.aud).toBe(JWT_AUDIENCE);
    expect(payload.iat).toBe(now.getTime() / 1000);
  });

  it('expires after the configured lifetime', () => {
    const payload = jwt.decode(signAccessToken(user, sid, now)) as jwt.JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(env.ACCESS_TOKEN_TTL);
  });

  it('does not put the e-mail or anything personal into the token', () => {
    const payload = jwt.decode(signAccessToken(user, sid, now)) as jwt.JwtPayload;
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'role', 'sid', 'sub']);
  });

  it('signs with HS256', () => {
    const header = jwt.decode(signAccessToken(user, sid, now), { complete: true })!.header;
    expect(header.alg).toBe('HS256');
  });
});

describe('verifyAccessToken', () => {
  it('returns the claims of a token it signed', () => {
    const token = signAccessToken(user, sid, now);
    expect(verifyAccessToken(token, now)).toEqual({ sub: user.id, role: 'SPECIALIST', sid });
  });

  it('still accepts the token one second before it expires', () => {
    const token = signAccessToken(user, sid, now);
    const almost = new Date(now.getTime() + (env.ACCESS_TOKEN_TTL - 1) * 1000);
    expect(verifyAccessToken(token, almost).sub).toBe(user.id);
  });

  it('reports an expired token as TOKEN_EXPIRED, so the client knows to refresh', () => {
    const token = signAccessToken(user, sid, now);
    const later = new Date(now.getTime() + env.ACCESS_TOKEN_TTL * 1000);

    const error = rejection(() => verifyAccessToken(token, later));
    expect(error.status).toBe(401);
    expect(error.code).toBe('TOKEN_EXPIRED');
    expect(error.headers?.['WWW-Authenticate']).toContain('error="invalid_token"');
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ role: 'ADMIN' }, 'some-other-secret-0123456789', {
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(rejection(() => verifyAccessToken(forged, now)).code).toBe('INVALID_TOKEN');
  });

  it('rejects a genuine token whose payload was altered (role escalation)', () => {
    const [header, , signature] = signAccessToken(user, sid, now).split('.');
    const payload = jwt.decode(signAccessToken(user, sid, now)) as jwt.JwtPayload;
    const tampered = `${header}.${base64url({ ...payload, role: 'ADMIN' })}.${signature}`;

    expect(rejection(() => verifyAccessToken(tampered, now)).code).toBe('INVALID_TOKEN');
  });

  it('rejects an unsigned token (alg: none)', () => {
    const payload = jwt.decode(signAccessToken(user, sid, now)) as jwt.JwtPayload;
    const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(payload)}.`;

    expect(rejection(() => verifyAccessToken(unsigned, now)).code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with our secret but another algorithm', () => {
    const hs512 = jwt.sign({ role: 'CLIENT' }, env.JWT_ACCESS_SECRET, {
      algorithm: 'HS512',
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(rejection(() => verifyAccessToken(hs512, now)).code).toBe('INVALID_TOKEN');
  });

  it('rejects a token meant for another audience', () => {
    const token = jwt.sign({ role: 'CLIENT' }, env.JWT_ACCESS_SECRET, {
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: 'someone-else',
    });
    expect(rejection(() => verifyAccessToken(token, now)).code).toBe('INVALID_TOKEN');
  });

  it('rejects a correctly signed token without the expected claims', () => {
    const noRole = jwt.sign({}, env.JWT_ACCESS_SECRET, {
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const unknownRole = jwt.sign({ role: 'SUPERUSER' }, env.JWT_ACCESS_SECRET, {
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    expect(rejection(() => verifyAccessToken(noRole)).code).toBe('INVALID_TOKEN');
    expect(rejection(() => verifyAccessToken(unknownRole)).code).toBe('INVALID_TOKEN');
  });

  it('rejects a token that does not name its sign-in (no sid)', () => {
    const noSession = jwt.sign({ role: 'CLIENT' }, env.JWT_ACCESS_SECRET, {
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(rejection(() => verifyAccessToken(noSession)).code).toBe('INVALID_TOKEN');
  });

  it('rejects something that is not a JWT at all', () => {
    expect(rejection(() => verifyAccessToken('not-a-token', now)).code).toBe('INVALID_TOKEN');
  });
});

describe('newRefreshToken', () => {
  it('is an opaque cookie-safe secret whose hash is what gets stored', () => {
    const { token, tokenHash } = newRefreshToken(now);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toContain(token);
  });

  it('expires after the configured number of days', () => {
    const { expiresAt } = newRefreshToken(now);
    const days = (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(env.REFRESH_TOKEN_TTL_DAYS);
  });
});
