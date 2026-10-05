import type { CurrentUser, Links, UpdateMeInput } from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { useAuth } from "../auth";
import type { Linked } from "../types";
import { keys } from "./keys";

/**
 * `GET /api` - the entry point. Its links depend on who asks, so the menu is
 * built from them; the key includes the user to refetch after a sign-in.
 */
export function useApiRoot() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: [...keys.root(), user?.id ?? null],
    queryFn: () => apiFetch<{ name: string; _links: Links }>("/"),
    enabled: status !== "loading",
  });
}

export type Health = { status: string; database?: string };

/** `GET /health` (the process answers) or `GET /health/ready` (and the database too). */
export function useHealth(kind: "live" | "ready" = "ready") {
  return useQuery({
    queryKey: keys.health(kind),
    queryFn: () => apiFetch<Health>(kind === "ready" ? "/health/ready" : "/health"),
    refetchInterval: 60_000,
  });
}

/** `GET /auth/me` - the own account with its e-mail. */
export function useMe() {
  const { status } = useAuth();
  return useQuery({
    queryKey: keys.me(),
    queryFn: () => apiFetch<Linked<CurrentUser>>("/auth/me"),
    enabled: status === "authenticated",
  });
}

/** `PATCH /auth/me` - name, bio or password. */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (input: UpdateMeInput) =>
      apiFetch<Linked<CurrentUser>>("/auth/me", { method: "PATCH", body: input }),
    onSuccess: (me) => {
      queryClient.setQueryData(keys.me(), me);
      setUser(me);
    },
  });
}
