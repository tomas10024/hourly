import type { Project } from "@hourly/shared";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Card, KeyValues } from "@/components/ui/card";
import { formatBudget, formatDate, formatMoney } from "@/lib/format";
import { UserName } from "./user-name";

/** A project in a grid (marketplace, my projects): status, title, who, money and time. */
export function ProjectCard({ project, href }: { project: Project; href: string }) {
  const direct = project.origin === "DIRECT";
  return (
    <Card hud className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={project.status} />
        {direct && <span className="label">tiesioginis</span>}
      </div>
      <h3 className="mt-3 mb-1 text-[17px] leading-snug font-semibold tracking-tight">
        <Link href={href} className="after:absolute after:inset-0">
          {project.title}
        </Link>
      </h3>
      <p className="text-sm text-muted">
        {direct ? project.externalClientName : <UserName id={project.clientId} fallback="Užsakovas" />}
      </p>
      <p className="mt-3 line-clamp-2 text-sm text-muted/90">{project.description}</p>
      <KeyValues
        className="my-4"
        rows={[
          direct ? ["Įkainis", project.hourlyRate ? `${formatMoney(project.hourlyRate)}/val.` : "—"] : ["Biudžetas", formatBudget(project.budgetMin, project.budgetMax)],
          ["Terminas", formatDate(project.deadline)],
        ]}
      />
      <div className="mt-auto flex items-center justify-between border-t border-border pt-3.5 text-[13px] text-muted">
        <span>Sukurta {formatDate(project.createdAt)}</span>
        <span className="inline-flex items-center gap-1.5 text-fg">
          Peržiūrėti <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </div>
    </Card>
  );
}
