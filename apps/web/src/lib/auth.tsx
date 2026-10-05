"use client";

import type { AuthResponse, CurrentUser, LoginInput, RegisterInput } from "@hourly/shared";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, onSessionEnd, restoreSession, setAccessToken } from "./api";

/**
 * `guest.reason` says how the user became a guest, so the app knows where to
 * send them: after `logout` to the front page, after `expired` (the API ended
 * the sign-in) the provider itself goes to the login page with the reason;
 * without a reason there simply was no sign-in.
 *
 * `unavailable`: the API could not be asked, so it is unknown whether there is
 * a sign-in. Pages show an error rather than sending the user to the login
 * page, which would bounce them straight back (the session marker is still set).
 */
type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "guest"; user: null; reason?: "logout" | "expired" }
  | { status: "unavailable"; user: null };

type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<CurrentUser>;
  register: (input: RegisterInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  /** Replaces the cached user after the account was edited (`PATCH /auth/me`). */
  setUser: (user: CurrentUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where the app sends a user whose sign-in has ended, keeping the way back. */
export function loginPath(next?: string, reason?: string) {
  const params = new URLSearchParams();
  if (next && next !== "/login") params.set("next", next);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

/**
 * The signed-in user for the whole application.
 *
 * On start the session is restored from the `httpOnly` refresh cookie
 * (`POST /auth/refresh`); the access token never survives a reload on its
 * own. The cached server data is dropped whenever the user changes, so one
 * user's projects never show up for the next one.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const signedIn = useCallback(
    (session: AuthResponse) => {
      setAccessToken(session.accessToken);
      queryClient.clear();
      setState({ status: "authenticated", user: session.user });
      return session.user;
    },
    [queryClient],
  );

  const signedOut = useCallback(
    (reason?: "logout" | "expired") => {
      setAccessToken(null);
      queryClient.clear();
      setState({ status: "guest", user: null, reason });
    },
    [queryClient],
  );

  // Restore the session once. Strict Mode mounts twice in development; the
  // shared refresh promise in `api.ts` keeps that to a single request.
  useEffect(() => {
    let active = true;
    restoreSession()
      .then((session) => {
        if (!active) return;
        if (session) setState({ status: "authenticated", user: session.user });
        else setState({ status: "guest", user: null });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable", user: null });
      });
    return () => {
      active = false;
    };
  }, []);

  // A request found the sign-in over (logout elsewhere, blocked account). The
  // refresh cookie may still be in the browser even though the API has revoked
  // it; logging out drops it together with the session marker, otherwise
  // `proxy.ts` would bounce the login page straight back into the app.
  useEffect(
    () =>
      onSessionEnd((code) => {
        signedOut("expired");
        void fetch("/api/auth/logout", { method: "POST" })
          .catch(() => undefined)
          .finally(() => {
            if (pathname.startsWith("/app")) router.replace(loginPath(pathname, code));
          });
      }),
    [pathname, router, signedOut],
  );

  const login = useCallback(
    async (input: LoginInput) =>
      signedIn(await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input })),
    [signedIn],
  );

  const register = useCallback(
    async (input: RegisterInput) =>
      signedIn(await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: input })),
    [signedIn],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } finally {
      signedOut("logout");
    }
  }, [signedOut]);

  const setUser = useCallback(
    (user: CurrentUser) => setState({ status: "authenticated", user }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, setUser }),
    [state, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
