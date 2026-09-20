import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';

const app = buildApp();

describe('API foundation', () => {
  it('reports liveness', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 404 in the error envelope for an unknown address', async () => {
    const res = await request(app).get('/api/nera-tokio').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('serves an OpenAPI document describing the resources', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/projects', '/tasks', '/sessions']),
    );
  });

  it('forbids search engine indexing of public responses', async () => {
    const res = await request(app).get('/api/public/projects/abc');
    expect(res.headers['x-robots-tag']).toContain('noindex');
  });
});
