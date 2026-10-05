import type {
  ProjectStatus,
  ProposalStatus,
  Role,
  TaskStatus,
} from "@hourly/shared";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type Tone = "neutral" | "data" | "hack" | "ok" | "bad" | "warn";

const tones: Record<Tone, string> = {
  neutral: "[--b:var(--color-muted)]",
  data: "[--b:var(--color-data)]",
  hack: "[--b:var(--color-hack)]",
  ok: "[--b:var(--color-ok)]",
  bad: "[--b:var(--color-bad)]",
  warn: "[--b:var(--color-warn)]",
};

/**
 * Status pill in the Resend style: 10 % tinted fill, 30 % border, full-colour
 * text, all derived from one colour so the tones stay consistent.
 */
export function Badge({
  tone = "neutral",
  live,
  children,
  className,
}: {
  tone?: Tone;
  /** A breathing dot in front - something is happening right now. */
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-[7px] border px-2 text-xs font-medium whitespace-nowrap",
        "border-[color-mix(in_srgb,var(--b)_30%,transparent)] bg-[color-mix(in_srgb,var(--b)_10%,transparent)] text-(--b)",
        tones[tone],
        className,
      )}
    >
      {live && <span aria-hidden className="dot-live size-[7px] rounded-full bg-current" />}
      {children}
    </span>
  );
}

const projectStatus: Record<ProjectStatus, [string, Tone]> = {
  DRAFT: ["Juodraštis", "neutral"],
  PUBLISHED: ["Paskelbtas", "data"],
  IN_PROGRESS: ["Vykdomas", "hack"],
  COMPLETED: ["Užbaigtas", "ok"],
  CANCELLED: ["Atšauktas", "bad"],
};

const taskStatus: Record<TaskStatus, [string, Tone]> = {
  TODO: ["Laukia", "neutral"],
  IN_PROGRESS: ["Vykdoma", "hack"],
  BLOCKED: ["Užblokuota", "warn"],
  DONE: ["Atlikta", "ok"],
};

const proposalStatus: Record<ProposalStatus, [string, Tone]> = {
  PENDING: ["Laukia", "data"],
  ACCEPTED: ["Priimtas", "ok"],
  REJECTED: ["Atmestas", "bad"],
  WITHDRAWN: ["Atsiimtas", "neutral"],
};

export const statusLabel = {
  project: (status: ProjectStatus) => projectStatus[status][0],
  task: (status: TaskStatus) => taskStatus[status][0],
  proposal: (status: ProposalStatus) => proposalStatus[status][0],
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const [label, tone] = projectStatus[status];
  return (
    <Badge tone={tone} live={status === "IN_PROGRESS"}>
      {label}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const [label, tone] = taskStatus[status];
  return (
    <Badge tone={tone} live={status === "IN_PROGRESS"}>
      {label}
    </Badge>
  );
}

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const [label, tone] = proposalStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const roles: Record<Role, [string, string, string]> = {
  // label, background, tilt
  SPECIALIST: ["Specialistas", "bg-hack", "-rotate-2"],
  CLIENT: ["Užsakovas", "bg-data", "rotate-[1.5deg]"],
  ADMIN: ["Admin", "bg-warn", "-rotate-1"],
};

export const roleLabel = (role: Role) => roles[role][0];

/**
 * Role "sticker" - the one playful Watch Dogs 2 element: solid colour, pixel
 * type, a slight tilt and a hard white shadow.
 */
export function RoleSticker({ role, className }: { role: Role; className?: string }) {
  const [label, background, tilt] = roles[role];
  return (
    <span
      className={cx(
        "inline-block px-2 pt-[5px] pb-1 font-pixel text-[11px] leading-none tracking-[0.06em] text-on-accent uppercase",
        "shadow-[2px_2px_0_rgb(255_255_255/0.9)]",
        background,
        tilt,
        className,
      )}
    >
      {label}
    </span>
  );
}
