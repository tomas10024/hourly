import { describe, expect, it } from 'vitest';
import { pageArgs, pageOf } from './pagination.js';

describe('pageArgs', () => {
  it('skips the pages before the requested one', () => {
    expect(pageArgs({ page: 1, perPage: 20 })).toEqual({ skip: 0, take: 20 });
    expect(pageArgs({ page: 3, perPage: 5 })).toEqual({ skip: 10, take: 5 });
  });
});

describe('pageOf', () => {
  it('counts the pages, rounding a partial last page up', () => {
    expect(pageOf(['a', 'b'], 12, { page: 1, perPage: 5 })).toEqual({
      items: ['a', 'b'],
      page: 1,
      perPage: 5,
      total: 12,
      totalPages: 3,
    });
  });

  it('reports zero pages for an empty collection', () => {
    expect(pageOf([], 0, { page: 1, perPage: 20 }).totalPages).toBe(0);
  });
});
