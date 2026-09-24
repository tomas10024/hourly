import { describe, expect, it } from 'vitest';
import { PRODUCTION_SECRET_MIN_LENGTH, parseEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://localhost/hourly',
  JWT_ACCESS_SECRET: 'dev-access-secret-pakeisti',
};

describe('parseEnv', () => {
  it('fills in the defaults for local development', () => {
    const env = parseEnv(base);

    expect(env.success).toBe(true);
    expect(env.data).toMatchObject({
      ACCESS_TOKEN_TTL: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      REFRESH_COOKIE_SAMESITE: 'lax',
      COOKIE_SECURE: false,
    });
  });

  it.each([
    ['15m', 900],
    ['1h', 3600],
    ['30s', 30],
    ['1d', 86400],
    ['600', 600],
  ])('reads ACCESS_TOKEN_TTL=%s as %i seconds', (value, seconds) => {
    expect(parseEnv({ ...base, ACCESS_TOKEN_TTL: value }).data?.ACCESS_TOKEN_TTL).toBe(seconds);
  });

  it.each(['15 minutes', '0', '-5m', '1w'])('refuses ACCESS_TOKEN_TTL=%s', (value) => {
    expect(parseEnv({ ...base, ACCESS_TOKEN_TTL: value }).success).toBe(false);
  });

  it('refuses a short secret in production but not in development', () => {
    const production = { ...base, NODE_ENV: 'production' };

    expect(parseEnv(production).success).toBe(false);
    expect(
      parseEnv({ ...production, JWT_ACCESS_SECRET: 'x'.repeat(PRODUCTION_SECRET_MIN_LENGTH) })
        .success,
    ).toBe(true);
  });

  it('makes the cookie Secure by default in production', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'x'.repeat(PRODUCTION_SECRET_MIN_LENGTH),
    });
    expect(env.data?.COOKIE_SECURE).toBe(true);
  });

  it('refuses SameSite=none without Secure, which browsers would drop', () => {
    expect(parseEnv({ ...base, REFRESH_COOKIE_SAMESITE: 'none' }).success).toBe(false);
    expect(
      parseEnv({ ...base, REFRESH_COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }).success,
    ).toBe(true);
  });

  it('refuses a COOKIE_SECURE value that is not a boolean', () => {
    expect(parseEnv({ ...base, COOKIE_SECURE: 'yes' }).success).toBe(false);
  });
});
