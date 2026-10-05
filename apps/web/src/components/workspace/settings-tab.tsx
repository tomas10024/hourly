"use client";

import type { Project } from "@hourly/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProjectFormDialog } from "@/components/domain/project-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatBudget, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useDeleteProject } from "@/lib/queries/projects";
import type { Linked } from "@/lib/types";
import { StatusActions } from "./status-actions";

/** Project details, editing, status changes and - in its own box - deletion. */
export function SettingsTab({ project }: { project: Linked<Project> }) {
  const router = useRouter();
  const toast = useToast();
  const remove = useDeleteProject();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const direct = project.origin === "DIRECT";

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
      <Card className="grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Projekto duomenys</h2>
          {project._links.update && (
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Redaguoti
            </Button>
          )}
        </div>
        <KeyValues
          rows={[
            ["Kilmė", direct ? "Tiesiogiai sutartas" : "Aikštelė"],
            ["Užduotis sudaro", project.taskAuthoring === "CLIENT" ? "Užsakovas" : "Specialistas"],
            direct ? ["Įkainis", project.hourlyRate != null ? `${formatMoney(project.hourlyRate)}/val.` : "—"] : ["Biudžetas", formatBudget(project.budgetMin, project.budgetMax)],
            ["Terminas", formatDate(project.deadline)],
            ["Sukurta", formatDateTime(project.createdAt)],
            ["Atnaujinta", formatDateTime(project.updatedAt)],
          ]}
        />
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{project.description}</p>
      </Card>

      <div className="grid gap-5">
        {(project._links.publish || project._links.complete || project._links.cancel) && (
          <Card className="grid gap-3">
            <h2 className="font-semibold">Būsena</h2>
            <p className="text-sm text-muted">Perėjimai, kuriuos projektas leidžia dabar.</p>
            <div className="flex flex-wrap gap-2">
              <StatusActions project={project} />
            </div>
          </Card>
        )}
        {project._links.delete && (
          <Card className="grid gap-3 border-bad/30">
            <h2 className="font-semibold text-bad">Pavojinga zona</h2>
            <p className="text-sm text-muted">Projektas bus pašalintas su visomis užduotimis, sesijomis, pasiūlymais ir nuorodomis.</p>
            <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)} className="w-fit">
              Šalinti projektą
            </Button>
          </Card>
        )}
      </div>

      {project._links.update && (
        <ProjectFormDialog key={project.updatedAt} mode="edit" project={project} open={editing} onClose={() => setEditing(false)} />
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Šalinti projektą?"
        confirmLabel="Šalinti negrįžtamai"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(project.id, {
            onSuccess: () => {
              toast.success("> projektas_pasalintas [204]", `„${project.title}“ pašalintas.`);
              router.replace("/app/projects");
            },
            onError: (e) => {
              toast.fromError(e);
              setDeleting(false);
            },
          })
        }
      >
        „{project.title}“ ir visa jo istorija bus pašalinti. To atšaukti negalima.
      </ConfirmDialog>
    </div>
  );
}
