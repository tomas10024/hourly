"use client";

import { useParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge, ProjectStatusBadge, TaskStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Scramble } from "@/components/ui/scramble";
import { formatDate, formatDuration, formatMoney } from "@/lib/format";
import { usePublicProject } from "@/lib/queries/shares";
import { useNow } from "@/lib/use-now";

/**
 * What a client without an account sees through a share link: task states,
 * hours and the amount so far (`GET /public/projects/{token}`), refreshed
 * every 15 seconds while the tab is visible - the "watch the work as it
 * happens" promise of the project description.
 */
export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, isPending, refetch, dataUpdatedAt } = usePublicProject(token);
  const now = useNow(1000);

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (isPending) return <LoadingState rows={6} />;

  const daysLeft = Math.ceil((new Date(data.expiresAt).getTime() - now) / 86_400_000);
  const seconds = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <ProjectStatusBadge status={data.project.status} />
          <Badge tone={daysLeft <= 3 ? "warn" : "neutral"}>Nuoroda galioja iki {formatDate(data.expiresAt)}</Badge>
        </div>
        <h1 className="heading-display text-[clamp(36px,6vw,60px)] leading-[1.02]">{data.project.title}</h1>
        {data.project.externalClientName && <p className="text-sm text-muted">Užsakovas: {data.project.externalClientName}</p>}
        <p className="max-w-[68ch] leading-relaxed whitespace-pre-line text-muted">{data.project.description}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grid gap-1">
          <span className="label">Sukaupta</span>
          <span className="font-mono text-3xl">
            <Scramble text={formatDuration(data.totalMinutes)} />
          </span>
        </Card>
        <Card className="grid gap-1">
          <span className="label">Suma</span>
          <span className="font-mono text-3xl text-data">
            <Scramble text={formatMoney(data.totalAmount)} />
          </span>
        </Card>
        <Card className="grid gap-1">
          <span className="label">Užduotys</span>
          <span className="font-mono text-3xl">
            {data.tasks.filter((t) => t.status === "DONE").length} / {data.tasks.length}
          </span>
          <span className="text-xs text-muted">atlikta</span>
        </Card>
      </div>

      <Card>
        <DataTable
          caption="Užduotys"
          rows={data.tasks}
          rowKey={(t) => t.taskId}
          empty={<p className="p-4 text-sm text-muted">Užduočių dar nėra.</p>}
          columns={[
            { key: "title", header: "Užduotis", cell: (t) => t.title, mobile: "title" },
            { key: "status", header: "Būsena", cell: (t) => <TaskStatusBadge status={t.status} />, mobile: "aside" },
            { key: "time", header: "Laikas", numeric: true, cell: (t) => formatDuration(t.totalMinutes) },
            { key: "rate", header: "Įkainis", numeric: true, cell: (t) => (t.appliedRate ? `${formatMoney(t.appliedRate)}/val.` : "—") },
            { key: "amount", header: "Suma", numeric: true, cell: (t) => formatMoney(t.amount) },
          ]}
        />
      </Card>

      <p className="text-center font-mono text-xs text-muted" aria-live="polite">
        &gt; duomenys atnaujinami kas 15 s · paskutinį kartą prieš {seconds} s
      </p>
    </div>
  );
}
