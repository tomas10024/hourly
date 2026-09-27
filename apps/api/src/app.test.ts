import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';

const app = buildApp();

describe('API foundation', () => {
  it('reports liveness', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('offers a guest the way in at the entry point', async () => {
    const res = await request(app).get('/api').expect(200);
    expect(res.body._links.self.href).toBe('/api');
    expect(res.body._links.login).toEqual({ href: '/api/auth/login', method: 'POST' });
    expect(res.body._links.me).toBeUndefined();
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

  it('answers a malformed percent-encoding in the path with 400, not 500', async () => {
    const res = await request(app).get('/api/projects/%E0%A4%A').expect(400);
    expect(res.body.error.code).toBe('MALFORMED_URL');
  });

  it('answers a NUL character in the search text with 400, not 500', async () => {
    const res = await request(app).get('/api/projects?q=%00').expect(400);
    expect(res.body.error.code).toBe('INVALID_QUERY');
  });

  it('answers an unsupported method on a known address with 405 and Allow', async () => {
    const res = await request(app)
      .put('/api/projects/00000000-0000-4000-8000-000000000000')
      .send({})
      .expect(405);
    expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
    expect(res.headers.allow).toBe('GET, PATCH, DELETE, HEAD');
  });

  it('knows the nested addresses of the hierarchy', async () => {
    const res = await request(app)
      .put(
        '/api/projects/00000000-0000-4000-8000-000000000000/tasks/' +
          '00000000-0000-4000-8000-000000000001/sessions',
      )
      .expect(405);
    expect(res.headers.allow).toBe('GET, POST, HEAD');
  });

  it('no longer serves the flat task and session addresses', async () => {
    await request(app).get('/api/tasks/00000000-0000-4000-8000-000000000000').expect(404);
    await request(app).post('/api/sessions').send({}).expect(405);
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
