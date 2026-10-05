import type {
  CreateShareLinkInput,
  PublicProjectView,
  ShareLink,
  ShareLinkCreated,
  ShareListQuery,
} from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

const sharesPath = (projectId: string) => `/projects/${projectId}/shares`;

/** `GET /projects/{id}/shares` */
export function useShares(projectId: string | undefined, filters: Filters<ShareListQuery> = {}) {
  return useQuery({
    queryKey: keys.shares(projectId ?? "", filters),
    queryFn: () => apiFetch<Page<ShareLink>>(`${sharesPath(projectId!)}${toSearch(filters)}`),
    enabled: !!projectId,
  });
}

/**
 * `POST /projects/{id}/shares`. The answer is the only time the token is
 * visible - the API keeps just its hash - so the caller shows it right away.
 */
export function useCreateShare(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateShareLinkInput> = {}) =>
      apiFetch<Linked<ShareLinkCreated>>(sharesPath(projectId), { method: "POST", body: input }),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}

/** `DELETE /projects/{id}/shares/{shareId}` - revoke. */
export function useRevokeShare(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) =>
      apiFetch<void>(`${sharesPath(projectId)}/${shareId}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}

/**
 * `GET /public/projects/{token}` - the read-only view behind a share link.
 * Polled so the client watching it sees the hours grow (README 1.1).
 */
export function usePublicProject(token: string | undefined) {
  return useQuery({
    queryKey: keys.publicProject(token ?? ""),
    queryFn: () => apiFetch<PublicProjectView>(`/public/projects/${encodeURIComponent(token!)}`),
    enabled: !!token,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}
