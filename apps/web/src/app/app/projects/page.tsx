"use client";

import type { ProjectStatus } from "@hourly/shared";
import { FolderPlus, Handshake } from "lucide-react";
import { Suspense, useState } from "react";
import { ProjectCard } from "@/components/domain/project-card";
import { ProjectFormDialog } from "@/components/domain/project-form-dialog";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useProjects } from "@/lib/queries/projects";
import { useApiRoot } from "@/lib/queries/system";
import { useUrlFilters } from "@/lib/use-url-filters";

type StatusTab = "all" | ProjectStatus;

const TABS: Array<{ value: StatusTab; label: string; client?: boolean }> = [
  { value: "all", label: "Visi" },
  { value: "DRAFT", label: "Juodraščiai", client: true },
  { value: "PUBLISHED", label: "Paskelbti", client: true },
  { value: "IN_PROGRESS", label: "Vykdomi" },
  { value: "COMPLETED", label: "Užbaigti" },
];

export default function ProjectsPage() {
  return (
    <Suspense>
      <Projects />
    </Suspense>
  );
}

/**
 * My projects. Which set that is comes from the role: a client's own projects
 * (`scope=owned`), a specialist's assigned ones (`scope=assigned`, including
 * the directly agreed work they created). The "new project" buttons appear
 * only when the API entry point offers `create-project`.
 */
function Projects() {
  const { user } = useAuth();
  const root = useApiRoot();
  const { values, set, page } = useUrlFilters(["status"] as const);
  const [creating, setCreating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const isClient = user?.role === "CLIENT";
  const tabs = TABS.filter((tab) => isClient || !tab.client);
  const status = (tabs.some((t) => t.value === values.status) ? values.status : "all") as StatusTab;

  const { data, error, isPending, refetch } = useProjects({
    scope: isClient ? "owned" : "assigned",
    status: status === "all" ? undefined : status,
    page,
    perPage: 12,
  });

  const canCreate = !!root.data?._links["create-project"];
  const open = () => {
    setFormKey((k) => k + 1);
    setCreating(true);
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        label="projektai"
        title={isClient ? "Mano projektai" : "Mano darbai"}
        description={
          isClient
            ? "Projektai, kuriuos paskelbėte. Juodraštį paskelbkite, kai užduotys ir biudžetas aiškūs."
            : "Projektai, kuriuos vykdote: laimėti aikštelėje ir sutarti tiesiogiai."
        }
        actions={
          canCreate && (
            <Button variant="hack" icon={isClient ? FolderPlus : Handshake} glitch onClick={open}>
              {isClient ? "Naujas projektas" : "Tiesioginis darbas"}
            </Button>
          )
        }
      />

      <Tabs label="Projektų būsena" items={tabs} value={status} onChange={(v) => set({ status: v === "all" ? null : v })} />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : isPending ? (
        <LoadingState />
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            art="folder"
            title="Projektų nėra"
            action={
              canCreate ? (
                <Button variant="secondary" icon={FolderPlus} onClick={open}>
                  {isClient ? "Sukurti pirmą projektą" : "Pridėti tiesioginį darbą"}
                </Button>
              ) : undefined
            }
          >
            {status === "all"
              ? isClient
                ? "Sukurkite projektą: aprašykite darbą, biudžetą ir terminą."
                : "Pateikite pasiūlymą aikštelėje arba pridėkite tiesiogiai sutartą darbą."
              : "Šioje būsenoje projektų nėra."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <ProjectCard key={project.id} project={project} href={`/app/projects/${project.id}`} />
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}

      {canCreate && (
        <ProjectFormDialog key={formKey} mode="create" origin={isClient ? "MARKETPLACE" : "DIRECT"} open={creating} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
