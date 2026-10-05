"use client";

import type { WorkSession } from "@hourly/shared";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { SessionFormDialog } from "@/components/domain/session-form-dialog";
import { SessionList } from "@/components/domain/session-list";
import { TimerCard } from "@/components/domain/timer-card";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { formatDuration, formatMoney, sessionAmount } from "@/lib/format";
import { useProjects } from "@/lib/queries/projects";
import { useMySessions } from "@/lib/queries/sessions";
import { useMyTasks } from "@/lib/queries/tasks";
import type { Linked } from "@/lib/types";
import { useUrlFilters } from "@/lib/use-url-filters";

export default function WorkLogPage() {
  return (
    <Suspense>
      <WorkLog />
    </Suspense>
  );
}

/** `YYYY-MM-DD` of the day after, so a "to" date includes that whole day (the API's range is half-open). */
function dayAfter(date: string) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/**
 * The specialist's work log across projects (`GET /sessions`): filters by
 * period, project and "running only", kept in the address. Task and project
 * names come from two list requests, not one request per row.
 */
function WorkLog() {
  const { values, set, page } = useUrlFilters(["from", "to", "project", "running"] as const);
  const [adding, setAdding] = useState(false);

  const sessions = useMySessions({
    from: values.from ? new Date(`${values.from}T00:00:00`).toISOString() : undefined,
    to: values.to ? dayAfter(values.to) : undefined,
    projectId: values.project || undefined,
    running: values.running === "true" ? true : undefined,
    page,
    perPage: 20,
  });
  const tasks = useMyTasks({ perPage: 100 });
  const projects = useProjects({ scope: "assigned", perPage: 100 });

  const taskTitle = new Map(tasks.data?.items.map((t) => [t.id, t.title]));
  const projectTitle = new Map(projects.data?.items.map((p) => [p.id, p.title]));
  const startable = (tasks.data?.items ?? []).filter((t) => t._links["start-session"]);

  const items = sessions.data?.items ?? [];
  const pageMinutes = items.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const pageAmount = items.reduce((sum, s) => sum + (sessionAmount(s) ?? 0), 0);
  const filtered = Boolean(values.from || values.to || values.project || values.running);

  return (
    <div className="grid gap-8">
      <PageHeader
        label="darbo žurnalas"
        title="Darbo žurnalas"
        description="Visos jūsų darbo sesijos. Laikmatis skaičiuoja naršyklėje, o sustabdžius sesija išsaugoma su trukme ir suma."
        actions={
          <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)} disabled={startable.length === 0}>
            Įvesti rankiniu būdu
          </Button>
        }
      />

      <TimerCard showLogLink={false} />

      <div className="grid gap-3 md:grid-cols-[170px_170px_minmax(0,1fr)_auto] md:items-end">
        <Field label="Nuo">{(p) => <Input {...p} type="date" value={values.from} max={values.to || undefined} onChange={(e) => set({ from: e.target.value })} />}</Field>
        <Field label="Iki">{(p) => <Input {...p} type="date" value={values.to} min={values.from || undefined} onChange={(e) => set({ to: e.target.value })} />}</Field>
        <Field label="Projektas">
          {(p) => (
            <Select {...p} value={values.project} onChange={(e) => set({ project: e.target.value })}>
              <option value="">Visi</option>
              {projects.data?.items.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Switch label="Tik vykdomos" checked={values.running === "true"} onChange={(e) => set({ running: e.target.checked })} className="pb-2.5" />
      </div>

      <Card className="p-3 md:p-4">
        {sessions.error ? (
          <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
        ) : sessions.isPending ? (
          <LoadingState />
        ) : (
          <SessionList
            sessions={items}
            extraColumns={[
              {
                key: "task",
                header: "Užduotis",
                cell: (s: Linked<WorkSession>) => (
                  <Link href={`/app/projects/${s.projectId}?task=${s.taskId}`} onClick={(e) => e.stopPropagation()} className="hover:text-data">
                    {taskTitle.get(s.taskId) ?? "…"}
                  </Link>
                ),
              },
              { key: "project", header: "Projektas", mobile: "hidden", cell: (s: Linked<WorkSession>) => <span className="text-muted">{projectTitle.get(s.projectId) ?? "…"}</span> },
            ]}
            empty={
              <EmptyState art="clock" title={filtered ? "Pagal filtrus sesijų nėra" : "Dar nėra darbo sesijų"}>
                {filtered ? "Pakeiskite laikotarpį ar projektą." : "Pradėkite laikmatį arba įveskite sesiją rankiniu būdu."}
              </EmptyState>
            }
          />
        )}
      </Card>

      {sessions.data && sessions.data.items.length > 0 && (
        <p className="text-right font-mono text-xs text-muted">
          &gt; šiame puslapyje {formatDuration(pageMinutes)} · {formatMoney(pageAmount)} · iš viso {sessions.data.total} sesijų
        </p>
      )}
      {sessions.data && <Pagination page={sessions.data.page} totalPages={sessions.data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}

      {startable.length > 0 && <SessionFormDialog mode="create" tasks={startable} open={adding} onClose={() => setAdding(false)} />}
    </div>
  );
}
