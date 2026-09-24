import { describe, expect, it } from 'vitest';
import {
  expiresAtFromNow,
  generateShareToken,
  hashShareToken,
  isShareUsable,
  shareUrl,
} from './shares.js';

describe('generateShareToken', () => {
  it('produces a URL-safe token of full length', () => {
    const { token } = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats itself', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateShareToken().token));
    expect(tokens.size).toBe(200);
  });

  it('returns a hash that matches the token but is not the token', () => {
    const { token, tokenHash } = generateShareToken();
    expect(tokenHash).toBe(hashShareToken(token));
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashShareToken', () => {
  it('is deterministic, so a link can be looked up by one indexed query', () => {
    expect(hashShareToken('abc')).toBe(hashShareToken('abc'));
  });

  it('changes completely for a different token', () => {
    expect(hashShareToken('abc')).not.toBe(hashShareToken('abd'));
  });
});

describe('isShareUsable', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const later = new Date('2026-10-20T12:00:00Z');
  const earlier = new Date('2026-09-01T12:00:00Z');

  it('accepts a live link', () => {
    expect(isShareUsable({ revokedAt: null, expiresAt: later }, now)).toBe(true);
  });

  it('refuses an expired link', () => {
    expect(isShareUsable({ revokedAt: null, expiresAt: earlier }, now)).toBe(false);
  });

  it('refuses a revoked link even while it would still be valid', () => {
    expect(isShareUsable({ revokedAt: earlier, expiresAt: later }, now)).toBe(false);
  });

  it('refuses a link expiring exactly now', () => {
    expect(isShareUsable({ revokedAt: null, expiresAt: now }, now)).toBe(false);
  });
});

describe('expiresAtFromNow', () => {
  it('counts whole days forward', () => {
    const now = new Date('2026-09-20T12:00:00Z');
    expect(expiresAtFromNow(30, now).toISOString()).toBe('2026-10-20T12:00:00.000Z');
  });
});

describe('shareUrl', () => {
  it('points at the web application, not at the API', () => {
    expect(shareUrl('http://localhost:3000', 'abc')).toBe('http://localhost:3000/p/abc');
  });

  it('does not double the slash when the origin ends with one', () => {
    expect(shareUrl('https://hourly.lt/', 'abc')).toBe('https://hourly.lt/p/abc');
  });
});
