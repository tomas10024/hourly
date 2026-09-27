import { describe, expect, it } from 'vitest';
import { uncoveredOperations } from './postman-coverage.js';

const openapi = {
  paths: {
    '/': { get: {} },
    '/projects': { get: {}, post: {} },
    '/projects/{projectId}/tasks/{taskId}': { get: {}, delete: {} },
  },
};

const request = (method: string, raw: string) => ({ request: { method, url: { raw } } });

describe('uncoveredOperations', () => {
  it('matches path parameters, query strings and nested folders', () => {
    const collection = {
      item: [
        request('GET', '{{baseUrl}}'),
        request('GET', '{{baseUrl}}/projects?scope=owned'),
        { item: [request('POST', '{{baseUrl}}/projects')] },
        request('GET', '{{baseUrl}}/projects/{{projectId}}/tasks/{{taskId}}'),
      ],
    };
    expect(uncoveredOperations(openapi, collection)).toEqual([
      'DELETE /projects/{projectId}/tasks/{taskId}',
    ]);
  });

  it('does not let a parameter stand for several path segments', () => {
    const collection = { item: [request('GET', '{{baseUrl}}/projects/a/b/tasks/c')] };
    expect(uncoveredOperations(openapi, collection)).toContain(
      'GET /projects/{projectId}/tasks/{taskId}',
    );
  });

  it('ignores requests whose address is only known during the run', () => {
    const collection = { item: [request('GET', '{{followUrl}}')] };
    expect(uncoveredOperations(openapi, collection)).toHaveLength(5);
  });
});
