import type {
  CreateWorkSessionInput,
  SessionListQuery,
  TaskSessionListQuery,
  UpdateWorkSessionInput,
  WorkSession,
} from "@hourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, follow } from "../api";
import { useAuth } from "../auth";
import { toSearch, type Filters, type Linked, type Page } from "../types";
import { invalidate, keys } from "./keys";

const sessionsPath = (projectId: string, taskId: string) =>
  `/projects/${projectId}/tasks/${taskId}/sessions`;
const sessionPath = (projectId: string, taskId: string, sessionId: string) =>
  `${sessionsPath(projectId, taskId)}/${sessionId}`;

/** `GET /sessions` - my work log across projects. */
export function useMySessions(filters: Filters<SessionListQuery> = {}, enabled = true) {
  return useQuery({
    queryKey: keys.mySessions(filters),
    queryFn: () => apiFetch<Page<WorkSession>>(`/sessions${toSearch(filters)}`),
    enabled,
  });
}

/**
 * The session being timed right now, or null. Only specialists record time,
 * so nobody else asks. Polled every minute so a session started or stopped in
 * another tab shows up without a reload.
 */
export function useRunningSession() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: RUNNING_KEY,
    queryFn: () => apiFetch<Page<WorkSession>>("/sessions?running=true&perPage=1"),
    enabled: user?.role === "SPECIALIST",
    refetchInterval: 60_000,
  });
  return { ...query, session: query.data?.items[0] ?? null };
}

/** `GET /projects/{p}/tasks/{t}/sessions` */
export function useTaskSessions(
  projectId: string | undefined,
  taskId: string | undefined,
  filters: Filters<TaskSessionListQuery> = {},
) {
  return useQuery({
    queryKey: keys.taskSessions(projectId ?? "", taskId ?? "", filters),
    queryFn: () =>
      apiFetch<Page<WorkSession>>(`${sessionsPath(projectId!, taskId!)}${toSearch(filters)}`),
    enabled: !!projectId && !!taskId,
  });
}

/** `GET /projects/{p}/tasks/{t}/sessions/{s}` */
export function useSession(projectId?: string, taskId?: string, sessionId?: string) {
  return useQuery({
    queryKey: keys.session(projectId ?? "", taskId ?? "", sessionId ?? ""),
    queryFn: () => apiFetch<Linked<WorkSession>>(sessionPath(projectId!, taskId!, sessionId!)),
    enabled: !!projectId && !!taskId && !!sessionId,
  });
}

type SessionTarget = { projectId: string; taskId: string };

/** `POST /projects/{p}/tasks/{t}/sessions` - start the timer (no `endedAt`) or enter one by hand. */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, input }: SessionTarget & { input: CreateWorkSessionInput }) =>
      apiFetch<Linked<WorkSession>>(sessionsPath(projectId, taskId), { method: "POST", body: input }),
    onSuccess: (session) => invalidate(queryClient, session.projectId, "sessions", "tasks"),
  });
}

/** `PATCH /projects/{p}/tasks/{t}/sessions/{s}` */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      taskId,
      sessionId,
      input,
    }: SessionTarget & { sessionId: string; input: UpdateWorkSessionInput }) =>
      apiFetch<Linked<WorkSession>>(sessionPath(projectId, taskId, sessionId), {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (session) => invalidate(queryClient, session.projectId, "sessions", "tasks"),
  });
}

const RUNNING_KEY = keys.mySessions({ running: true, perPage: 1 });

/**
 * Stops the running timer through the session's own `stop` link.
 *
 * Optimistic: the timer disappears from the top bar and the timer card at
 * once; if the API refuses, the running session is put back.
 */
export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: Linked<WorkSession>) => {
      const stop = session._links.stop;
      if (!stop) throw new Error("This session cannot be stopped");
      return follow<Linked<WorkSession>>(stop, { endedAt: new Date().toISOString() });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: RUNNING_KEY });
      const running = queryClient.getQueryData<Page<WorkSession>>(RUNNING_KEY);
      if (running) queryClient.setQueryData(RUNNING_KEY, { ...running, items: [], total: 0 });
      return { running };
    },
    onError: (_error, _session, snapshot) => {
      if (snapshot?.running) queryClient.setQueryData(RUNNING_KEY, snapshot.running);
    },
    onSettled: (_data, _error, session) => invalidate(queryClient, session.projectId, "sessions", "tasks"),
  });
}

/** `DELETE /projects/{p}/tasks/{t}/sessions/{s}` */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, sessionId }: SessionTarget & { sessionId: string }) =>
      apiFetch<void>(sessionPath(projectId, taskId, sessionId), { method: "DELETE" }),
    onSuccess: (_, { projectId }) => invalidate(queryClient, projectId, "sessions", "tasks"),
  });
}
