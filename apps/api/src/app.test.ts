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

  it('requires a signed-in user to create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ title: 'Projektas', description: 'Aprasymas, kuris pakankamai ilgas' })
      .expect(401);

    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    expect(res.headers['www-authenticate']).toBe('Bearer realm="hourly"');
  });

  it('no longer accepts the lab 1 X-Actor-Id header as an identity', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('X-Actor-Id', 'a0000000-0000-4000-8000-000000000002')
      .send({ title: 'Projektas', description: 'Aprasymas, kuris pakankamai ilgas' })
      .expect(401);

    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });
});
