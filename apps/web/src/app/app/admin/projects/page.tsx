"use client";

import type { Project, ProjectStatus } from "@hourly/shared";
import { ExternalLink, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { UserName } from "@/components/domain/user-name";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { ProjectStatusBadge, statusLabel } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { useDeleteProject, useProjects } from "@/lib/queries/projects";
import type { Linked } from "@/lib/types";
import { useUrlFilters } from "@/lib/use-url-filters";

const STATUSES: ProjectStatus[] = ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function AdminProjectsPage() {
  return (
    <Suspense>
      <AdminProjects />
    </Suspense>
  );
}

/** Every project on the platform (`GET /projects?scope=all`) - moderation and dispute review. */
function AdminProjects() {
  const router = useRouter();
  const toast = useToast();
  const { values, set, page } = useUrlFilters(["q", "status"] as const);
  const [q, setQ] = useState(values.q);
  useEffect(() => {
    if (q === values.q) return;
    const timer = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(timer);
  }, [q, values.q, set]);

  const status = STATUSES.includes(values.status as ProjectStatus) ? (values.status as ProjectStatus) : undefined;
  const { data, error, isPending, refetch } = useProjects({ scope: "all", q: values.q || undefined, status, page, perPage: 20 });
  const remove = useDeleteProject();
  const [deleting, setDeleting] = useState<Project | null>(null);

  const menu = (p: Linked<Project>): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Atidaryti", icon: ExternalLink, onSelect: () => router.push(`/app/projects/${p.id}`) }];
    if (p._links.delete) items.push({ label: "Šalinti", icon: Trash2, danger: true, onSelect: () => setDeleting(p) });
    return items;
  };

  return (
    <div className="grid gap-8">
      <PageHeader label="administravimas" title="Visi projektai" description="Visų būsenų projektai. Atidarę projektą matysite jo užduotis, sesijas ir ataskaitą." />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px] md:items-end">
        <Field label="Paieška">
          {(p) => (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pavadinimas arba aprašymas" className="pl-9" />
            </div>
          )}
        </Field>
        <Field label="Būsena">
          {(p) => (
            <Select {...p} value={status ?? ""} onChange={(e) => set({ status: e.target.value || null })}>
              <option value="">Visos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel.project(s)}
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
            caption="Visi projektai"
            rows={data.items}
            rowKey={(p) => p.id}
            onRowClick={(p) => router.push(`/app/projects/${p.id}`)}
            empty={<EmptyState art="folder" title="Nieko nerasta">Pakeiskite paiešką ar būsenos filtrą.</EmptyState>}
            columns={[
              {
                key: "title",
                header: "Projektas",
                mobile: "title",
                cell: (p) => (
                  <Link href={`/app/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-data">
                    {p.title}
                  </Link>
                ),
              },
              { key: "client", header: "Užsakovas", cell: (p) => (p.origin === "DIRECT" ? p.externalClientName : <UserName id={p.clientId} />) },
              { key: "specialist", header: "Specialistas", cell: (p) => <UserName id={p.specialistId} /> },
              { key: "status", header: "Būsena", cell: (p) => <ProjectStatusBadge status={p.status} /> },
              { key: "created", header: "Sukurta", mobile: "hidden", cell: (p) => <span className="tabular">{formatDate(p.createdAt)}</span> },
              { key: "menu", header: <span className="sr-only">Veiksmai</span>, className: "w-12", mobile: "aside", cell: (p) => <DropdownMenu items={menu(p)} /> },
            ]}
          />
        )}
      </Card>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Šalinti projektą?"
        confirmLabel="Šalinti negrįžtamai"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("> projektas_pasalintas [204]", `„${deleting.title}“ pašalintas.`);
              setDeleting(null);
            },
            onError: (e) => {
              toast.fromError(e);
              setDeleting(null);
            },
          })
        }
      >
        {deleting && `„${deleting.title}“ su visomis užduotimis, sesijomis ir pasiūlymais bus pašalintas.`}
      </ConfirmDialog>
    </div>
  );
}
