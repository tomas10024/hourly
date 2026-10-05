"use client";

import type { Project, ProjectOrigin, TaskAuthoring } from "@hourly/shared";
import { FolderPlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, RadioCards, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formErrors } from "@/lib/errors";
import { dateInputToIso, isoToDateInput, moneyError, toNumber, toText } from "@/lib/form";
import { useCreateProject, useUpdateProject } from "@/lib/queries/projects";

type Errors = Partial<
  Record<"title" | "description" | "budgetMin" | "budgetMax" | "hourlyRate" | "deadline" | "externalClientName" | "form", string>
>;

type Props =
  | { mode: "create"; origin: ProjectOrigin; open: boolean; onClose: () => void }
  | { mode: "edit"; project: Project; open: boolean; onClose: () => void };

/**
 * Creating (`POST /projects`) and editing (`PATCH /projects/{id}`) a project
 * in one dialog. The fields follow the origin: a marketplace project has a
 * budget and lets the client choose who writes the tasks; directly agreed
 * work has a client name and an hourly rate.
 */
export function ProjectFormDialog(props: Props) {
  const existing = props.mode === "edit" ? props.project : null;
  const origin = existing?.origin ?? (props.mode === "create" ? props.origin : "MARKETPLACE");
  const direct = origin === "DIRECT";

  const router = useRouter();
  const toast = useToast();
  const create = useCreateProject();
  const update = useUpdateProject(existing?.id ?? "");
  const saving = create.isPending || update.isPending;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [budgetMin, setBudgetMin] = useState(existing?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(existing?.budgetMax?.toString() ?? "");
  const [hourlyRate, setHourlyRate] = useState(existing?.hourlyRate?.toString() ?? "");
  const [deadline, setDeadline] = useState(isoToDateInput(existing?.deadline));
  const [clientName, setClientName] = useState(existing?.externalClientName ?? "");
  const [authoring, setAuthoring] = useState<TaskAuthoring>(existing?.taskAuthoring ?? "CLIENT");
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const values = {
      title: title.trim(),
      description: description.trim(),
      budgetMin: toNumber(budgetMin),
      budgetMax: toNumber(budgetMax),
      hourlyRate: toNumber(hourlyRate),
      deadline: dateInputToIso(deadline),
      externalClientName: toText(clientName),
    };

    const found: Errors = {};
    if (values.title.length < 3 || values.title.length > 150) found.title = "Nuo 3 iki 150 simbolių.";
    if (values.description.length < 10) found.description = "Bent 10 simbolių – aprašykite darbą.";
    if (direct) {
      found.hourlyRate = moneyError(values.hourlyRate);
      if (!existing && (!values.externalClientName || values.externalClientName.length < 2)) {
        found.externalClientName = "Nurodykite užsakovo pavadinimą.";
      }
    } else {
      found.budgetMin = moneyError(values.budgetMin);
      found.budgetMax = moneyError(values.budgetMax);
      if (!found.budgetMin && !found.budgetMax && values.budgetMin != null && values.budgetMax != null && values.budgetMin > values.budgetMax) {
        found.budgetMax = "Turi būti ne mažesnė už apatinę ribą.";
      }
    }
    const clean = Object.fromEntries(Object.entries(found).filter(([, v]) => v)) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length) return;

    const onError = (error: unknown) => {
      const { fields, form } = formErrors(error);
      setErrors({ ...fields, form });
    };

    const money = direct
      ? { hourlyRate: values.hourlyRate }
      : { budgetMin: values.budgetMin, budgetMax: values.budgetMax };

    if (existing) {
      update.mutate(
        { title: values.title, description: values.description, deadline: values.deadline, ...money },
        {
          onSuccess: () => {
            toast.success("> projektas_atnaujintas [200]", "Pakeitimai išsaugoti.");
            props.onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(
        {
          title: values.title,
          description: values.description,
          origin,
          taskAuthoring: direct ? "SPECIALIST" : authoring,
          deadline: values.deadline,
          externalClientName: direct ? values.externalClientName : null,
          ...money,
        },
        {
          onSuccess: (project) => {
            toast.success(
              "> projektas_sukurtas [201]",
              direct ? `„${project.title}“ – galite registruoti darbą.` : `„${project.title}“ išsaugotas kaip juodraštis.`,
            );
            props.onClose();
            router.push(`/app/projects/${project.id}`);
          },
          onError,
        },
      );
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={existing ? "Redaguoti projektą" : direct ? "Tiesioginis darbas" : "Naujas projektas"}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose} disabled={saving}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={existing ? Save : FolderPlus} loading={saving} glitch>
            {existing ? "Išsaugoti" : "Sukurti"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        {!existing && direct && (
          <FormAlert tone="info">
            Darbas sutartas ne platformoje: pasiūlymų etapo nebus, projektas iš karto taps vykdomu.
          </FormAlert>
        )}
        <Field label="Pavadinimas" error={errors.title}>
          {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kavinės išankstinių užsakymų sistema" />}
        </Field>
        <Field label="Aprašymas" error={errors.description}>
          {(p) => (
            <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ką reikia padaryti ir kokio rezultato tikitės." />
          )}
        </Field>

        {direct ? (
          <div className="grid gap-3 md:grid-cols-2">
            {!existing && (
              <Field label="Užsakovas" error={errors.externalClientName} className="md:col-span-2">
                {(p) => <Input {...p} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Kirpykla „Ramunė“" />}
              </Field>
            )}
            <Field label="Įkainis, €/val." error={errors.hourlyRate}>
              {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="0.5" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />}
            </Field>
            <Field label="Terminas" error={errors.deadline}>
              {(p) => <Input {...p} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />}
            </Field>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Biudžetas nuo, €" error={errors.budgetMin}>
                {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />}
              </Field>
              <Field label="Biudžetas iki, €" error={errors.budgetMax}>
                {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />}
              </Field>
            </div>
            <Field label="Pageidaujamas terminas" error={errors.deadline}>
              {(p) => <Input {...p} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />}
            </Field>
            {!existing && (
              <RadioCards
                name="taskAuthoring"
                legend="Užduotis sudaro"
                value={authoring}
                onChange={setAuthoring}
                options={[
                  { value: "CLIENT", label: "Užsakovas", description: "aš pats" },
                  { value: "SPECIALIST", label: "Specialistas", description: "laimėjęs, aš patvirtinu" },
                ]}
              />
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
