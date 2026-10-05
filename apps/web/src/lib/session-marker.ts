/** The API's refresh token cookie (see `apps/api/src/lib/refresh-cookie.ts`). */
export const REFRESH_COOKIE = "hourly_refresh";

/**
 * A cookie that only says "this browser has a sign-in".
 *
 * The refresh token cookie is scoped to `/api/auth`, so the browser never
 * sends it with page requests and `src/proxy.ts` cannot see it. The API proxy
 * route mirrors its lifetime into this marker instead: set when the API issues
 * a refresh token, cleared when the API clears it. The marker holds no secret;
 * it only lets `proxy.ts` send a guest to the login page before a protected
 * page renders. Whether the sign-in is really valid is still the API's call.
 */
export const SESSION_MARKER = "hourly_signed_in";
