import type {
  CreateTaskInput,
  ProjectTaskListQuery,
  Task,
  TaskListQuery,
  UpdateTaskInput,
} from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

const tasksPath = (projectId: string) => `/projects/${projectId}/tasks`;
const taskPath = (projectId: string, taskId: string) => `${tasksPath(projectId)}/${taskId}`;

/** `GET /tasks` - my tasks across projects. */
export function useMyTasks(filters: Filters<TaskListQuery> = {}, enabled = true) {
  return useQuery({
    queryKey: keys.myTasks(filters),
    queryFn: () => apiFetch<Page<Task>>(`/tasks${toSearch(filters)}`),
    enabled,
  });
}

/** `GET /projects/{projectId}/tasks` */
export function useProjectTasks(projectId: string | undefined, filters: Filters<ProjectTaskListQuery> = {}) {
  return useQuery({
    queryKey: keys.projectTasks(projectId ?? "", filters),
    queryFn: () => apiFetch<Page<Task>>(`${tasksPath(projectId!)}${toSearch(filters)}`),
    enabled: !!projectId,
  });
}

/** `GET /projects/{projectId}/tasks/{taskId}` */
export function useTask(projectId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: keys.task(projectId ?? "", taskId ?? ""),
    queryFn: () => apiFetch<Linked<Task>>(taskPath(projectId!, taskId!)),
    enabled: !!projectId && !!taskId,
  });
}

/** `POST /projects/{projectId}/tasks` */
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiFetch<Linked<Task>>(tasksPath(projectId), { method: "POST", body: input }),
    onSuccess: () => invalidate(queryClient, projectId, "tasks"),
  });
}

/** `PATCH /projects/{projectId}/tasks/{taskId}` - edit, move, change status, approve. */
export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      apiFetch<Linked<Task>>(taskPath(projectId, taskId), { method: "PATCH", body: input }),
    onSuccess: (task) => {
      queryClient.setQueryData(keys.task(projectId, task.id), task);
      return invalidate(queryClient, projectId, "tasks");
    },
  });
}

/** `DELETE /projects/{projectId}/tasks/{taskId}` - its sessions go with it. */
export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiFetch<void>(taskPath(projectId, taskId), { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, projectId, "tasks", "sessions"),
  });
}
