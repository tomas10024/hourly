"use client";

import type { Project } from "@hourly/shared";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { TaskStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Scramble } from "@/components/ui/scramble";
import { BlockProgress } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatDuration, formatMoney } from "@/lib/format";
import { downloadProjectReport, useProjectReport } from "@/lib/queries/projects";

/**
 * The project report (`GET /projects/{id}/report`): time and amount per task.
 * The same address with `Accept: text/csv` gives the downloadable file -
 * content negotiation rather than a second endpoint.
 */
export function ReportTab({ project }: { project: Project }) {
  const { data, error, isPending, isFetching, refetch } = useProjectReport(project.id);
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadProjectReport(project.id);
      toast.success("> ataskaita_parsiusta [200]", "CSV failas išsaugotas.");
    } catch (e) {
      toast.fromError(e);
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (isPending) return <LoadingState />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted">&gt; suformuota {formatDateTime(data.generatedAt)} · vykdomos sesijos neįtrauktos</p>
        <div className="flex gap-2">
          <Button variant="ghost" icon={RefreshCw} loading={isFetching} onClick={() => void refetch()}>
            Atnaujinti
          </Button>
          <Button variant="secondary" icon={Download} loading={downloading} onClick={download}>
            Parsisiųsti CSV
          </Button>
        </div>
      </div>
      {isFetching && <BlockProgress />}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grid gap-1">
          <span className="label">Iš viso laiko</span>
          <span className="font-mono text-2xl">
            <Scramble key={data.generatedAt} text={formatDuration(data.totalMinutes)} />
          </span>
        </Card>
        <Card className="grid gap-1">
          <span className="label">Suma</span>
          <span className="font-mono text-2xl text-data">
            <Scramble key={data.generatedAt} text={formatMoney(data.totalAmount)} />
          </span>
        </Card>
        <Card className="grid gap-1">
          <span className="label">Projekto įkainis</span>
          <span className="font-mono text-2xl">{data.project.hourlyRate != null ? `${formatMoney(data.project.hourlyRate)}/val.` : "—"}</span>
        </Card>
      </div>

      <Card className="p-3 md:p-4">
        <DataTable
          caption="Ataskaita pagal užduotis"
          rows={data.lines}
          rowKey={(l) => l.taskId}
          empty={<p className="p-4 text-sm text-muted">Užduočių nėra.</p>}
          columns={[
            { key: "title", header: "Užduotis", mobile: "title", cell: (l) => l.title },
            { key: "status", header: "Būsena", mobile: "aside", cell: (l) => <TaskStatusBadge status={l.status} /> },
            { key: "time", header: "Laikas", numeric: true, cell: (l) => formatDuration(l.totalMinutes) },
            { key: "rate", header: "Įkainis", numeric: true, cell: (l) => (l.appliedRate != null ? `${formatMoney(l.appliedRate)}/val.` : "—") },
            { key: "amount", header: "Suma", numeric: true, cell: (l) => formatMoney(l.amount) },
          ]}
        />
      </Card>
    </div>
  );
}
