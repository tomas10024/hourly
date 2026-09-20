import type {
  Project as ProjectRow,
  Proposal as ProposalRow,
  ShareLink as ShareLinkRow,
  Task as TaskRow,
  User as UserRow,
  WorkSession as WorkSessionRow,
} from '../generated/prisma/client.js';
import type {
  CurrentUser,
  Project,
  Proposal,
  PublicUser,
  ShareLink,
  Task,
  WorkSession,
} from '@valandine/shared';

/**
 * Translation of database rows into response payloads.
 *
 * Prisma returns `Decimal` objects for money and `Date` objects for time,
 * while the `@valandine/shared` schemas - the same ones the OpenAPI document
 * is generated from - expect `number` and an ISO 8601 string. Without this
 * layer the responses would not match their own documentation.
 *
 * The second job of this layer is security: it spells out which fields ever
 * leave the server. Anything not listed here (`passwordHash`, `tokenHash`)
 * cannot slip out by accident.
 */

/** Only what we need from `Decimal`; avoids depending on Prisma internals. */
type DecimalLike = { toFixed(decimalPlaces: number): string };

/**
 * Money: `Decimal` -> `number` with two decimal places.
 *
 * The database stores `Decimal` because floats are unfit for money
 * (0.1 + 0.2 !== 0.3). JSON carries a `number`, as declared by the `Money`
 * schema.
 */
export function money(value: DecimalLike | null): number | null {
  return value === null ? null : Number(value.toFixed(2));
}

/** Time: `Date` -> ISO 8601 string (`2026-09-20T12:00:00.000Z`). */
export function iso(value: Date): string;
export function iso(value: Date | null): string | null;
export function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/** Non-monetary decimals (e.g. estimated hours) - no rounding to cents. */
function decimal(value: DecimalLike | null): number | null {
  return value === null ? null : Number(value.toFixed(4));
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    origin: row.origin,
    status: row.status,
    taskAuthoring: row.taskAuthoring,
    budgetMin: money(row.budgetMin),
    budgetMax: money(row.budgetMax),
    hourlyRate: money(row.hourlyRate),
    deadline: iso(row.deadline),
    externalClientName: row.externalClientName,
    clientId: row.clientId,
    specialistId: row.specialistId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    position: row.position,
    hourlyRate: money(row.hourlyRate),
    estimatedHours: decimal(row.estimatedHours),
    approvedAt: iso(row.approvedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function toSession(row: WorkSessionRow): WorkSession {
  return {
    id: row.id,
    taskId: row.taskId,
    specialistId: row.specialistId,
    startedAt: iso(row.startedAt),
    endedAt: iso(row.endedAt),
    durationMinutes: row.durationMinutes,
    comment: row.comment,
    appliedRate: money(row.appliedRate),
    createdAt: iso(row.createdAt),
  };
}

export function toProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    projectId: row.projectId,
    specialistId: row.specialistId,
    price: money(row.price),
    hourlyRate: money(row.hourlyRate),
    estimatedDays: row.estimatedDays,
    message: row.message,
    status: row.status,
    createdAt: iso(row.createdAt),
  };
}

/**
 * A share link WITHOUT its `tokenHash`.
 *
 * The hash never leaves the server: the token itself is shown exactly once,
 * when the link is created (`ShareLinkCreated`); afterwards the link can only
 * be listed or revoked.
 */
export function toShareLink(row: ShareLinkRow): ShareLink {
  return {
    id: row.id,
    projectId: row.projectId,
    expiresAt: iso(row.expiresAt),
    revokedAt: iso(row.revokedAt),
    lastViewedAt: iso(row.lastViewedAt),
    createdAt: iso(row.createdAt),
  };
}

/** Public profile: no email address and no password hash. */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    displayName: row.displayName,
    role: row.role,
    bio: row.bio,
    createdAt: iso(row.createdAt),
  };
}

/** Own account details: the email address is visible only to its owner. */
export function toCurrentUser(row: UserRow): CurrentUser {
  return {
    ...toPublicUser(row),
    email: row.email,
    isBlocked: row.isBlocked,
  };
}
