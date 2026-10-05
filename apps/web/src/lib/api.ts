import type { ApiError, AuthResponse, Link } from "@hourly/shared";

/** An API failure carrying the HTTP status and the server error code. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    /** Seconds to wait before trying again (429). */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/* -------------------------------------------------------------------------- */
/* Access token                                                               */
/* -------------------------------------------------------------------------- */

/*
 * The access token lives in this module only - not in localStorage, not in a
 * readable cookie - so an injected script has no stored token to steal. A
 * page reload loses it; `refreshSession` gets a new one from the `httpOnly`
 * refresh cookie.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Codes after which the sign-in is over and a refresh would not help: the
 * login was ended (logout elsewhere, password change), the account is gone or
 * blocked.
 */
const SESSION_ENDED_CODES = new Set(["SESSION_REVOKED", "INVALID_TOKEN", "ACCOUNT_BLOCKED"]);

type SessionEndListener = (code: string) => void;
const sessionEndListeners = new Set<SessionEndListener>();

/** Called when a request finds that the sign-in has ended. Returns an unsubscribe. */
export function onSessionEnd(listener: SessionEndListener): () => void {
  sessionEndListeners.add(listener);
  return () => sessionEndListeners.delete(listener);
}

function endSession(code: string) {
  accessToken = null;
  for (const listener of sessionEndListeners) listener(code);
}

/* -------------------------------------------------------------------------- */
/* Refresh                                                                    */
/* -------------------------------------------------------------------------- */

let refreshing: Promise<AuthResponse | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * Resolves to the new session, or to `null` when there is no valid sign-in
 * (401/403). Other failures (network, 429, 5xx) reject: they say nothing
 * about the sign-in, so they must not sign the user out.
 *
 * Each refresh token works once (rotation), so concurrent callers must share
 * one request - a second request with the same cookie would look like a replay
 * and end the sign-in. Within a tab the shared promise takes care of that.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= withRefreshLock(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      accessToken = null;
      return null;
    }
    if (!response.ok) throw await toError(response);

    const session = (await response.json()) as AuthResponse;
    accessToken = session.accessToken;
    return session;
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

let restoring: Promise<AuthResponse | null> | null = null;

/**
 * The first refresh after a page load, made once. Every request waits for it:
 * a reload loses the access token, and a query fired before the session is
 * back would go out without one and come back 401. (Child components fire
 * their queries before `AuthProvider`'s own effect runs, so the provider
 * alone cannot be first.)
 */
export function restoreSession(): Promise<AuthResponse | null> {
  restoring ??= refreshSession();
  return restoring;
}

/**
 * Tabs of one browser share the refresh cookie. If two refreshed at the same
 * moment, the second would present the token the first had just rotated away.
 * A Web Lock makes the tabs take turns, so the second sends the new cookie.
 */
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("hourly-refresh", task);
  }
  return task();
}

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Requests go to the same-origin `/api/...` route, which forwards them to the
 * Hourly API (see `src/app/api/[[...path]]/route.ts`). `path` is the API path
 * without the `/api` prefix, e.g. `/projects?scope=owned`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;

  const payload = isJson(response) ? await response.json().catch(() => null) : await response.text();
  return payload as T;
}

/**
 * Sends a request with the access token and deals with authentication:
 * an expired token is refreshed once and the request repeated; a sign-in that
 * has ended is reported to the `onSessionEnd` listeners. Any other non-2xx
 * answer becomes an `ApiRequestError`.
 */
async function send(path: string, options: RequestOptions, retried = false): Promise<Response> {
  // Whatever the outcome - signed in, guest, API down - the request may go.
  await restoreSession().catch(() => null);

  const { body, headers, ...init } = options;
  const token = accessToken;

  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.ok) return response;

  const error = await toError(response);

  if (token !== null && error.code === "TOKEN_EXPIRED" && !retried) {
    // Another request may have refreshed while this one was on its way.
    if (accessToken !== token) return send(path, options, true);

    const session = await refreshSession();
    if (session) return send(path, options, true);
    endSession(error.code);
  } else if (token !== null && SESSION_ENDED_CODES.has(error.code)) {
    endSession(error.code);
  }

  throw error;
}

function isJson(response: Response) {
  return response.headers.get("content-type")?.includes("json") ?? false;
}

async function toError(response: Response): Promise<ApiRequestError> {
  const payload: unknown = isJson(response) ? await response.json().catch(() => null) : null;
  const error = (payload as ApiError | null)?.error;

  const header = Number(response.headers.get("retry-after"));
  const fromDetails = (error?.details as { retryAfterSeconds?: number } | undefined)
    ?.retryAfterSeconds;
  const retryAfter = Number.isFinite(header) && header > 0 ? header : fromDetails;

  return new ApiRequestError(
    response.status,
    error?.code ?? (response.status === 502 ? "API_UNREACHABLE" : "UNKNOWN"),
    error?.message ?? `Request failed (${response.status})`,
    error?.details,
    retryAfter,
  );
}

/* -------------------------------------------------------------------------- */
/* Hypermedia                                                                 */
/* -------------------------------------------------------------------------- */

/** `/api/projects/1` -> `/projects/1`: links are API paths, `apiFetch` adds the prefix. */
export function linkPath(href: string): string {
  return href.replace(/^\/api(?=\/|\?|$)/, "") || "/";
}

/**
 * Takes the action a `_links` entry offers. The client never builds these
 * addresses itself: if the server did not offer the link, the action is not
 * allowed now, and the button is not shown.
 */
export function follow<T>(link: Link, body?: unknown): Promise<T> {
  return apiFetch<T>(linkPath(link.href), { method: link.method ?? "GET", body });
}

/* -------------------------------------------------------------------------- */
/* Downloads                                                                  */
/* -------------------------------------------------------------------------- */

/** Fetches a file (e.g. the CSV report) with the same authentication handling. */
export async function apiDownload(
  path: string,
  accept: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await send(path, { headers: { accept } });
  const disposition = response.headers.get("content-disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1];

  return {
    blob: await response.blob(),
    filename: encoded ? decodeURIComponent(encoded) : (plain ?? "ataskaita"),
  };
}

/** Hands a downloaded file to the browser's save dialog. */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* Validation errors                                                          */
/* -------------------------------------------------------------------------- */

type ErrorTree = { errors?: string[]; properties?: Record<string, ErrorTree>; items?: ErrorTree[] };

/**
 * Field messages of a 422 answer, keyed by the dotted field path
 * (`budgetMin`, `items.0.title`), so a form can show each next to its input.
 * Understands the API's two shapes: Zod's error tree and `{ field }`.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError) || error.status !== 422) return {};

  const details = error.details as ({ field?: unknown } & ErrorTree) | undefined;
  if (typeof details?.field === "string") return { [details.field]: error.message };

  const result: Record<string, string> = {};
  const walk = (node: ErrorTree | undefined, path: string[]) => {
    if (!node) return;
    if (node.errors?.length && path.length > 0) result[path.join(".")] ??= node.errors[0];
    for (const [key, child] of Object.entries(node.properties ?? {})) walk(child, [...path, key]);
    node.items?.forEach((child, index) => walk(child, [...path, String(index)]));
  };
  walk(details, []);
  return result;
}
