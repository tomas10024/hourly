import type { AdminUpdateUserInput, CurrentUser, PublicUser, UserListQuery } from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

/** `GET /users` - the administrator's list (with e-mails and block state). */
export function useUsers(filters: Filters<UserListQuery> = {}) {
  return useQuery({
    queryKey: keys.users(filters),
    queryFn: () => apiFetch<Page<CurrentUser>>(`/users${toSearch(filters)}`),
  });
}

/** `GET /users/{id}` - someone's public profile. */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: keys.user(userId ?? ""),
    queryFn: () => apiFetch<Linked<PublicUser>>(`/users/${userId}`),
    enabled: !!userId,
  });
}

/** `PATCH /users/{id}` - block or unblock (administrator). */
export function useSetUserBlocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string } & AdminUpdateUserInput) =>
      apiFetch<Linked<CurrentUser>>(`/users/${userId}`, { method: "PATCH", body: { isBlocked } }),
    onSuccess: (_, { userId }) => {
      queryClient.removeQueries({ queryKey: keys.user(userId) });
      return invalidate(queryClient, null, "users");
    },
  });
}

/** `DELETE /users/{id}` - only accounts without work history (409 otherwise). */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiFetch<void>(`/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, null, "users"),
  });
}
