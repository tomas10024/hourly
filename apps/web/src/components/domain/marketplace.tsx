"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/layout/states";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/spinner";
import { useProjects } from "@/lib/queries/projects";
import { useUrlFilters } from "@/lib/use-url-filters";
import { ProjectCard } from "./project-card";

const PAGE_SIZES = ["9", "18", "36"];
const FILTER_KEYS = ["q", "perPage"] as const;

/**
 * The marketplace: published projects, searchable (`GET /projects?scope=marketplace`).
 * Shared by the public page and the app; cards lead to `${basePath}/{id}`.
 */
export function Marketplace({ basePath }: { basePath: string }) {
  const { values, set, page } = useUrlFilters(FILTER_KEYS);
  const perPage = PAGE_SIZES.includes(values.perPage) ? Number(values.perPage) : 9;

  // The search box types freely; the address (and the request) follow a moment later.
  const [q, setQ] = useState(values.q);
  useEffect(() => {
    if (q === values.q) return;
    const timer = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(timer);
  }, [q, values.q, set]);

  const { data, error, isPending, refetch } = useProjects({ scope: "marketplace", q: values.q || undefined, page, perPage });

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end">
        <Field label="Paieška">
          {(p) => (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="pvz., svetainė, API, logotipas" className="pl-9" />
            </div>
          )}
        </Field>
        <Field label="Rodyti po">
          {(p) => (
            <Select {...p} value={String(perPage)} onChange={(e) => set({ perPage: e.target.value === "9" ? null : e.target.value })}>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} projektų
                </option>
              ))}
            </Select>
          )}
        </Field>
        <p className="pb-2.5 text-sm text-muted md:text-right" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? "projektas" : "projektai"}` : " "}
        </p>
      </div>

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="grid gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="w-1/2" />
              <Skeleton className="mt-6 w-full" />
            </Card>
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState art="folder" title={values.q ? "Nieko nerasta" : "Aikštelė tuščia"}>
            {values.q ? `Pagal „${values.q}“ paskelbtų projektų nėra. Pabandykite kitą žodį.` : "Kai užsakovai paskelbs projektų, jie atsiras čia."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <ProjectCard key={project.id} project={project} href={`${basePath}/${project.id}`} />
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}
    </div>
  );
}
