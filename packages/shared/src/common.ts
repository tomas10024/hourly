import { z } from 'zod';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** Pinigų suma eurais; saugoma dviejų skaitmenų tikslumu. */
export const Money = z.number().nonnegative().multipleOf(0.01);

/** Bendras klaidos atsakymo formatas visiems API metodams. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Puslapiavimo parametrai sąrašo metodams. */
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.infer<typeof PageQuery>;

/** Puslapiuoto sąrašo atsakymo apvalkalas. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
  });
}
