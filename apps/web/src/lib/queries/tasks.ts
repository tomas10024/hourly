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

/**
 * `PATCH /projects/{projectId}/tasks/{taskId}` - edit, move, change status, approve.
 *
 * Status and approval changes are optimistic: the lists and the task show the
 * new state at once, before the API has answered. If the API refuses, the
 * snapshot taken here is put back, so the screen never shows a state that
 * did not happen; either way the data is fetched again afterwards.
 */
export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      apiFetch<Linked<Task>>(taskPath(projectId, taskId), { method: "PATCH", body: input }),
    onMutate: async ({ taskId, input }) => {
      if (input.status === undefined && input.approved === undefined) return;
      await queryClient.cancelQueries({ queryKey: keys.project(projectId) });

      const patch = (task: Linked<Task>): Linked<Task> =>
        task.id !== taskId
          ? task
          : {
              ...task,
              ...(input.status ? { status: input.status } : {}),
              ...(input.approved !== undefined ? { approvedAt: input.approved ? new Date().toISOString() : null } : {}),
            };

      const lists = queryClient.getQueriesData<Page<Task>>({ queryKey: [...keys.project(projectId), "tasks"] });
      const single = queryClient.getQueryData<Linked<Task>>(keys.task(projectId, taskId));
      for (const [key, page] of lists) {
        if (page) queryClient.setQueryData(key, { ...page, items: page.items.map(patch) });
      }
      if (single) queryClient.setQueryData(keys.task(projectId, taskId), patch(single));
      return { lists, single };
    },
    onError: (_error, { taskId }, snapshot) => {
      for (const [key, page] of snapshot?.lists ?? []) queryClient.setQueryData(key, page);
      if (snapshot?.single) queryClient.setQueryData(keys.task(projectId, taskId), snapshot.single);
    },
    onSuccess: (task) => {
      queryClient.setQueryData(keys.task(projectId, task.id), task);
    },
    onSettled: () => invalidate(queryClient, projectId, "tasks"),
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
