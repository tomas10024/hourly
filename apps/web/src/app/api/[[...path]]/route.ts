import { type NextRequest } from "next/server";
import { REFRESH_COOKIE, SESSION_MARKER } from "@/lib/session-marker";

/**
 * Proxy between the browser and the Hourly API.
 *
 * The browser never calls the API directly: requests travel through this
 * route, which lets the refresh token stay in a same-origin `httpOnly`
 * cookie, out of reach of client-side scripts. The catch-all is optional so
 * that the API entry point itself (`GET /api`) is reachable too.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * On Azure the front end before this server appends the browser's address to
 * `X-Forwarded-For`; passing the header on lets the API rate-limit per browser
 * (`TRUST_PROXY=2` there). Locally nothing sets it, and forwarding whatever the
 * browser sent would let a client pick its own address, so it stays off.
 */
const FORWARD_CLIENT_IP = process.env.FORWARD_CLIENT_IP === "true";

/** Headers forwarded to the API. */
const FORWARD_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "cookie",
  "accept",
  // Lets the browser revalidate a cached response and get 304 back.
  "if-none-match",
  ...(FORWARD_CLIENT_IP ? ["x-forwarded-for"] : []),
];

/** Headers forwarded back to the browser (`set-cookie` is handled apart). */
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  // The CSV report is offered as a download only with this header.
  "content-disposition",
  "location",
  "cache-control",
  "etag",
  "www-authenticate",
  "retry-after",
  "allow",
  "ratelimit",
  "ratelimit-policy",
  "x-robots-tag",
];

/** Statuses whose responses must not have a body. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

const EXPIRED = "Thu, 01 Jan 1970 00:00:00 GMT";

/**
 * Keeps the session marker in step with the refresh token cookie: a refresh
 * token issued (login, register, refresh) sets the marker with the same
 * expiry, a refresh token cleared (logout, refused refresh) clears it.
 */
function mirrorSessionMarker(setCookies: string[], headers: Headers) {
  for (const cookie of setCookies) {
    if (!cookie.startsWith(`${REFRESH_COOKIE}=`)) continue;

    const value = cookie.slice(REFRESH_COOKIE.length + 1).split(";")[0];
    const expires = /;\s*expires=([^;]+)/i.exec(cookie)?.[1];
    const secure = /;\s*secure/i.test(cookie) ? "; Secure" : "";
    const alive = value !== "" && expires !== undefined && new Date(expires) > new Date();

    headers.append(
      "set-cookie",
      `${SESSION_MARKER}=${alive ? "1" : ""}; Path=/; Expires=${alive ? expires : EXPIRED}; HttpOnly; SameSite=Lax${secure}`,
    );
  }
}

async function proxy(req: NextRequest) {
  // The path is taken as requested, trailing slash included: Swagger UI lives
  // at `/api/docs/` and redirects there from `/api/docs`.
  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, API_URL);

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  // A conditional request makes `fetch` add `Cache-Control: no-cache`, and
  // the API never answers 304 to that. An explicit value stops it.
  if (headers.has("if-none-match")) headers.set("cache-control", "max-age=0");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: { code: "API_UNREACHABLE", message: "Could not reach the API" } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Several cookies may be set at once; `get` would join them with commas,
  // which breaks the `Expires` dates inside them.
  const setCookies = upstream.headers.getSetCookie();
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
  mirrorSessionMarker(setCookies, responseHeaders);

  const noBody = req.method === "HEAD" || NULL_BODY_STATUSES.has(upstream.status);
  return new Response(noBody ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
