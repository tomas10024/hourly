import { z } from 'zod';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/*
 * The examples below keep Swagger UI from generating a random string that
 * matches the validation regex - it prefers an explicit example.
 */

export const Email = z.email().meta({ example: 'specialistas@hourly.lt' });

/** An ISO 8601 timestamp in UTC. */
export const DateTime = z.iso.datetime().meta({ example: '2026-09-24T09:00:00.000Z' });

/** A monetary amount in euros, kept to two decimal places. */
export const Money = z.number().nonnegative().multipleOf(0.01);

/** The error envelope shared by every API endpoint. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Pagination parameters for list endpoints. */
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.infer<typeof PageQuery>;

/** Envelope for a paginated list response. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
  });
}
