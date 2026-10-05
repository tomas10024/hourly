import type { QueryClient } from "@tanstack/react-query";

/**
 * Query keys. Everything that belongs to one project sits under
 * `["project", id]`, so a single invalidation refreshes the project, its tasks,
 * sessions, proposals, share links and report together. The "my ..." lists
 * that cut across projects have their own roots.
 */
export const keys = {
  root: () => ["root"] as const,
  health: (kind: "live" | "ready") => ["health", kind] as const,
  me: () => ["me"] as const,

  projects: (filters?: object) => ["projects", filters ?? {}] as const,
  project: (projectId: string) => ["project", projectId] as const,
  report: (projectId: string) => ["project", projectId, "report"] as const,

  projectTasks: (projectId: string, filters?: object) =>
    ["project", projectId, "tasks", filters ?? {}] as const,
  task: (projectId: string, taskId: string) => ["project", projectId, "task", taskId] as const,
  myTasks: (filters?: object) => ["tasks", filters ?? {}] as const,

  taskSessions: (projectId: string, taskId: string, filters?: object) =>
    ["project", projectId, "task", taskId, "sessions", filters ?? {}] as const,
  session: (projectId: string, taskId: string, sessionId: string) =>
    ["project", projectId, "task", taskId, "session", sessionId] as const,
  mySessions: (filters?: object) => ["sessions", filters ?? {}] as const,

  projectProposals: (projectId: string, filters?: object) =>
    ["project", projectId, "proposals", filters ?? {}] as const,
  proposal: (projectId: string, proposalId: string) =>
    ["project", projectId, "proposal", proposalId] as const,
  myProposals: (filters?: object) => ["proposals", filters ?? {}] as const,

  shares: (projectId: string, filters?: object) =>
    ["project", projectId, "shares", filters ?? {}] as const,
  publicProject: (token: string) => ["public", token] as const,

  users: (filters?: object) => ["users", filters ?? {}] as const,
  user: (userId: string) => ["user", userId] as const,
};

/** Root keys of the cross-project lists. */
type ListRoot = "projects" | "tasks" | "sessions" | "proposals" | "users";

/** Refreshes everything about one project and the given cross-project lists. */
export function invalidate(
  queryClient: QueryClient,
  projectId: string | null,
  ...lists: ListRoot[]
) {
  const jobs = lists.map((root) => queryClient.invalidateQueries({ queryKey: [root] }));
  if (projectId) jobs.push(queryClient.invalidateQueries({ queryKey: keys.project(projectId) }));
  return Promise.all(jobs);
}
