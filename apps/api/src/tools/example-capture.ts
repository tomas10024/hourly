import type { CapturedExample, ExampleMap } from '../openapi-examples.js';
import { templatePattern } from './postman-coverage.js';

/**
 * Request and response examples from a Newman run of the Postman collection.
 *
 * Each exchange is matched to its `METHOD /path` template of the OpenAPI
 * document; the first one of every documented status is kept. Long lists are
 * cut to two entries and JWT signatures dropped, so an example shows the shape
 * without burying it.
 */

interface OpenApiLike {
  paths?: Record<string, object | undefined>;
}

type PathItemLike = Partial<Record<string, { responses?: Record<string, unknown> }>>;

interface NewmanPair {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface NewmanExecution {
  request: {
    method: string;
    url: { path?: string[]; query?: NewmanPair[] };
    header?: NewmanPair[];
    body?: { mode?: string; raw?: string };
  };
  response?: {
    code: number;
    header?: NewmanPair[];
    stream?: { data: number[] };
  };
}

/** Long lists would bury the example; two entries show the shape. */
const MAX_ITEMS = 2;
const MAX_CSV_LINES = 6;

/** Response headers worth showing in an example; the rest is transport noise. */
const SHOWN_HEADERS = [
  'Location',
  'Retry-After',
  'WWW-Authenticate',
  'Allow',
  'Content-Disposition',
  'X-Robots-Tag',
];

/** Keeps a JWT decodable for the reader but drops the signature. */
function shortenTokens(value: unknown): unknown {
  if (typeof value === 'string') {
    return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)
      ? `${value.split('.').slice(0, 2).join('.')}.<signature>`
      : value;
  }
  if (Array.isArray(value)) return value.map(shortenTokens);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        key === 'items' && Array.isArray(inner)
          ? inner.slice(0, MAX_ITEMS).map(shortenTokens)
          : shortenTokens(inner),
      ]),
    );
  }
  return value;
}

const header = (pairs: NewmanPair[] | undefined, name: string) =>
  pairs?.find((pair) => !pair.disabled && pair.key.toLowerCase() === name)?.value;

function parseBody(raw: string, contentType: string | undefined): unknown {
  if (raw === '') return undefined;
  if (contentType?.includes('json')) {
    try {
      return shortenTokens(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  return raw.split('\n').slice(0, MAX_CSV_LINES).join('\n');
}

/** The values of `{name}` segments, read off the called path. */
function pathParams(template: string, actual: string): Record<string, string> {
  const names = template.split('/');
  const values = actual.split('/');
  return Object.fromEntries(
    names.flatMap((name, i) => (/^\{.+\}$/.test(name) ? [[name.slice(1, -1), values[i]!]] : [])),
  );
}

export function captureExamples(document: OpenApiLike, executions: NewmanExecution[]): ExampleMap {
  // More fixed segments win: `/projects/{id}/report` before `/projects/{projectId}/tasks`.
  const templates = Object.keys(document.paths ?? {})
    .map((template) => ({
      template,
      pattern: templatePattern(template),
      fixed: template.split('/').filter((segment) => segment && !segment.startsWith('{')).length,
    }))
    .sort((a, b) => b.fixed - a.fixed);
  const examples: ExampleMap = {};

  for (const { request, response } of executions) {
    if (!response) continue;
    const segments = request.url.path ?? [];
    if (segments[0] !== 'api') continue;
    const actual = `/${segments.slice(1).join('/')}`.replace(/\/$/, '') || '/';
    const match = templates.find(({ pattern }) => pattern.test(actual));
    if (!match) continue;

    const method = request.method.toUpperCase();
    const item = document.paths?.[match.template] as PathItemLike | undefined;
    const operation = item?.[method.toLowerCase()];
    const status = String(response.code);
    if (!operation?.responses?.[status]) continue;

    const responseType = header(response.header, 'content-type');
    const mediaType = responseType?.split(';')[0]!.trim();
    // The report answers JSON and CSV under one status; each gets an example.
    const slot = mediaType && !mediaType.includes('json') ? `${status} ${mediaType}` : status;

    const key = `${method} ${match.template}`;
    const byStatus = (examples[key] ??= {});
    if (byStatus[slot]) continue;

    const query = Object.fromEntries(
      (request.url.query ?? [])
        .filter((pair) => !pair.disabled)
        .map((pair) => [pair.key, pair.value]),
    );
    const requestType = header(request.header, 'content-type');
    const accept = header(request.header, 'accept');
    const shownHeaders = Object.fromEntries(
      SHOWN_HEADERS.flatMap((name) => {
        const value = header(response.header, name.toLowerCase());
        return value === undefined ? [] : [[name, value]];
      }),
    );
    const raw = Buffer.from(response.stream?.data ?? []).toString('utf8');

    const example: CapturedExample = {
      request: {
        method,
        path: `/api${actual === '/' ? '' : actual}`,
        ...(Object.keys(query).length > 0 && { query }),
        ...(Object.keys(pathParams(match.template, actual)).length > 0 && {
          params: pathParams(match.template, actual),
        }),
        ...(header(request.header, 'authorization') && { bearer: true }),
        ...(accept && accept !== '*/*' && { accept }),
        ...(request.body?.mode === 'raw' &&
          request.body.raw && { body: parseBody(request.body.raw, requestType ?? 'json') }),
      },
      response: {
        status: response.code,
        ...(mediaType && { contentType: mediaType }),
        ...(Object.keys(shownHeaders).length > 0 && { headers: shownHeaders }),
        ...(raw !== '' && { body: parseBody(raw, responseType) }),
      },
    };
    byStatus[slot] = example;
  }

  return Object.fromEntries(
    Object.entries(examples)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, byStatus]) => [
        key,
        Object.fromEntries(Object.entries(byStatus).sort(([a], [b]) => a.localeCompare(b))),
      ]),
  );
}
