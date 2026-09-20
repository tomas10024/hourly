import { z } from 'zod';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

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
