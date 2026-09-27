import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { pageArgs, pageOf } from './pagination.js';

const fakeRequest = (originalUrl: string) => ({ originalUrl }) as Request;

describe('pageArgs', () => {
  it('skips the pages before the requested one', () => {
    expect(pageArgs({ page: 1, perPage: 20 })).toEqual({ skip: 0, take: 20 });
    expect(pageArgs({ page: 3, perPage: 5 })).toEqual({ skip: 10, take: 5 });
  });
});

describe('pageOf', () => {
  it('counts the pages, rounding a partial last page up', () => {
    const page = pageOf(fakeRequest('/api/tasks'), ['a', 'b'], 12, { page: 1, perPage: 5 });
    expect(page).toMatchObject({
      items: ['a', 'b'],
      page: 1,
      perPage: 5,
      total: 12,
      totalPages: 3,
    });
  });

  it('reports zero pages for an empty collection', () => {
    expect(pageOf(fakeRequest('/api/tasks'), [], 0, { page: 1, perPage: 20 }).totalPages).toBe(0);
  });
});

describe('page links', () => {
  it('lead to the neighbouring pages and keep the filters', () => {
    const req = fakeRequest('/api/projects/p1/tasks?status=DONE&page=2&perPage=5');
    const { _links } = pageOf(req, [], 12, { page: 2, perPage: 5 });

    expect(_links.self?.href).toBe('/api/projects/p1/tasks?status=DONE&page=2&perPage=5');
    expect(_links.first?.href).toBe('/api/projects/p1/tasks?status=DONE&page=1&perPage=5');
    expect(_links.prev?.href).toBe('/api/projects/p1/tasks?status=DONE&page=1&perPage=5');
    expect(_links.next?.href).toBe('/api/projects/p1/tasks?status=DONE&page=3&perPage=5');
    expect(_links.last?.href).toBe('/api/projects/p1/tasks?status=DONE&page=3&perPage=5');
  });

  it('have no prev on the first page and no next on the last', () => {
    const { _links } = pageOf(fakeRequest('/api/tasks'), [], 3, { page: 1, perPage: 20 });
    expect(_links.prev).toBeUndefined();
    expect(_links.next).toBeUndefined();
    expect(_links.last?.href).toBe('/api/tasks?page=1&perPage=20');
  });

  it('lead back to the last page from past the end', () => {
    const { _links } = pageOf(fakeRequest('/api/tasks?page=9'), [], 12, { page: 9, perPage: 5 });
    expect(_links.prev?.href).toBe('/api/tasks?page=3&perPage=5');
    expect(_links.next).toBeUndefined();
  });
});
