/**
 * The `next` parameter of the login page, if it is safe to follow: a path on
 * this site. `//evil.example` or `https://...` would turn the login page into
 * an open redirect, so anything else falls back to the app.
 */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
