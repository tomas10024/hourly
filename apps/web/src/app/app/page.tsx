"use client";

import { ArrowRight, FolderPlus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProjectCard } from "@/components/domain/project-card";
import { SessionList } from "@/components/domain/session-list";
import { TimerCard } from "@/components/domain/timer-card";
import { LoadingState, PageHeader } from "@/components/layout/states";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Scramble } from "@/components/ui/scramble";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { formatDuration, formatMoney, sessionAmount } from "@/lib/format";
import { useProjects } from "@/lib/queries/projects";
import { useMySessions } from "@/lib/queries/sessions";
import { useMyTasks } from "@/lib/queries/tasks";
import { useUsers } from "@/lib/queries/users";

/** Monday 00:00 of the current week, local time. */
function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString();
}

function Stat({ label, value, hint, href }: { label: string; value: string | undefined; hint?: string; href?: string }) {
  const body = (
    <Card hud={!!href} className="grid h-full gap-1">
      <span className="label">{label}</span>
      {value === undefined ? <Skeleton className="mt-1 h-8 w-28" /> : <span className="font-mono text-[28px] leading-tight"><Scramble text={value} /></span>}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

function Section({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            Visi <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** The first screen after signing in, different for each role. */
export default function OverviewPage() {
  const { user } = useAuth();
  const first = user?.displayName.split(" ")[0] ?? "";
  return (
    <div className="grid gap-9">
      <PageHeader label="apžvalga" title={`Sveiki, ${first}`} />
      {user?.role === "SPECIALIST" && <SpecialistOverview />}
      {user?.role === "CLIENT" && <ClientOverview />}
      {user?.role === "ADMIN" && <AdminOverview />}
    </div>
  );
}

function SpecialistOverview() {
  const week = useMySessions({ from: weekStart(), perPage: 100 });
  const recent = useMySessions({ perPage: 5 });
  const active = useProjects({ scope: "assigned", status: "IN_PROGRESS", perPage: 1 });
  const tasks = useMyTasks({ perPage: 100 });
  const taskTitle = new Map(tasks.data?.items.map((t) => [t.id, t.title]));

  const minutes = week.data?.items.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const amount = week.data?.items.reduce((sum, s) => sum + (sessionAmount(s) ?? 0), 0);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <TimerCard />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <Stat label="Šią savaitę" value={minutes === undefined ? undefined : formatDuration(minutes)} hint="Nuo pirmadienio" />
          <Stat label="Uždarbis per savaitę" value={amount === undefined ? undefined : formatMoney(amount)} />
          <Stat label="Vykdomi projektai" value={active.data?.total.toString()} href="/app/projects?status=IN_PROGRESS" />
        </div>
      </div>
      <Section title="Paskutinės sesijos" href="/app/sessions">
        <Card className="p-3 md:p-4">
          {recent.isPending ? (
            <LoadingState rows={3} />
          ) : (
            <SessionList
              sessions={recent.data?.items ?? []}
              extraColumns={[{ key: "task", header: "Užduotis", cell: (row) => taskTitle.get(row.taskId) ?? "…" }]}
              empty={<EmptyState art="clock" title="Dar nėra darbo sesijų">Pradėkite laikmatį prie užduoties.</EmptyState>}
            />
          )}
        </Card>
      </Section>
    </>
  );
}

function ClientOverview() {
  const all = useProjects({ scope: "owned", perPage: 3 });
  const published = useProjects({ scope: "owned", status: "PUBLISHED", perPage: 1 });
  const running = useProjects({ scope: "owned", status: "IN_PROGRESS", perPage: 1 });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Visi projektai" value={all.data?.total.toString()} href="/app/projects" />
        <Stat label="Laukia pasiūlymų" value={published.data?.total.toString()} hint="Paskelbti aikštelėje" href="/app/projects?status=PUBLISHED" />
        <Stat label="Vykdomi" value={running.data?.total.toString()} href="/app/projects?status=IN_PROGRESS" />
      </div>
      <Section title="Naujausi projektai" href="/app/projects">
        {all.isPending ? (
          <LoadingState rows={3} />
        ) : all.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {all.data.items.map((p) => (
              <ProjectCard key={p.id} project={p} href={`/app/projects/${p.id}`} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              art="folder"
              title="Projektų dar nėra"
              action={
                <ButtonLink href="/app/projects" variant="hack" icon={FolderPlus}>
                  Sukurti projektą
                </ButtonLink>
              }
            >
              Aprašykite darbą, biudžetą ir terminą – specialistai pateiks pasiūlymus.
            </EmptyState>
          </Card>
        )}
      </Section>
    </>
  );
}

function AdminOverview() {
  const users = useUsers({ perPage: 1 });
  const blocked = useUsers({ isBlocked: true, perPage: 1 });
  const projects = useProjects({ scope: "all", perPage: 1 });
  const running = useProjects({ scope: "all", status: "IN_PROGRESS", perPage: 1 });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Naudotojai" value={users.data?.total.toString()} href="/app/admin/users" />
        <Stat label="Užblokuoti" value={blocked.data?.total.toString()} href="/app/admin/users?blocked=true" />
        <Stat label="Projektai" value={projects.data?.total.toString()} href="/app/admin/projects" />
        <Stat label="Vykdomi projektai" value={running.data?.total.toString()} href="/app/admin/projects?status=IN_PROGRESS" />
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">Moderavimas: blokuokite pažeidėjus, šalinkite netinkamus projektus, peržiūrėkite bet kurio projekto istoriją.</p>
        <ButtonLink href="/app/admin/users" variant="secondary" icon={Users}>
          Naudotojai
        </ButtonLink>
      </Card>
    </>
  );
}
