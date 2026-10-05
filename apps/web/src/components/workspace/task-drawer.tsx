"use client";

import type { Project, Task } from "@hourly/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SessionFormDialog } from "@/components/domain/session-form-dialog";
import { SessionList } from "@/components/domain/session-list";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge, TaskStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValues } from "@/components/ui/card";
import { Drawer } from "@/components/ui/dialog";
import { formatDate, formatDuration, formatHours, formatMoney, sessionAmount } from "@/lib/format";
import { useTaskSessions } from "@/lib/queries/sessions";
import { useTask } from "@/lib/queries/tasks";
import type { Linked } from "@/lib/types";
import { useTaskActions } from "./task-actions";

/**
 * A task in a side panel: its details (`GET …/tasks/{taskId}`) and its work
 * sessions (`GET …/tasks/{taskId}/sessions` - the three-level address).
 */
export function TaskDrawer({
  project,
  taskId,
  onClose,
  onEdit,
  onRemove,
}: {
  project: Project;
  taskId: string | null;
  onClose: () => void;
  onEdit: (task: Linked<Task>) => void;
  onRemove: (task: Linked<Task>) => void;
}) {
  const { data: task, error, isPending, refetch } = useTask(project.id, taskId ?? undefined);
  const sessions = useTaskSessions(project.id, task?._links.sessions ? task.id : undefined, { perPage: 50 });
  const actions = useTaskActions(project.id, { edit: onEdit, remove: onRemove });
  const [adding, setAdding] = useState(false);

  const items = sessions.data?.items ?? [];
  const minutes = items.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const amount = items.reduce((sum, s) => sum + (sessionAmount(s) ?? 0), 0);
  const rate = task?.hourlyRate ?? project.hourlyRate;

  return (
    <Drawer open={taskId !== null} onClose={onClose} side="right" title={task?.title ?? "Užduotis"}>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending || !task ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            {project.origin === "MARKETPLACE" && project.taskAuthoring === "SPECIALIST" && task.approvedAt === null && (
              <Badge tone="warn">Laukia patvirtinimo</Badge>
            )}
          </div>

          <KeyValues
            rows={[
              ["Įvertis", formatHours(task.estimatedHours)],
              ["Užregistruota", sessions.data ? formatDuration(minutes) : "…"],
              ["Įkainis", rate != null ? `${formatMoney(rate)}/val.${task.hourlyRate == null ? " (projekto)" : ""}` : "—"],
              ["Suma", sessions.data ? formatMoney(amount) : "…"],
              ["Sukurta", formatDate(task.createdAt)],
            ]}
          />
          {task.description && <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{task.description}</p>}

          <div className="flex flex-wrap gap-2">
            {actions(task).map(({ label, icon, onSelect, danger }) => (
              <Button key={label} size="sm" variant={danger ? "danger" : "secondary"} icon={icon} onClick={onSelect}>
                {label}
              </Button>
            ))}
          </div>

          {task._links.sessions && (
            <section className="grid gap-3 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Darbo sesijos</h3>
                {task._links["start-session"] && (
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
                    Įvesti rankiniu būdu
                  </Button>
                )}
              </div>
              {sessions.isPending ? (
                <LoadingState rows={2} />
              ) : (
                <SessionList sessions={items} empty={<p className="text-sm text-muted">Sesijų dar nėra.</p>} />
              )}
            </section>
          )}

          {task._links["start-session"] && (
            <SessionFormDialog mode="create" task={task} rate={rate} open={adding} onClose={() => setAdding(false)} />
          )}
        </div>
      )}
    </Drawer>
  );
}
