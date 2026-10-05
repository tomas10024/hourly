"use client";

import { ArrowLeft, Pencil, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { SessionFormDialog } from "@/components/domain/session-form-dialog";
import { RunningClock } from "@/components/domain/session-list";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatDuration, formatMoney, sessionAmount } from "@/lib/format";
import { useProject } from "@/lib/queries/projects";
import { useDeleteSession, useSession, useStopSession } from "@/lib/queries/sessions";
import { useTask } from "@/lib/queries/tasks";

/** One work session at its canonical three-level address (`/projects/{p}/tasks/{t}/sessions/{s}`). */
export default function SessionPage() {
  const { projectId, taskId, sessionId } = useParams<{ projectId: string; taskId: string; sessionId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: session, error, isPending, refetch } = useSession(projectId, taskId, sessionId);
  const task = useTask(projectId, taskId);
  const project = useProject(projectId);
  const stop = useStopSession();
  const remove = useDeleteSession();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = (
    <Link href="/app/sessions" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
      <ArrowLeft aria-hidden className="size-4" /> Darbo žurnalas
    </Link>
  );

  if (error) {
    return (
      <div className="grid gap-6">
        {back}
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      </div>
    );
  }
  if (isPending) return <LoadingState rows={6} />;

  const running = session.endedAt === null;

  return (
    <div className="grid gap-7">
      {back}
      <PageHeader
        label="darbo sesija"
        title={task.data?.title ?? "Darbo sesija"}
        description={
          <Link href={`/app/projects/${projectId}?task=${taskId}`} className="hover:text-data">
            {project.data?.title ?? "…"}
          </Link>
        }
        actions={
          <>
            {session._links.stop && (
              <Button
                variant="hack"
                icon={Square}
                loading={stop.isPending}
                onClick={() =>
                  stop.mutate(session, {
                    onSuccess: (done) => toast.success("> sesija_sustabdyta [200]", `Užregistruota ${formatDuration(done.durationMinutes)}.`),
                    onError: toast.fromError,
                  })
                }
              >
                Sustabdyti
              </Button>
            )}
            {session._links.update && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                Redaguoti
              </Button>
            )}
            {session._links.delete && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
                Šalinti
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <Card className={running ? "hud hud-on [--hud-color:var(--color-hack)]" : undefined}>
          <KeyValues
            rows={[
              ["Pradžia", formatDateTime(session.startedAt)],
              ["Pabaiga", running ? "vykdoma" : formatDateTime(session.endedAt)],
              ["Trukmė", running ? <RunningClock key="clock" startedAt={session.startedAt} /> : formatDuration(session.durationMinutes)],
              ["Įkainis", session.appliedRate != null ? `${formatMoney(session.appliedRate)}/val.` : "—"],
              ["Suma", formatMoney(sessionAmount(session))],
            ]}
          />
        </Card>
        <Card className="grid gap-2">
          <span className="label">{"// komentaras"}</span>
          <p className="text-sm leading-relaxed whitespace-pre-line">{session.comment ?? "Komentaro nėra."}</p>
        </Card>
      </div>

      {editing && <SessionFormDialog key={session.endedAt ?? "running"} mode="edit" session={session} open onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Šalinti sesiją?"
        confirmLabel="Šalinti"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { projectId, taskId, sessionId },
            {
              onSuccess: () => {
                toast.success("> sesija_pasalinta [204]", "Sesija pašalinta iš žurnalo.");
                router.replace("/app/sessions");
              },
              onError: (e) => {
                toast.fromError(e);
                setDeleting(false);
              },
            },
          )
        }
      >
        Sesija bus pašalinta negrįžtamai.
      </ConfirmDialog>
    </div>
  );
}
