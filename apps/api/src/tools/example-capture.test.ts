import { describe, expect, it } from 'vitest';
import { captureExamples, type NewmanExecution } from './example-capture.js';

const openapi = {
  paths: {
    '/': { get: { responses: { '200': {} } } },
    '/projects/{id}': { get: { responses: { '200': {}, '404': {} } } },
    '/projects/{id}/report': { get: { responses: { '200': {} } } },
    '/projects/{projectId}/tasks': { get: { responses: { '200': {} } } },
  },
};

const bytes = (text: string) => ({ data: [...Buffer.from(text, 'utf8')] });

function exchange(
  method: string,
  path: string[],
  code: number,
  body: string,
  options: { contentType?: string; query?: Record<string, string>; bearer?: boolean } = {},
): NewmanExecution {
  return {
    request: {
      method,
      url: {
        path: ['api', ...path],
        query: Object.entries(options.query ?? {}).map(([key, value]) => ({ key, value })),
      },
      header: options.bearer ? [{ key: 'Authorization', value: 'Bearer x' }] : [],
    },
    response: {
      code,
      header: [{ key: 'Content-Type', value: options.contentType ?? 'application/json; charset=utf-8' }],
      stream: bytes(body),
    },
  };
}

describe('captureExamples', () => {
  it('keeps the first exchange of each operation and status', () => {
    const examples = captureExamples(openapi, [
      exchange('GET', ['projects', 'p1'], 200, '{"id":"p1"}', { bearer: true }),
      exchange('GET', ['projects', 'p2'], 200, '{"id":"p2"}'),
      exchange('GET', ['projects', 'p3'], 404, '{"error":{"code":"NOT_FOUND"}}'),
    ]);

    expect(Object.keys(examples['GET /projects/{id}']!)).toEqual(['200', '404']);
    expect(examples['GET /projects/{id}']!['200']).toEqual({
      request: { method: 'GET', path: '/api/projects/p1', params: { id: 'p1' }, bearer: true },
      response: { status: 200, contentType: 'application/json', body: { id: 'p1' } },
    });
  });

  it('prefers the template with more fixed segments and maps the entry point', () => {
    const examples = captureExamples(openapi, [
      exchange('GET', ['projects', 'p1', 'report'], 200, '{}'),
      exchange('GET', ['projects', 'p1', 'tasks'], 200, '{}', { query: { status: 'TODO' } }),
      exchange('GET', [], 200, '{}'),
    ]);

    expect(Object.keys(examples)).toEqual([
      'GET /',
      'GET /projects/{id}/report',
      'GET /projects/{projectId}/tasks',
    ]);
    expect(examples['GET /projects/{projectId}/tasks']!['200']!.request.query).toEqual({
      status: 'TODO',
    });
  });

  it('gives a non-JSON representation its own slot', () => {
    const csv = ['a,b', '1,2', '3,4', '5,6', '7,8', '9,10', '11,12'].join('\n');
    const examples = captureExamples(openapi, [
      exchange('GET', ['projects', 'p1', 'report'], 200, '{"total":1}'),
      exchange('GET', ['projects', 'p1', 'report'], 200, csv, { contentType: 'text/csv' }),
    ]);

    const report = examples['GET /projects/{id}/report']!;
    expect(Object.keys(report)).toEqual(['200', '200 text/csv']);
    expect(report['200 text/csv']!.response.body).toBe(csv.split('\n').slice(0, 6).join('\n'));
  });

  it('cuts long lists, drops JWT signatures and skips undocumented statuses', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';
    const examples = captureExamples(openapi, [
      exchange('GET', ['projects', 'p1', 'tasks'], 200, JSON.stringify({ items: [1, 2, 3], token: jwt })),
      exchange('GET', ['projects', 'p1', 'tasks'], 500, '{}'),
      exchange('GET', ['unknown'], 200, '{}'),
    ]);

    expect(examples['GET /projects/{projectId}/tasks']).toEqual({
      '200': expect.objectContaining({
        response: expect.objectContaining({
          body: { items: [1, 2], token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.<signature>' },
        }),
      }),
    });
    expect(examples['GET /unknown']).toBeUndefined();
  });
});
