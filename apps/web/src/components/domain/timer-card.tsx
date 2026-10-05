"use client";

import { ExternalLink, Play, Square } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/lib/cx";
import { errorMessage } from "@/lib/errors";
import { formatClock, formatDuration, formatMoney } from "@/lib/format";
import { toText } from "@/lib/form";
import { useProject, useProjects } from "@/lib/queries/projects";
import { useCreateSession, useRunningSession, useStopSession } from "@/lib/queries/sessions";
import { useMyTasks, useTask } from "@/lib/queries/tasks";
import { useNow } from "@/lib/use-now";

/**
 * The timer as a ctOS HUD: the session being timed (`GET /sessions?running=true`)
 * counting in the browser, with its task, rate and the amount so far, and a
 * stop button that follows the session's own `stop` link. With nothing
 * running, it offers to start one on any task that allows it.
 */
export function TimerCard({ className, showLogLink = true }: { className?: string; showLogLink?: boolean }) {
  const { session, isPending } = useRunningSession();
  const now = useNow(1000, session !== null);
  const task = useTask(session?.projectId, session?.taskId);
  const project = useProject(session?.projectId);
  const stop = useStopSession();
  const toast = useToast();
  const [starting, setStarting] = useState(false);

  const elapsedMs = session ? now - new Date(session.startedAt).getTime() : 0;
  const rate = session?.appliedRate ?? task.data?.hourlyRate ?? project.data?.hourlyRate ?? null;

  return (
    <section
      aria-label="Laikmatis"
      className={cx(
        "hud hud-on grid gap-5 border border-border bg-surface p-6 [--hud-color:var(--color-hack)] md:p-7",
        !session && "[--hud-color:var(--color-border-strong)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cx("inline-flex items-center gap-2 font-pixel text-xs tracking-[0.1em] uppercase", session ? "text-hack" : "text-muted")}>
          <span aria-hidden className={cx("size-[7px] rounded-full bg-current", session && "dot-live")} />
          {session ? "REC · vykdoma sesija" : "Laikmatis sustabdytas"}
        </span>
        {session && (
          <Link href={`/app/sessions/${session.projectId}/${session.taskId}/${session.id}`} className="text-muted transition-colors hover:text-fg" aria-label="Atidaryti sesiją">
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-14 w-64" />
      ) : (
        <div className="font-mono text-[clamp(44px,8vw,72px)] leading-none tabular-nums" aria-live="off">
          {formatClock(elapsedMs)}
        </div>
      )}

      {session ? (
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>
            Užduotis{" "}
            <Link href={`/app/projects/${session.projectId}?task=${session.taskId}`} className="text-fg hover:text-data">
              {task.data?.title ?? "…"}
            </Link>
          </span>
          <span>{project.data?.title ?? ""}</span>
          {rate != null && (
            <span>
              Sukaupta <strong className="font-mono font-medium text-fg">{formatMoney((rate * elapsedMs) / 3_600_000)}</strong>
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted">Pradėkite laikmatį prie užduoties – laikas bus skaičiuojamas, kol jį sustabdysite.</p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {session ? (
          <Button
            variant="hack"
            icon={Square}
            glitch
            loading={stop.isPending}
            disabled={!session._links.stop}
            onClick={() =>
              stop.mutate(session, {
                onSuccess: (done) => toast.success("> sesija_sustabdyta [200]", `Užregistruota ${formatDuration(done.durationMinutes)}.`),
                onError: toast.fromError,
              })
            }
          >
            Sustabdyti
          </Button>
        ) : (
          <Button variant="hack" icon={Play} glitch onClick={() => setStarting(true)} disabled={isPending}>
            Pradėti laikmatį
          </Button>
        )}
        {showLogLink && (
          <ButtonLink href="/app/sessions" variant="secondary">
            Darbo žurnalas
          </ButtonLink>
        )}
      </div>

      <StartTimerDialog open={starting} onClose={() => setStarting(false)} />
    </section>
  );
}

/** Choose a task the API lets you time (`start-session` in its links) and start. */
function StartTimerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tasks = useMyTasks({ perPage: 100 }, open);
  const projects = useProjects({ scope: "assigned", status: "IN_PROGRESS", perPage: 100 });
  const start = useCreateSession();
  const toast = useToast();
  const [choice, setChoice] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();

  const titles = new Map(projects.data?.items.map((p) => [p.id, p.title]));
  const startable = (tasks.data?.items ?? []).filter((t) => t._links["start-session"] && t.status !== "DONE");
  const selected = choice || (startable[0] ? `${startable[0].projectId}/${startable[0].id}` : "");

  const submit = () => {
    if (!selected) return;
    const [projectId, taskId] = selected.split("/");
    start.mutate(
      { projectId, taskId, input: { startedAt: new Date().toISOString(), comment: toText(comment) } },
      {
        onSuccess: () => {
          toast.success("> sesija_pradeta [201]", "Laikmatis paleistas.");
          setComment("");
          setError(undefined);
          onClose();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pradėti laikmatį"
      size="sm"
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={start.isPending}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={Play} loading={start.isPending} disabled={!selected}>
            Pradėti
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error && <FormAlert>{error}</FormAlert>}
        {tasks.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : startable.length === 0 ? (
          <FormAlert tone="info">Nėra užduočių, prie kurių galėtumėte registruoti laiką. Laikmatis veikia tik vykdomuose projektuose.</FormAlert>
        ) : (
          <Field label="Užduotis">
            {(p) => (
              <Select {...p} value={selected} onChange={(e) => setChoice(e.target.value)}>
                {startable.map((t) => (
                  <option key={t.id} value={`${t.projectId}/${t.id}`}>
                    {t.title}
                    {titles.get(t.projectId) ? ` — ${titles.get(t.projectId)}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Komentaras">
          {(p) => <Textarea {...p} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Prie ko dirbsite (neprivaloma)." className="min-h-[72px]" />}
        </Field>
      </div>
    </Dialog>
  );
}
