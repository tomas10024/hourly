import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { z } from 'zod';
import { ProjectListQuery } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';
import { IdParam, parseBody, parseParams, parseQuery } from './validate.js';

/** Minimal `Request` stand-in - only the validation behaviour is under test. */
const fakeRequest = (parts: Partial<Request>) => parts as Request;

describe('parseParams', () => {
  it('returns a typed value for a well-formed UUID', () => {
    const req = fakeRequest({ params: { id: '11111111-1111-4111-8111-111111111111' } });
    expect(parseParams(IdParam, req).id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('throws 400 for a malformed id (not 404 and not 422)', () => {
    const req = fakeRequest({ params: { id: 'not-a-uuid' } });
    expect(() => parseParams(IdParam, req)).toThrowError(HttpError);
    try {
      parseParams(IdParam, req);
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe('INVALID_PATH_PARAM');
    }
  });
});

describe('parseQuery', () => {
  it('coerces textual parameters into numbers and applies defaults', () => {
    const req = fakeRequest({ query: { page: '2', perPage: '50' } });
    const query = parseQuery(ProjectListQuery, req);
    expect(query.page).toBe(2);
    expect(query.perPage).toBe(50);
    expect(query.scope).toBe('marketplace');
  });

  it('throws 400 for an unknown scope value', () => {
    const req = fakeRequest({ query: { scope: 'nonexistent' } });
    try {
      parseQuery(ProjectListQuery, req);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe('INVALID_QUERY');
    }
  });
});

describe('parseBody', () => {
  const Body = z.object({ title: z.string().min(3) });

  it('returns a typed value for a valid body', () => {
    const req = fakeRequest({ body: { title: 'Projektas' } });
    expect(parseBody(Body, req).title).toBe('Projektas');
  });

  it('throws ZodError for an invalid body (errorHandler turns it into 422)', () => {
    const req = fakeRequest({ body: { title: 'ab' } });
    expect(() => parseBody(Body, req)).toThrowError(z.ZodError);
  });
});

describe('NUL character (PostgreSQL text cannot store it)', () => {
  it('is rejected in the body as a validation error pointing at the field', () => {
    const req = fakeRequest({ body: { title: 'Projektas', tags: ['ok', 'a\u0000b'] } });
    try {
      parseBody(z.object({ title: z.string() }).loose(), req);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).issues[0]?.path).toEqual(['tags', '1']);
    }
  });

  it('is rejected in the query with 400', () => {
    const req = fakeRequest({ query: { q: '\u0000' } });
    try {
      parseQuery(ProjectListQuery, req);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe('INVALID_QUERY');
    }
  });

  it('is rejected in a path parameter with 400', () => {
    const req = fakeRequest({ params: { token: 'abc\u0000' } });
    try {
      parseParams(z.object({ token: z.string() }), req);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe('INVALID_PATH_PARAM');
    }
  });
});
