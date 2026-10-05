"use client";

import type { Proposal, ProposalStatus } from "@hourly/shared";
import { ExternalLink, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { ProposalStatusBadge, statusLabel } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { DecisionDialog, type Decision } from "@/components/workspace/proposals-tab";
import { formatDate, formatMoney } from "@/lib/format";
import { useProject } from "@/lib/queries/projects";
import { useMyProposals } from "@/lib/queries/proposals";
import type { Linked } from "@/lib/types";
import { useUrlFilters } from "@/lib/use-url-filters";

const STATUSES: ProposalStatus[] = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];

function ProjectTitle({ id }: { id: string }) {
  const { data } = useProject(id);
  return (
    <Link href={`/app/projects/${id}`} onClick={(e) => e.stopPropagation()} className="hover:text-data">
      {data?.title ?? "…"}
    </Link>
  );
}

export default function MyProposalsPage() {
  return (
    <Suspense>
      <MyProposals />
    </Suspense>
  );
}

/** The specialist's proposals and their fate (`GET /proposals`). */
function MyProposals() {
  const router = useRouter();
  const { values, set, page } = useUrlFilters(["status"] as const);
  const status = STATUSES.includes(values.status as ProposalStatus) ? (values.status as ProposalStatus) : undefined;
  const { data, error, isPending, refetch } = useMyProposals({ status, page, perPage: 20 });
  const [deciding, setDeciding] = useState<Decision | null>(null);

  const open = (p: Proposal) => router.push(`/app/projects/${p.projectId}?tab=proposals&proposal=${p.id}`);
  const menu = (p: Linked<Proposal>): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Atidaryti", icon: ExternalLink, onSelect: () => open(p) }];
    if (p._links.withdraw) items.push({ label: "Atsiimti", icon: Undo2, onSelect: () => setDeciding({ proposal: p, action: "withdraw" }) });
    if (p._links.delete) items.push({ label: "Šalinti", icon: Trash2, danger: true, onSelect: () => setDeciding({ proposal: p, action: "delete" }) });
    return items;
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        label="pasiūlymai"
        title="Mano pasiūlymai"
        description="Pasiūlymai, kuriuos pateikėte aikštelėje. Kol užsakovas nesprendė, pasiūlymą galite atsiimti."
        actions={
          <ButtonLink href="/app/marketplace" variant="secondary">
            Į aikštelę
          </ButtonLink>
        }
      />
      <div className="w-full max-w-[220px]">
        <Field label="Būsena">
          {(p) => (
            <Select {...p} value={status ?? ""} onChange={(e) => set({ status: e.target.value || null })}>
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
            caption="Mano pasiūlymai"
            rows={data.items}
            rowKey={(p) => p.id}
            onRowClick={open}
            empty={
              <EmptyState
                art="folder"
                title="Pasiūlymų nėra"
                action={
                  <ButtonLink href="/app/marketplace" variant="secondary">
                    Naršyti aikštelę
                  </ButtonLink>
                }
              >
                Raskite projektą aikštelėje ir pasiūlykite savo kainą.
              </EmptyState>
            }
            columns={[
              { key: "project", header: "Projektas", mobile: "title", cell: (p) => <ProjectTitle id={p.projectId} /> },
              { key: "price", header: "Kaina", numeric: true, cell: (p) => formatMoney(p.price) },
              { key: "rate", header: "Įkainis", numeric: true, cell: (p) => (p.hourlyRate != null ? `${formatMoney(p.hourlyRate)}/val.` : "—") },
              { key: "date", header: "Pateikta", cell: (p) => <span className="tabular">{formatDate(p.createdAt)}</span> },
              { key: "status", header: "Būsena", cell: (p) => <ProposalStatusBadge status={p.status} /> },
              { key: "menu", header: <span className="sr-only">Veiksmai</span>, className: "w-12", mobile: "aside", cell: (p) => <DropdownMenu items={menu(p)} /> },
            ]}
          />
        )}
      </Card>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}
      {deciding && <DecisionDialog projectId={deciding.proposal.projectId} decision={deciding} onClose={() => setDeciding(null)} onDone={() => undefined} />}
    </div>
  );
}
