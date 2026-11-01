/**
 * Which documented operations the Postman collection never calls.
 *
 * The lab requires a request set that exercises every endpoint. Rather than
 * trusting a hand-kept list, CI compares the collection against the OpenAPI
 * document - the same one generated from the code - so an endpoint added
 * without a request fails the build.
 */

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface OpenApiLike {
  paths: Record<string, Partial<Record<string, unknown>>>;
}

interface PostmanItem {
  item?: PostmanItem[];
  request?: { method: string; url: string | { raw: string } };
}

export interface PostmanCollectionLike {
  item: PostmanItem[];
}

/** `/projects/{projectId}/tasks` -> a pattern matching one path segment per parameter. */
export function templatePattern(template: string): RegExp {
  const source = template
    .split('/')
    .map((segment) =>
      /^\{[^}]+\}$/.test(segment) ? '[^/]+' : segment.replace(/[.*+?^$()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${source}$`);
}

/**
 * The path a Postman request calls, relative to `{{baseUrl}}`, or `null` when
 * it cannot be known before the run (a link followed from a response).
 */
function requestPath(url: string): string | null {
  if (!url.startsWith('{{baseUrl}}')) return null;
  const path = url.slice('{{baseUrl}}'.length).split('?')[0]!;
  return path === '' ? '/' : path;
}

function requests(items: PostmanItem[]): { method: string; path: string }[] {
  return items.flatMap((item) => {
    if (item.item) return requests(item.item);
    if (!item.request) return [];
    const { url, method } = item.request;
    const path = requestPath(typeof url === 'string' ? url : url.raw);
    return path === null ? [] : [{ method: method.toLowerCase(), path }];
  });
}

/** Every `METHOD /path` of the document with no request in the collection. */
export function uncoveredOperations(
  openapi: OpenApiLike,
  collection: PostmanCollectionLike,
): string[] {
  const called = requests(collection.item);

  return Object.entries(openapi.paths).flatMap(([template, operations]) => {
    const pattern = templatePattern(template);
    return METHODS.filter((method) => operations[method] !== undefined)
      .filter((method) => !called.some((r) => r.method === method && pattern.test(r.path)))
      .map((method) => `${method.toUpperCase()} ${template}`);
  });
}
