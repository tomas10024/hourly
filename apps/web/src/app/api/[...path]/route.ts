import { type NextRequest } from "next/server";

/**
 * Tarpinis sluoksnis tarp naršyklės ir Valandinė API.
 *
 * Naršyklė į API tiesiogiai nesikreipia: užklausos eina per šį maršrutą,
 * todėl atnaujinimo žetonas gali likti `httpOnly` slapuke toje pačioje
 * kilmėje ir nėra pasiekiamas kliento pusės scenarijams.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Antraštės, kurias persiunčiame API pusei. */
const FORWARD_REQUEST_HEADERS = ["authorization", "content-type", "cookie", "accept"];
/** Antraštės, kurias grąžiname naršyklei. */
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
      { error: { code: "API_UNREACHABLE", message: "Nepavyko pasiekti API" } },
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
