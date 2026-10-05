"use client";

import { TaskStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { formatHours } from "@/lib/format";
import { useProjectTasks } from "@/lib/queries/tasks";

/** A read-only task list (public project page): title, estimate, status. */
export function ProjectTasksList({ projectId }: { projectId: string }) {
  const { data, isPending, isError } = useProjectTasks(projectId, { perPage: 100 });

  if (isPending) {
    return (
      <div className="grid gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) return <p className="text-sm text-muted">Užduočių įkelti nepavyko.</p>;
  if (data.items.length === 0) {
    return <p className="text-sm text-muted">Užduočių sąrašas dar nesudarytas.</p>;
  }

  return (
    <ol className="grid gap-2">
      {data.items.map((task, index) => (
        <li key={task.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="w-6 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
          <span className="min-w-0 flex-1 text-sm">{task.title}</span>
          {task.estimatedHours != null && <span className="hidden font-mono text-xs text-muted md:inline">{formatHours(task.estimatedHours)}</span>}
          <TaskStatusBadge status={task.status} />
        </li>
      ))}
    </ol>
  );
}
