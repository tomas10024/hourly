import type {
  CreateProjectInput,
  Project,
  ProjectListQuery,
  ProjectReport,
  UpdateProjectInput,
} from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDownload, apiFetch, saveFile } from "../api";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

export type ProjectFilters = Filters<ProjectListQuery>;

/** `GET /projects` - marketplace, owned, assigned or (admin) all. */
export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: keys.projects(filters),
    queryFn: () => apiFetch<Page<Project>>(`/projects${toSearch(filters)}`),
  });
}

/** `GET /projects/{id}` */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.project(projectId ?? ""),
    queryFn: () => apiFetch<Linked<Project>>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

/** `POST /projects` */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiFetch<Linked<Project>>("/projects", { method: "POST", body: input }),
    onSuccess: (project) => {
      queryClient.setQueryData(keys.project(project.id), project);
      return invalidate(queryClient, null, "projects");
    },
  });
}

/** `PATCH /projects/{id}` - edit, publish, complete, cancel. */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      apiFetch<Linked<Project>>(`/projects/${projectId}`, { method: "PATCH", body: input }),
    onSuccess: (project) => {
      queryClient.setQueryData(keys.project(projectId), project);
      return invalidate(queryClient, projectId, "projects");
    },
  });
}

/** `DELETE /projects/{id}` */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<void>(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: (_, projectId) => {
      queryClient.removeQueries({ queryKey: keys.project(projectId) });
      return invalidate(queryClient, null, "projects", "tasks", "sessions", "proposals");
    },
  });
}

/** `GET /projects/{id}/report` as JSON. */
export function useProjectReport(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.report(projectId ?? ""),
    queryFn: () => apiFetch<Linked<ProjectReport>>(`/projects/${projectId}/report`),
    enabled: !!projectId,
  });
}

/** The same report as CSV (`Accept: text/csv`), saved as a file. */
export async function downloadProjectReport(projectId: string) {
  const { blob, filename } = await apiDownload(`/projects/${projectId}/report`, "text/csv");
  saveFile(blob, filename);
}
