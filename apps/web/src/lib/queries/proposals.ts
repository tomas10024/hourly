import type {
  CreateProposalInput,
  Proposal,
  ProposalListQuery,
  UpdateProposalInput,
} from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

const proposalsPath = (projectId: string) => `/projects/${projectId}/proposals`;

/** `GET /proposals` - the specialist's own proposals. */
export function useMyProposals(filters: Filters<ProposalListQuery> = {}) {
  return useQuery({
    queryKey: keys.myProposals(filters),
    queryFn: () => apiFetch<Page<Proposal>>(`/proposals${toSearch(filters)}`),
  });
}

/** `GET /projects/{id}/proposals` - what the client received. */
export function useProjectProposals(
  projectId: string | undefined,
  filters: Filters<ProposalListQuery> = {},
) {
  return useQuery({
    queryKey: keys.projectProposals(projectId ?? "", filters),
    queryFn: () => apiFetch<Page<Proposal>>(`${proposalsPath(projectId!)}${toSearch(filters)}`),
    enabled: !!projectId,
  });
}

/** `GET /projects/{id}/proposals/{proposalId}` */
export function useProposal(projectId: string | undefined, proposalId: string | undefined) {
  return useQuery({
    queryKey: keys.proposal(projectId ?? "", proposalId ?? ""),
    queryFn: () => apiFetch<Linked<Proposal>>(`${proposalsPath(projectId!)}/${proposalId}`),
    enabled: !!projectId && !!proposalId,
  });
}

/** `POST /projects/{id}/proposals` */
export function useSubmitProposal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProposalInput) =>
      apiFetch<Linked<Proposal>>(proposalsPath(projectId), { method: "POST", body: input }),
    onSuccess: () => invalidate(queryClient, projectId, "proposals"),
  });
}

/**
 * `PATCH /projects/{id}/proposals/{proposalId}` - accept, reject or withdraw.
 * Accepting assigns the project, so the project lists change too.
 */
export function useUpdateProposal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, status }: { proposalId: string } & UpdateProposalInput) =>
      apiFetch<Linked<Proposal>>(`${proposalsPath(projectId)}/${proposalId}`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => invalidate(queryClient, projectId, "proposals", "projects"),
  });
}

/** `DELETE /projects/{id}/proposals/{proposalId}` */
export function useDeleteProposal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      apiFetch<void>(`${proposalsPath(projectId)}/${proposalId}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, projectId, "proposals"),
  });
}
