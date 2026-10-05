"use client";

import { ArrowLeft, FileText, Link2, ListChecks, Send, Settings } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ProposalDialog } from "@/components/domain/proposal-dialog";
import { UserName } from "@/components/domain/user-name";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge, ProjectStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scramble } from "@/components/ui/scramble";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ProposalsTab } from "@/components/workspace/proposals-tab";
import { ReportTab } from "@/components/workspace/report-tab";
import { SettingsTab } from "@/components/workspace/settings-tab";
import { SharesTab } from "@/components/workspace/shares-tab";
import { StatusActions } from "@/components/workspace/status-actions";
import { TasksTab } from "@/components/workspace/tasks-tab";
import { formatMoney } from "@/lib/format";
import { useProject } from "@/lib/queries/projects";
import { useUrlFilters } from "@/lib/use-url-filters";

type Tab = "tasks" | "proposals" | "shares" | "report" | "settings";

export default function ProjectWorkspacePage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}

/**
 * One project and everything about it. Which tabs and buttons appear is
 * decided by the project's `_links`: the client sees proposals and share
 * links, the assigned specialist the timer actions, a stranger browsing the
 * marketplace only the tasks and the "submit a proposal" button.
 */
function Workspace() {
  const { id } = useParams<{ id: string }>();
  const { data: project, error, isPending, refetch } = useProject(id);
  const { values, set } = useUrlFilters(["tab"] as const);
  const [proposing, setProposing] = useState(false);

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (isPending) return <LoadingState rows={8} />;

  const links = project._links;
  const tabs: TabItem<Tab>[] = [{ value: "tasks", label: "Užduotys", icon: ListChecks }];
  if (links.proposals && project.origin === "MARKETPLACE") tabs.push({ value: "proposals", label: "Pasiūlymai", icon: Send });
  if (links.shares) tabs.push({ value: "shares", label: "Nuorodos", icon: Link2 });
  if (links.report) tabs.push({ value: "report", label: "Ataskaita", icon: FileText });
  if (links.update || links.delete) tabs.push({ value: "settings", label: "Nustatymai", icon: Settings });
  const tab = (tabs.some((t) => t.value === values.tab) ? values.tab : "tasks") as Tab;

  const direct = project.origin === "DIRECT";

  return (
    <div className="grid gap-7">
      <Link href="/app/projects" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Projektai
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-2.5">
          <div className="flex flex-wrap gap-2">
            <ProjectStatusBadge status={project.status} />
            <Badge>{direct ? "Tiesioginis" : "Aikštelė"}</Badge>
          </div>
          <h1 className="font-serif text-[clamp(30px,4.5vw,44px)] leading-[1.05]">
            <Scramble text={project.title} />
          </h1>
          <p className="text-sm text-muted">
            {direct ? project.externalClientName : <UserName id={project.clientId} link fallback="Užsakovas" />}
            {project.specialistId && (
              <>
                {" · vykdo "}
                <UserName id={project.specialistId} link fallback="specialistas" />
              </>
            )}
            {project.hourlyRate != null && ` · ${formatMoney(project.hourlyRate)}/val.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {links["submit-proposal"] && (
            <Button variant="hack" icon={Send} glitch onClick={() => setProposing(true)}>
              Pateikti pasiūlymą
            </Button>
          )}
          <StatusActions project={project} include={["publish", "complete"]} />
        </div>
      </header>

      <Tabs label="Projekto skiltys" items={tabs} value={tab} onChange={(v) => set({ tab: v === "tasks" ? null : v })} />

      <div role="tabpanel" className="min-w-0">
        {tab === "tasks" && <TasksTab project={project} />}
        {tab === "proposals" && <ProposalsTab project={project} />}
        {tab === "shares" && <SharesTab project={project} />}
        {tab === "report" && <ReportTab project={project} />}
        {tab === "settings" && <SettingsTab project={project} />}
      </div>

      {links["submit-proposal"] && <ProposalDialog projectId={project.id} open={proposing} onClose={() => setProposing(false)} />}
    </div>
  );
}
