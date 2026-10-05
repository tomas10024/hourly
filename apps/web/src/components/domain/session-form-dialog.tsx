"use client";

import type { Task, WorkSession } from "@hourly/shared";
import { Save } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formErrors } from "@/lib/errors";
import { formatDuration, formatMoney, fromLocalInput, toLocalInput } from "@/lib/format";
import { toText } from "@/lib/form";
import { useCreateSession, useUpdateSession } from "@/lib/queries/sessions";
import type { Linked } from "@/lib/types";

type Errors = Partial<Record<"task" | "startedAt" | "endedAt" | "comment" | "form", string>>;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Rate shown in the live total (the task's, else the project's). */
  rate?: number | null;
} & (
  | { mode: "create"; task?: { projectId: string; id: string }; tasks?: Linked<Task>[] }
  | { mode: "edit"; session: WorkSession }
);

/**
 * A work session entered by hand (`POST …/sessions` with `endedAt`) or edited
 * (`PATCH …/sessions/{id}`). Times are typed in local time; `lib/format.ts`
 * turns them into UTC for the API. The duration and the amount update as the
 * user types, so mistakes like a wrong day show up before saving.
 */
export function SessionFormDialog(props: Props) {
  const existing = props.mode === "edit" ? props.session : null;
  const toast = useToast();
  const create = useCreateSession();
  const update = useUpdateSession();
  const saving = create.isPending || update.isPending;

  const choosable = props.mode === "create" && !props.task ? (props.tasks ?? []) : [];
  const [taskKey, setTaskKey] = useState(choosable[0] ? `${choosable[0].projectId}/${choosable[0].id}` : "");
  const [startedAt, setStartedAt] = useState(toLocalInput(existing?.startedAt));
  const [endedAt, setEndedAt] = useState(toLocalInput(existing?.endedAt));
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const minutes =
    startedAt && endedAt ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000) : null;
  const chosenRate = choosable.find((t) => `${t.projectId}/${t.id}` === taskKey)?.hourlyRate;
  const rate = props.rate ?? chosenRate ?? existing?.appliedRate ?? null;

  const submit = () => {
    const found: Errors = {};
    if (props.mode === "create" && !props.task && !taskKey) found.task = "Pasirinkite užduotį.";
    if (!startedAt) found.startedAt = "Nurodykite pradžią.";
    if (!endedAt && !(existing && existing.endedAt === null)) found.endedAt = "Nurodykite pabaigą.";
    if (startedAt && endedAt && minutes !== null && minutes <= 0) found.endedAt = "Pabaiga turi būti vėlesnė už pradžią.";
    if (startedAt && new Date(startedAt).getTime() > Date.now()) found.startedAt = "Pradžia negali būti ateityje.";
    if (endedAt && new Date(endedAt).getTime() > Date.now() + 60_000) found.endedAt = "Pabaiga negali būti ateityje.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      startedAt: fromLocalInput(startedAt),
      endedAt: endedAt ? fromLocalInput(endedAt) : null,
      comment: toText(comment),
    };
    const onError = (error: unknown) => {
      const { fields, form } = formErrors(error);
      setErrors({ ...fields, form });
    };

    if (existing) {
      update.mutate(
        { projectId: existing.projectId, taskId: existing.taskId, sessionId: existing.id, input: body },
        {
          onSuccess: () => {
            toast.success("> sesija_atnaujinta [200]", "Pakeitimai išsaugoti.");
            props.onClose();
          },
          onError,
        },
      );
      return;
    }

    const target =
      props.mode === "create" && props.task
        ? { projectId: props.task.projectId, taskId: props.task.id }
        : { projectId: taskKey.split("/")[0], taskId: taskKey.split("/")[1] };
    create.mutate(
      { ...target, input: body },
      {
        onSuccess: (session) => {
          toast.success("> sesija_ivesta [201]", `Užregistruota ${formatDuration(session.durationMinutes)}.`);
          setStartedAt("");
          setEndedAt("");
          setComment("");
          props.onClose();
        },
        onError,
      },
    );
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={existing ? "Redaguoti sesiją" : "Rankinis įvedimas"}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose} disabled={saving}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={Save} loading={saving} glitch>
            Išsaugoti
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        {props.mode === "create" && !props.task && (
          <Field label="Užduotis" error={errors.task}>
            {(p) =>
              choosable.length ? (
                <Select {...p} value={taskKey} onChange={(e) => setTaskKey(e.target.value)}>
                  {choosable.map((task) => (
                    <option key={task.id} value={`${task.projectId}/${task.id}`}>
                      {task.title}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-muted">Nėra užduočių, prie kurių galėtumėte registruoti darbą.</p>
              )
            }
          </Field>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Pradžia" error={errors.startedAt}>
            {(p) => <Input {...p} type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />}
          </Field>
          <Field label="Pabaiga" error={errors.endedAt} hint={existing && existing.endedAt === null ? "Tuščia – sesija dar vykdoma." : undefined}>
            {(p) => <Input {...p} type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />}
          </Field>
        </div>
        <p className="font-mono text-[13px] text-muted" aria-live="polite">
          &gt; trukmė {minutes && minutes > 0 ? formatDuration(minutes) : "—"}
          {rate != null && minutes && minutes > 0 ? ` · ${formatMoney((rate * minutes) / 60)}` : ""}
        </p>
        <Field label="Komentaras" error={errors.comment}>
          {(p) => <Textarea {...p} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kas padaryta per šią sesiją." />}
        </Field>
      </div>
    </Dialog>
  );
}
