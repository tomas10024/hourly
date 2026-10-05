"use client";

import type { Project, ProjectStatus } from "@hourly/shared";
import { CircleCheck, Megaphone, XCircle } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Linked } from "@/lib/types";
import { useUpdateProject } from "@/lib/queries/projects";

type Action = "publish" | "complete" | "cancel";

const ACTIONS: Record<
  Action,
  { status: ProjectStatus; label: string; title: string; text: string; icon: typeof Megaphone; variant: ButtonVariant; done: [string, string] }
> = {
  publish: {
    status: "PUBLISHED",
    label: "Paskelbti",
    title: "Paskelbti projektą?",
    text: "Projektas atsiras aikštelėje ir specialistai galės teikti pasiūlymus. Redaguoti jį galėsite ir toliau.",
    icon: Megaphone,
    variant: "hack",
    done: ["> projektas_paskelbtas [200]", "Projektas matomas aikštelėje."],
  },
  complete: {
    status: "COMPLETED",
    label: "Užbaigti",
    title: "Užbaigti projektą?",
    text: "Darbo registruoti nebebus galima. Ataskaita ir istorija liks prieinamos.",
    icon: CircleCheck,
    variant: "primary",
    done: ["> projektas_uzbaigtas [200]", "Projektas pažymėtas kaip užbaigtas."],
  },
  cancel: {
    status: "CANCELLED",
    label: "Atšaukti projektą",
    title: "Atšaukti projektą?",
    text: "Projektas bus uždarytas: pasiūlymų jis nebepriims, darbo registruoti nebus galima. To atšaukti negalima.",
    icon: XCircle,
    variant: "danger",
    done: ["> projektas_atsauktas [200]", "Projektas atšauktas."],
  },
};

/**
 * The status changes the API offers right now (`publish`, `complete`,
 * `cancel` in `_links`), each behind a confirmation - they cannot be undone.
 */
export function StatusActions({ project, include }: { project: Linked<Project>; include?: Action[] }) {
  const update = useUpdateProject(project.id);
  const toast = useToast();
  const [pending, setPending] = useState<Action | null>(null);

  const offered = (Object.keys(ACTIONS) as Action[]).filter(
    (action) => project._links[action] && (!include || include.includes(action)),
  );
  if (offered.length === 0) return null;

  const current = pending ? ACTIONS[pending] : null;

  return (
    <>
      {offered.map((action) => {
        const { label, icon, variant } = ACTIONS[action];
        return (
          <Button key={action} variant={action === "cancel" ? "ghost" : variant} icon={icon} onClick={() => setPending(action)}>
            {label}
          </Button>
        );
      })}
      <ConfirmDialog
        open={current !== null}
        onClose={() => setPending(null)}
        title={current?.title ?? ""}
        confirmLabel={current?.label ?? ""}
        variant={current?.variant}
        loading={update.isPending}
        onConfirm={() => {
          if (!current) return;
          update.mutate(
            { status: current.status },
            {
              onSuccess: () => {
                toast.success(...current.done);
                setPending(null);
              },
              onError: (error) => {
                toast.fromError(error);
                setPending(null);
              },
            },
          );
        }}
      >
        {current?.text}
      </ConfirmDialog>
    </>
  );
}
