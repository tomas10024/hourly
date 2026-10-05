"use client";

import type { Project, Task, TaskStatus } from "@hourly/shared";
import { ListPlus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge, statusLabel, TaskStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDuration, formatHours, formatMoney } from "@/lib/format";
import { useProjectReport } from "@/lib/queries/projects";
import { useDeleteTask, useProjectTasks } from "@/lib/queries/tasks";
import type { Linked } from "@/lib/types";
import { useUrlFilters } from "@/lib/use-url-filters";
import { useTaskActions } from "./task-actions";
import { TaskDrawer } from "./task-drawer";
import { TaskFormDialog } from "./task-form-dialog";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

/** The project's tasks: search, status filter, the actions of each task, and its side panel. */
export function TasksTab({ project }: { project: Linked<Project> }) {
  const { values, set } = useUrlFilters(["q", "status", "task", "tab"] as const);
  const [q, setQ] = useState(values.q);
  useEffect(() => {
    if (q === values.q) return;
    const timer = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(timer);
  }, [q, values.q, set]);

  const status = STATUSES.includes(values.status as TaskStatus) ? (values.status as TaskStatus) : undefined;
  const { data, error, isPending, refetch } = useProjectTasks(project.id, { q: values.q || undefined, status, perPage: 100 });
  const report = useProjectReport(project._links.report ? project.id : undefined);
  const minutesByTask = new Map(report.data?.lines.map((line) => [line.taskId, line.totalMinutes]));

  const toast = useToast();
  const remove = useDeleteTask(project.id);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Linked<Task> | null>(null);
  const [deleting, setDeleting] = useState<Linked<Task> | null>(null);
  const actions = useTaskActions(project.id, { edit: setEditing, remove: setDeleting });

  const openTask = (task: Task | null) => set({ task: task?.id ?? null });
  const canCreate = !!project._links["create-task"];
  // Only a marketplace client approves tasks; directly agreed work has nobody to ask.
  const needsApproval = (task: Task) =>
    project.origin === "MARKETPLACE" && project.taskAuthoring === "SPECIALIST" && task.approvedAt === null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end">
        <Field label="Paieška">
          {(p) => (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Užduoties pavadinimas" className="pl-9" />
            </div>
          )}
        </Field>
        <Field label="Būsena">
          {(p) => (
            <Select {...p} value={status ?? ""} onChange={(e) => set({ status: e.target.value || null })}>
              <option value="">Visos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel.task(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {canCreate && (
          <Button variant="hack" icon={ListPlus} glitch onClick={() => setCreating(true)}>
            Nauja užduotis
          </Button>
        )}
      </div>

      <Card className="p-3 md:p-4">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <LoadingState />
        ) : (
          <DataTable
            caption="Projekto užduotys"
            rows={data.items}
            rowKey={(t) => t.id}
            onRowClick={openTask}
            empty={
              <EmptyState art="folder" title={values.q || status ? "Nieko nerasta" : "Užduočių dar nėra"}>
                {values.q || status
                  ? "Pakeiskite paiešką arba būsenos filtrą."
                  : canCreate
                    ? "Suskaidykite darbą į užduotis – prie jų bus registruojamas laikas."
                    : "Užduotis sudarys kita projekto šalis."}
              </EmptyState>
            }
            columns={[
              { key: "n", header: "#", className: "w-10 text-muted", mobile: "hidden", cell: (t) => <span className="tabular">{t.position + 1}</span> },
              {
                key: "title",
                header: "Užduotis",
                mobile: "title",
                cell: (t) => (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {t.title}
                    {needsApproval(t) && <Badge tone="warn">Laukia patvirtinimo</Badge>}
                  </span>
                ),
              },
              { key: "status", header: "Būsena", cell: (t) => <TaskStatusBadge status={t.status} /> },
              { key: "estimate", header: "Įvertis", numeric: true, cell: (t) => formatHours(t.estimatedHours) },
              ...(project._links.report
                ? [{ key: "logged", header: "Užregistruota", numeric: true, cell: (t: Task) => formatDuration(minutesByTask.get(t.id) ?? 0) }]
                : []),
              {
                key: "rate",
                header: "Įkainis",
                numeric: true,
                mobile: "hidden" as const,
                cell: (t) => {
                  const rate = t.hourlyRate ?? project.hourlyRate;
                  return rate != null ? <span className={t.hourlyRate == null ? "text-muted" : ""}>{formatMoney(rate)}</span> : "—";
                },
              },
              { key: "menu", header: <span className="sr-only">Veiksmai</span>, className: "w-12", mobile: "aside", cell: (t) => <DropdownMenu items={actions(t)} /> },
            ]}
          />
        )}
      </Card>

      <TaskDrawer project={project} taskId={values.task || null} onClose={() => openTask(null)} onEdit={setEditing} onRemove={setDeleting} />

      {canCreate && <TaskFormDialog project={project} open={creating} onClose={() => setCreating(false)} />}
      {editing && <TaskFormDialog key={editing.id} project={project} task={editing} open onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Šalinti užduotį?"
        confirmLabel="Šalinti"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("> uzduotis_pasalinta [204]", `„${deleting.title}“ ir jos sesijos pašalintos.`);
              if (values.task === deleting.id) openTask(null);
              setDeleting(null);
            },
            onError: (error) => {
              toast.fromError(error);
              setDeleting(null);
            },
          })
        }
      >
        {deleting && `„${deleting.title}“ ir visos jos darbo sesijos bus pašalintos negrįžtamai.`}
      </ConfirmDialog>
    </div>
  );
}
