"use client";

import type { Project, Proposal, ProposalStatus } from "@hourly/shared";
import { Check, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import { UserName } from "@/components/domain/user-name";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { ProposalStatusBadge, statusLabel } from "@/components/ui/badge";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatMoney } from "@/lib/format";
import { useDeleteProposal, useProjectProposals, useProposal, useUpdateProposal } from "@/lib/queries/proposals";
import { useUrlFilters } from "@/lib/use-url-filters";

const STATUSES: ProposalStatus[] = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];

export type Decision = { proposal: Proposal; action: "accept" | "reject" | "withdraw" | "delete" };

const DECISIONS: Record<Decision["action"], { title: string; label: string; variant: ButtonVariant; text: string; done: [string, string] }> = {
  accept: {
    title: "Priimti pasiūlymą?",
    label: "Priimti",
    variant: "hack",
    text: "Specialistas taps projekto vykdytoju, projektas – vykdomu, o kiti pasiūlymai bus atmesti. To atšaukti negalima.",
    done: ["> pasiulymas_priimtas [200]", "Projektas vykdomas – specialistas gali pradėti darbą."],
  },
  reject: {
    title: "Atmesti pasiūlymą?",
    label: "Atmesti",
    variant: "danger",
    text: "Specialistas matys, kad pasiūlymas atmestas.",
    done: ["> pasiulymas_atmestas [200]", "Pasiūlymas atmestas."],
  },
  withdraw: {
    title: "Atsiimti pasiūlymą?",
    label: "Atsiimti",
    variant: "danger",
    text: "Užsakovas nebegalės jo priimti.",
    done: ["> pasiulymas_atsiimtas [200]", "Pasiūlymas atsiimtas."],
  },
  delete: {
    title: "Šalinti pasiūlymą?",
    label: "Šalinti",
    variant: "danger",
    text: "Pasiūlymas bus pašalintas negrįžtamai.",
    done: ["> pasiulymas_pasalintas [204]", "Pasiūlymas pašalintas."],
  },
};

/**
 * Proposals for a marketplace project (`GET /projects/{id}/proposals`). The
 * client accepts or rejects; a specialist sees and withdraws their own. Each
 * button comes from the proposal's `_links`.
 */
export function ProposalsTab({ project }: { project: Project }) {
  const { values, set } = useUrlFilters(["pstatus", "proposal"] as const);
  const status = STATUSES.includes(values.pstatus as ProposalStatus) ? (values.pstatus as ProposalStatus) : undefined;
  const { data, error, isPending, refetch } = useProjectProposals(project.id, { status, perPage: 50 });
  const [deciding, setDeciding] = useState<Decision | null>(null);

  return (
    <div className="grid gap-5">
      <div className="w-full max-w-[220px]">
        <Field label="Būsena">
          {(p) => (
            <Select {...p} value={status ?? ""} onChange={(e) => set({ pstatus: e.target.value || null })}>
              <option value="">Visi</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel.proposal(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Card className="p-3 md:p-4">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <LoadingState />
        ) : (
          <DataTable
            caption="Pasiūlymai"
            rows={data.items}
            rowKey={(p) => p.id}
            onRowClick={(p) => set({ proposal: p.id })}
            empty={
              <EmptyState art="folder" title="Pasiūlymų nėra">
                {project.status === "DRAFT" ? "Paskelbkite projektą – tada specialistai galės teikti pasiūlymus." : "Kai specialistai pasiūlys, jie atsiras čia."}
              </EmptyState>
            }
            columns={[
              { key: "who", header: "Specialistas", mobile: "title", cell: (p) => <UserName id={p.specialistId} fallback="Specialistas" /> },
              { key: "price", header: "Kaina", numeric: true, cell: (p) => formatMoney(p.price) },
              { key: "rate", header: "Įkainis", numeric: true, cell: (p) => (p.hourlyRate != null ? `${formatMoney(p.hourlyRate)}/val.` : "—") },
              { key: "days", header: "Trukmė", numeric: true, cell: (p) => (p.estimatedDays ? `${p.estimatedDays} d.` : "—") },
              { key: "date", header: "Pateikta", mobile: "hidden", cell: (p) => <span className="tabular">{formatDate(p.createdAt)}</span> },
              { key: "status", header: "Būsena", mobile: "aside", cell: (p) => <ProposalStatusBadge status={p.status} /> },
            ]}
          />
        )}
      </Card>

      <ProposalDetail
        projectId={project.id}
        proposalId={values.proposal || null}
        onClose={() => set({ proposal: null })}
        onDecide={(proposal, action) => setDeciding({ proposal, action })}
      />
      <DecisionDialog projectId={project.id} decision={deciding} onClose={() => setDeciding(null)} onDone={() => set({ proposal: null })} />
    </div>
  );
}

/** One proposal with its message (`GET /projects/{id}/proposals/{proposalId}`). */
function ProposalDetail({
  projectId,
  proposalId,
  onClose,
  onDecide,
}: {
  projectId: string;
  proposalId: string | null;
  onClose: () => void;
  onDecide: (proposal: Proposal, action: Decision["action"]) => void;
}) {
  const { data: proposal, error, isPending } = useProposal(projectId, proposalId ?? undefined);
  const actions = proposal
    ? (["accept", "reject", "withdraw", "delete"] as const).filter((action) => proposal._links[action])
    : [];
  const icons = { accept: Check, reject: X, withdraw: Undo2, delete: Trash2 };

  return (
    <Dialog
      open={proposalId !== null}
      onClose={onClose}
      title="Pasiūlymas"
      footer={
        actions.length ? (
          actions.map((action) => (
            <Button key={action} variant={DECISIONS[action].variant} icon={icons[action]} onClick={() => proposal && onDecide(proposal, action)}>
              {DECISIONS[action].label}
            </Button>
          ))
        ) : undefined
      }
    >
      {error ? (
        <ErrorState error={error} />
      ) : isPending || !proposal ? (
        <LoadingState rows={3} />
      ) : (
        <div className="grid gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">
              <UserName id={proposal.specialistId} link fallback="Specialistas" />
            </span>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <KeyValues
            rows={[
              ["Kaina", formatMoney(proposal.price)],
              ["Įkainis", proposal.hourlyRate != null ? `${formatMoney(proposal.hourlyRate)}/val.` : "—"],
              ["Numatoma trukmė", proposal.estimatedDays ? `${proposal.estimatedDays} d.` : "—"],
              ["Pateikta", formatDate(proposal.createdAt)],
            ]}
          />
          <div className="grid gap-1.5">
            <span className="label">{"// žinutė"}</span>
            <p className="text-sm leading-relaxed whitespace-pre-line">{proposal.message ?? "Žinutės nėra."}</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function DecisionDialog({
  projectId,
  decision,
  onClose,
  onDone,
}: {
  projectId: string;
  decision: Decision | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const update = useUpdateProposal(projectId);
  const remove = useDeleteProposal(projectId);
  const meta = decision ? DECISIONS[decision.action] : null;

  const finish = (ok: boolean, error?: unknown) => {
    if (ok && meta) {
      toast.success(...meta.done);
      onDone();
    } else toast.fromError(error);
    onClose();
  };

  return (
    <ConfirmDialog
      open={decision !== null}
      onClose={onClose}
      title={meta?.title ?? ""}
      confirmLabel={meta?.label ?? ""}
      variant={meta?.variant}
      loading={update.isPending || remove.isPending}
      onConfirm={() => {
        if (!decision) return;
        const callbacks = { onSuccess: () => finish(true), onError: (e: unknown) => finish(false, e) };
        if (decision.action === "delete") remove.mutate(decision.proposal.id, callbacks);
        else {
          const status = decision.action === "accept" ? "ACCEPTED" : decision.action === "reject" ? "REJECTED" : "WITHDRAWN";
          update.mutate({ proposalId: decision.proposal.id, status }, callbacks);
        }
      }}
    >
      {meta?.text}
    </ConfirmDialog>
  );
}
