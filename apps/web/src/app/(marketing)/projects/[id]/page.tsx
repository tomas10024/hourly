"use client";

import { ArrowLeft, LogIn, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProjectTasksList } from "@/components/domain/project-tasks-list";
import { ProposalDialog } from "@/components/domain/proposal-dialog";
import { UserName } from "@/components/domain/user-name";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { Scramble } from "@/components/ui/scramble";
import { useAuth } from "@/lib/auth";
import { formatBudget, formatDate } from "@/lib/format";
import { useProject } from "@/lib/queries/projects";

/** A published project as anyone sees it, and the place to bid on it. */
export default function PublicProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { status, user } = useAuth();
  const { data: project, error, isPending, refetch } = useProject(id);
  const [proposing, setProposing] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-[clamp(16px,4vw,32px)] py-12">
      <Link href="/projects" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Aikštelė
      </Link>

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : isPending ? (
        <LoadingState rows={6} />
      ) : (
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
          <article className="grid min-w-0 gap-6">
            <div className="grid gap-3">
              <ProjectStatusBadge status={project.status} />
              <h1 className="heading-display text-[clamp(36px,5.5vw,60px)] leading-[1.02]">
                <Scramble text={project.title} />
              </h1>
              <p className="text-sm text-muted">
                <UserName id={project.clientId} fallback={project.externalClientName ?? "Užsakovas"} /> · paskelbta{" "}
                {formatDate(project.updatedAt)}
              </p>
            </div>
            <p className="max-w-[68ch] leading-relaxed whitespace-pre-line">{project.description}</p>
            <section className="grid gap-3">
              <h2 className="label">{"// užduotys"}</h2>
              <ProjectTasksList projectId={project.id} />
            </section>
          </article>

          <Card hud className="grid gap-5 md:sticky md:top-24">
            <KeyValues
              rows={[
                ["Biudžetas", formatBudget(project.budgetMin, project.budgetMax)],
                ["Terminas", formatDate(project.deadline)],
                ["Užduotis sudaro", project.taskAuthoring === "CLIENT" ? "užsakovas" : "specialistas"],
              ]}
            />
            {project._links["submit-proposal"] ? (
              <Button variant="hack" icon={Send} glitch onClick={() => setProposing(true)} className="w-full">
                Pateikti pasiūlymą
              </Button>
            ) : status !== "authenticated" ? (
              <ButtonLink href={`/login?next=/projects/${project.id}`} variant="secondary" icon={LogIn} className="w-full">
                Prisijunkite, kad pasiūlytumėte
              </ButtonLink>
            ) : (
              <p className="text-[13px] text-muted">
                {user?.role === "SPECIALIST"
                  ? "Pasiūlymą šiam projektui jau pateikėte arba jis pasiūlymų nebepriima."
                  : "Pasiūlymus teikia specialistai."}
              </p>
            )}
          </Card>
        </div>
      )}

      {project && <ProposalDialog projectId={project.id} open={proposing} onClose={() => setProposing(false)} />}
    </div>
  );
}
