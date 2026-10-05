"use client";

import type { WorkSession } from "@hourly/shared";
import { ExternalLink, Pencil, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { formatClock, formatDateTime, formatDuration, formatMoney, sessionAmount } from "@/lib/format";
import { useDeleteSession, useStopSession } from "@/lib/queries/sessions";
import type { Linked } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { SessionFormDialog } from "./session-form-dialog";

export const sessionPath = (s: WorkSession) => `/app/sessions/${s.projectId}/${s.taskId}/${s.id}`;

/** Elapsed time of a running session, ticking every second. */
export function RunningClock({ startedAt }: { startedAt: string }) {
  const now = useNow(1000);
  return (
    <Badge tone="hack" live>
      <span className="tabular">{formatClock(now - new Date(startedAt).getTime())}</span>
    </Badge>
  );
}

/**
 * Work sessions as a table (cards on a phone), each with the actions its
 * `_links` allow: stop a running one, edit, delete. `extraColumns` lets the
 * work log add task and project names.
 */
export function SessionList({
  sessions,
  extraColumns = [],
  empty,
}: {
  sessions: Linked<WorkSession>[];
  extraColumns?: Column<Linked<WorkSession>>[];
  empty?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const stop = useStopSession();
  const remove = useDeleteSession();
  const [editing, setEditing] = useState<Linked<WorkSession> | null>(null);
  const [deleting, setDeleting] = useState<Linked<WorkSession> | null>(null);

  const menu = (s: Linked<WorkSession>): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Atidaryti", icon: ExternalLink, onSelect: () => router.push(sessionPath(s)) }];
    if (s._links.stop) {
      items.push({
        label: "Sustabdyti",
        icon: Square,
        onSelect: () =>
          stop.mutate(s, {
            onSuccess: (done) => toast.success("> sesija_sustabdyta [200]", `Užregistruota ${formatDuration(done.durationMinutes)}.`),
            onError: toast.fromError,
          }),
      });
    }
    if (s._links.update) items.push({ label: "Redaguoti", icon: Pencil, onSelect: () => setEditing(s) });
    if (s._links.delete) items.push({ label: "Šalinti", icon: Trash2, danger: true, onSelect: () => setDeleting(s) });
    return items;
  };

  const columns: Column<Linked<WorkSession>>[] = [
    { key: "start", header: "Pradžia", cell: (s) => <span className="tabular whitespace-nowrap">{formatDateTime(s.startedAt)}</span>, mobile: "title" },
    ...extraColumns,
    {
      key: "duration",
      header: "Trukmė",
      numeric: true,
      cell: (s) => (s.endedAt === null ? <RunningClock startedAt={s.startedAt} /> : formatDuration(s.durationMinutes)),
    },
    { key: "amount", header: "Suma", numeric: true, cell: (s) => formatMoney(sessionAmount(s)) },
    { key: "menu", header: <span className="sr-only">Veiksmai</span>, className: "w-12", mobile: "aside", cell: (s) => <DropdownMenu items={menu(s)} /> },
  ];

  return (
    <>
      <DataTable caption="Darbo sesijos" columns={columns} rows={sessions} rowKey={(s) => s.id} onRowClick={(s) => router.push(sessionPath(s))} empty={empty} />

      {editing && <SessionFormDialog key={editing.id} mode="edit" session={editing} open onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Šalinti sesiją?"
        confirmLabel="Šalinti"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { projectId: deleting.projectId, taskId: deleting.taskId, sessionId: deleting.id },
            {
              onSuccess: () => {
                toast.success("> sesija_pasalinta [204]", "Sesija pašalinta iš žurnalo.");
                setDeleting(null);
              },
              onError: (error) => {
                toast.fromError(error);
                setDeleting(null);
              },
            },
          )
        }
      >
        {deleting && `${formatDateTime(deleting.startedAt)} sesija (${formatDuration(deleting.durationMinutes)}) bus pašalinta negrįžtamai.`}
      </ConfirmDialog>
    </>
  );
}
