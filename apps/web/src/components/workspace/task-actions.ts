"use client";

import type { Task } from "@hourly/shared";
import { Check, CircleCheck, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import type { MenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useCreateSession } from "@/lib/queries/sessions";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { Linked } from "@/lib/types";

/**
 * What can be done with a task, as menu items - exactly the actions its
 * `_links` offer: approve (client, specialist-authored task), start the timer
 * (assigned specialist), edit / mark done / delete (whoever manages it).
 */
export function useTaskActions(
  projectId: string,
  handlers: { edit: (task: Linked<Task>) => void; remove: (task: Linked<Task>) => void },
) {
  const toast = useToast();
  const update = useUpdateTask(projectId);
  const start = useCreateSession();

  return (task: Linked<Task>): MenuItem[] => {
    const links = task._links;
    const items: MenuItem[] = [];

    if (links["start-session"]) {
      items.push({
        label: "Pradėti laikmatį",
        icon: Play,
        onSelect: () =>
          start.mutate(
            { projectId, taskId: task.id, input: { startedAt: new Date().toISOString() } },
            {
              onSuccess: () => toast.success("> sesija_pradeta [201]", `Laikmatis paleistas: „${task.title}“.`),
              onError: toast.fromError,
            },
          ),
      });
    }
    if (links.approve) {
      items.push({
        label: "Patvirtinti",
        icon: Check,
        onSelect: () =>
          update.mutate(
            { taskId: task.id, input: { approved: true } },
            { onSuccess: () => toast.success("> uzduotis_patvirtinta [200]", `„${task.title}“ patvirtinta.`), onError: toast.fromError },
          ),
      });
    }
    if (links.update) {
      const done = task.status === "DONE";
      items.push({
        label: done ? "Grąžinti į vykdomas" : "Pažymėti atlikta",
        icon: done ? RotateCcw : CircleCheck,
        onSelect: () =>
          update.mutate(
            { taskId: task.id, input: { status: done ? "IN_PROGRESS" : "DONE" } },
            {
              onSuccess: () => toast.success("> busena_pakeista [200]", `„${task.title}“ – ${done ? "vykdoma" : "atlikta"}.`),
              onError: toast.fromError,
            },
          ),
      });
      items.push({ label: "Redaguoti", icon: Pencil, onSelect: () => handlers.edit(task) });
    }
    if (links.delete) items.push({ label: "Šalinti", icon: Trash2, danger: true, onSelect: () => handlers.remove(task) });
    return items;
  };
}
