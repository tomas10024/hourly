import 'dotenv/config';
import { z } from 'zod';

/** Accepts `true`/`false` (any case); env variables are always strings. */
const booleanFlag = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(['true', 'false']))
  .transform((value) => value === 'true');

/**
 * `15m`, `1h`, `30s` or a plain number of seconds, converted to seconds.
 *
 * Kept as a number rather than handed to `jsonwebtoken` as a string, so the
 * lifetime is validated at startup and `exp - iat` is predictable.
 */
const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

const duration = z
  .string()
  .trim()
  .regex(/^\d+[smhd]?$/, 'Expected a duration such as 15m, 1h or 900')
  .transform((value) => {
    const unit = value.at(-1) as string;
    return unit in UNIT_SECONDS
      ? Number(value.slice(0, -1)) * UNIT_SECONDS[unit as keyof typeof UNIT_SECONDS]
      : Number(value);
  })
  .pipe(z.number().int().positive());

/** A secret shorter than this is refused in production (256 bits as base64url is 43). */
export const PRODUCTION_SECRET_MIN_LENGTH = 32;

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    WEB_ORIGIN: z.url().default('http://localhost:3000'),

    JWT_ACCESS_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL: duration.default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    // The refresh token cookie. Defaults suit local development over http,
    // where the web application and the API share a site. Deployments with the
    // two on different domains need `none` + `true` (lab 3, Azure).
    REFRESH_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    COOKIE_SECURE: booleanFlag.optional(),

    // Brute-force limits on login, registration and refresh (`lib/rate-limit.ts`).
    // On by default; switching them off is meant for load tests only.
    AUTH_RATE_LIMIT: booleanFlag.optional(),
  })
  .transform(({ COOKIE_SECURE, AUTH_RATE_LIMIT, ...rest }) => ({
    ...rest,
    COOKIE_SECURE: COOKIE_SECURE ?? rest.NODE_ENV === 'production',
    AUTH_RATE_LIMIT: AUTH_RATE_LIMIT ?? true,
  }))
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.length < PRODUCTION_SECRET_MIN_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: `Must be at least ${PRODUCTION_SECRET_MIN_LENGTH} characters in production`,
      });
    }
    // Browsers drop a `SameSite=None` cookie that is not also `Secure`.
    if (env.REFRESH_COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['REFRESH_COOKIE_SAMESITE'],
        message: 'SameSite=none requires COOKIE_SECURE=true',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Pure, so the rules above can be tested without touching `process.env`. */
export function parseEnv(source: Record<string, string | undefined>) {
  return EnvSchema.safeParse(source);
}

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment configuration:\n' +
      z.prettifyError(parsed.error) +
      '\n\nCheck apps/api/.env (template: apps/api/.env.example).',
  );
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
