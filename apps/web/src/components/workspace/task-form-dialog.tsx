"use client";

import type { Project, Task, TaskStatus } from "@hourly/shared";
import { ListPlus, Save } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formErrors } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { moneyError, toNumber, toText } from "@/lib/form";
import { useCreateTask, useUpdateTask } from "@/lib/queries/tasks";

type Errors = Partial<Record<"title" | "description" | "estimatedHours" | "hourlyRate" | "form", string>>;
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

/**
 * A task of the project: create (`POST /projects/{id}/tasks`) or edit
 * (`PATCH …/tasks/{taskId}`, including its status). An empty rate means the
 * task uses the project's rate.
 */
export function TaskFormDialog({
  project,
  task,
  open,
  onClose,
}: {
  project: Project;
  task?: Task;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const create = useCreateTask(project.id);
  const update = useUpdateTask(project.id);
  const saving = create.isPending || update.isPending;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [hours, setHours] = useState(task?.estimatedHours?.toString() ?? "");
  const [rate, setRate] = useState(task?.hourlyRate?.toString() ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const values = {
      title: title.trim(),
      description: toText(description),
      estimatedHours: toNumber(hours),
      hourlyRate: toNumber(rate),
    };
    const found: Errors = {};
    if (values.title.length < 3 || values.title.length > 150) found.title = "Nuo 3 iki 150 simbolių.";
    if (values.estimatedHours !== null && (!Number.isFinite(values.estimatedHours) || values.estimatedHours < 0 || values.estimatedHours > 10_000)) {
      found.estimatedHours = "Skaičius nuo 0 iki 10 000.";
    }
    const rateError = moneyError(values.hourlyRate);
    if (rateError) found.hourlyRate = rateError;
    setErrors(found);
    if (Object.keys(found).length) return;

    const onError = (error: unknown) => {
      const { fields, form } = formErrors(error);
      setErrors({ ...fields, form });
    };

    if (task) {
      update.mutate(
        { taskId: task.id, input: { ...values, status } },
        {
          onSuccess: () => {
            toast.success("> uzduotis_atnaujinta [200]", `„${values.title}“ išsaugota.`);
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: (created) => {
          toast.success("> uzduotis_sukurta [201]", `„${created.title}“ pridėta.`);
          setTitle("");
          setDescription("");
          setHours("");
          setRate("");
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? "Redaguoti užduotį" : "Nauja užduotis"}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={task ? Save : ListPlus} loading={saving} glitch>
            {task ? "Išsaugoti" : "Pridėti"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <Field label="Pavadinimas" error={errors.title}>
          {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Registracijos forma" />}
        </Field>
        <Field label="Aprašymas" error={errors.description}>
          {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ką tiksliai reikia padaryti (neprivaloma)." />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Įvertis, val." error={errors.estimatedHours}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />}
          </Field>
          <Field
            label="Įkainis, €/val."
            error={errors.hourlyRate}
            hint={project.hourlyRate != null ? `Tuščia – projekto ${formatMoney(project.hourlyRate)}` : undefined}
          >
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />}
          </Field>
        </div>
        {task && (
          <Field label="Būsena">
            {(p) => (
              <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel.task(s)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>
    </Dialog>
  );
}
