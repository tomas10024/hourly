import { type NextRequest } from "next/server";

/**
 * Proxy between the browser and the Valandinė API.
 *
 * The browser never calls the API directly: requests travel through this
 * route, which lets the refresh token stay in a same-origin `httpOnly`
 * cookie, out of reach of client-side scripts.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Headers forwarded to the API. */
const FORWARD_REQUEST_HEADERS = ["authorization", "content-type", "cookie", "accept"];
/** Headers forwarded back to the browser. */
const FORWARD_RESPONSE_HEADERS = ["content-type", "set-cookie", "x-robots-tag"];

async function proxy(req: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params;
  const target = new URL(`/api/${path.join("/")}`, API_URL);
  target.search = req.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

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

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
