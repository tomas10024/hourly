import captured from './openapi-examples.json' with { type: 'json' };

/**
 * Request and response examples of the OpenAPI document.
 *
 * They are recorded from a Newman run of the Postman collection against seeded
 * data (`tools/capture-examples.ts`), so every example is a response the API
 * really gave. A documented status the collection never provokes falls back to
 * a representative error below.
 */

export interface CapturedExample {
  request: {
    method: string;
    path: string;
    query?: Record<string, string>;
    params?: Record<string, string>;
    /** The request carried `Authorization: Bearer <token>`. */
    bearer?: boolean;
    accept?: string;
    body?: unknown;
  };
  response: {
    status: number;
    contentType?: string;
    /** Only the headers that carry meaning: `Location`, `Retry-After`, `Allow`... */
    headers?: Record<string, string>;
    body?: unknown;
  };
}

/** `"GET /projects"` -> status (or `"200 text/csv"`) -> example. */
export type ExampleMap = Record<string, Record<string, CapturedExample>>;

export const examples = captured as ExampleMap;

const error = (code: string, message: string) => ({ error: { code, message } });

/** Statuses some operations document but the collection does not reach for them. */
export const fallbackExamples: Record<string, unknown> = {
  '400': {
    error: {
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid path parameter',
      details: { errors: [], properties: { projectId: { errors: ['Invalid UUID'] } } },
    },
  },
  '401': error('AUTH_REQUIRED', 'Sign in to use this endpoint'),
  // Any authenticated call of a blocked account; role and ownership have their own.
  '403': error('ACCOUNT_BLOCKED', 'This account is blocked'),
  '404': error('NOT_FOUND', 'Project 00000000-0000-4000-8000-000000000000 does not exist'),
  '409': error('CONFLICT', 'Such a record already exists'),
  '422': {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: {
        errors: [],
        properties: { title: { errors: ['Too small: expected string to have >=3 characters'] } },
      },
    },
  },
  '429': {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts; try again later',
      details: { retryAfterSeconds: 900 },
    },
  },
  '503': { status: 'degraded', database: 'down' },
};

interface MediaTypeLike {
  example?: unknown;
}

interface OperationLike {
  parameters?: { in: string; name: string; example?: unknown }[];
  requestBody?: { content?: Record<string, MediaTypeLike> };
  responses?: Record<string, { content?: Record<string, MediaTypeLike> }>;
}

/** The example that best shows the operation working: its success, else any. */
export function primaryExample(byStatus: Record<string, CapturedExample>) {
  const slots = Object.keys(byStatus).sort();
  const success = slots.find((slot) => slot.startsWith('2')) ?? slots[0];
  return success === undefined ? undefined : byStatus[success];
}

/** Writes the examples into a generated document, in place. */
export function applyExamples(document: { paths?: Record<string, object | undefined> }): void {
  for (const [template, operations] of Object.entries(document.paths ?? {})) {
    for (const [method, value] of Object.entries(operations ?? {}) as [string, unknown][]) {
      const operation = value as OperationLike;
      const byStatus = examples[`${method.toUpperCase()} ${template}`] ?? {};
      const primary = primaryExample(byStatus);

      const requestBody = primary?.request.body;
      const requestJson = operation.requestBody?.content?.['application/json'];
      if (requestJson && requestBody !== undefined) requestJson.example = requestBody;

      for (const parameter of operation.parameters ?? []) {
        const source = parameter.in === 'path' ? primary?.request.params : primary?.request.query;
        const value = source?.[parameter.name];
        if (value !== undefined) parameter.example = value;
      }

      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        for (const [mediaType, media] of Object.entries(response.content ?? {})) {
          const slot = mediaType.includes('json') ? status : `${status} ${mediaType}`;
          const body = byStatus[slot]?.response.body ?? fallbackExamples[slot];
          if (body !== undefined) media.example = body;
        }
      }
    }
  }
}
