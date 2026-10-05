import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/next-path";
import { SESSION_MARKER } from "@/lib/session-marker";

/**
 * Route guard that runs before a page renders.
 *
 * A guest asking for `/app/**` is sent to the login page (with the way back
 * in `next`), and a signed-in user opening the login or registration page is
 * sent into the app. It only looks at the session marker, which carries no
 * secret: this saves a flash of a page the user cannot use, while every real
 * permission check stays with the API.
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.get(SESSION_MARKER)?.value === "1";
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/app") && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && signedIn) {
    const target = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
