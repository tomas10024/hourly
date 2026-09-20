import { z } from 'zod';
import { Id, Money, PageQuery } from './common.js';
import {
  ProjectOrigin,
  ProjectScope,
  ProjectStatus,
  ProposalStatus,
  Role,
  TaskAuthoring,
  TaskStatus,
} from './enums.js';

/* -------------------------------------------------------------------------- */
/* User and authentication                                                    */
/* -------------------------------------------------------------------------- */

export const PublicUser = z.object({
  id: Id,
  displayName: z.string(),
  role: Role,
  bio: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type PublicUser = z.infer<typeof PublicUser>;

export const CurrentUser = PublicUser.extend({
  email: z.email(),
  isBlocked: z.boolean(),
});
export type CurrentUser = z.infer<typeof CurrentUser>;

export const RegisterInput = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
  role: z.enum(['CLIENT', 'SPECIALIST']),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** The refresh token travels in an `httpOnly` cookie, so it is not here. */
export const AuthResponse = z.object({
  accessToken: z.string(),
  user: CurrentUser,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

/* -------------------------------------------------------------------------- */
/* Project                                                                    */
/* -------------------------------------------------------------------------- */

export const Project = z.object({
  id: Id,
  title: z.string(),
  description: z.string(),
  origin: ProjectOrigin,
  status: ProjectStatus,
  taskAuthoring: TaskAuthoring,
  budgetMin: Money.nullable(),
  budgetMax: Money.nullable(),
  hourlyRate: Money.nullable(),
  deadline: z.iso.datetime().nullable(),
  /** Name of a directly agreed client who has no account on the platform. */
  externalClientName: z.string().nullable(),
  clientId: Id.nullable(),
  specialistId: Id.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Project = z.infer<typeof Project>;

export const CreateProjectInput = z
  .object({
    title: z.string().min(3).max(150),
    description: z.string().min(10).max(10_000),
    origin: ProjectOrigin.default('MARKETPLACE'),
    taskAuthoring: TaskAuthoring.default('CLIENT'),
    budgetMin: Money.nullish(),
    budgetMax: Money.nullish(),
    hourlyRate: Money.nullish(),
    deadline: z.iso.datetime().nullish(),
    externalClientName: z.string().min(2).max(150).nullish(),
  })
  .refine(
    (v) => v.budgetMin == null || v.budgetMax == null || v.budgetMin <= v.budgetMax,
    { message: 'budgetMin must not be greater than budgetMax', path: ['budgetMin'] },
  )
  .refine((v) => v.origin !== 'DIRECT' || v.externalClientName != null, {
    message: 'Directly agreed work requires a client name',
    path: ['externalClientName'],
  });
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(10).max(10_000).optional(),
  status: ProjectStatus.optional(),
  budgetMin: Money.nullish(),
  budgetMax: Money.nullish(),
  hourlyRate: Money.nullish(),
  deadline: z.iso.datetime().nullish(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export const ProjectListQuery = PageQuery.extend({
  scope: ProjectScope.default('marketplace'),
  q: z.string().max(150).optional(),
  status: ProjectStatus.optional(),
});
export type ProjectListQuery = z.infer<typeof ProjectListQuery>;

/* -------------------------------------------------------------------------- */
/* Task                                                                       */
/* -------------------------------------------------------------------------- */

export const Task = z.object({
  id: Id,
  projectId: Id,
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatus,
  position: z.number().int(),
  /** Overrides the project rate; null means it is inherited from the project. */
  hourlyRate: Money.nullable(),
  estimatedHours: z.number().nonnegative().nullable(),
  approvedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Task = z.infer<typeof Task>;

export const CreateTaskInput = z.object({
  projectId: Id,
  title: z.string().min(3).max(150),
  description: z.string().max(5000).nullish(),
  hourlyRate: Money.nullish(),
  estimatedHours: z.number().nonnegative().max(10_000).nullish(),
  position: z.number().int().min(0).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = CreateTaskInput.omit({ projectId: true })
  .partial()
  .extend({
    status: TaskStatus.optional(),
    /**
     * Client approval of a task authored by the specialist.
     * `true` stamps `approvedAt`, `false` clears it.
     */
    approved: z.boolean().optional(),
  });
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

/* -------------------------------------------------------------------------- */
/* Work session                                                               */
/* -------------------------------------------------------------------------- */

export const WorkSession = z.object({
  id: Id,
  taskId: Id,
  specialistId: Id,
  startedAt: z.iso.datetime(),
  /** null means the session is still running (only one is allowed at a time). */
  endedAt: z.iso.datetime().nullable(),
  durationMinutes: z.number().int().nonnegative().nullable(),
  comment: z.string().nullable(),
  /** The rate in force during the session (task rate or project rate). */
  appliedRate: Money.nullable(),
  createdAt: z.iso.datetime(),
});
export type WorkSession = z.infer<typeof WorkSession>;

/** Manual session entry: both start and end are supplied. */
export const CreateWorkSessionInput = z
  .object({
    taskId: Id,
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime().nullish(),
    comment: z.string().max(2000).nullish(),
  })
  .refine((v) => v.endedAt == null || new Date(v.endedAt) > new Date(v.startedAt), {
    message: 'End time must be later than the start time',
    path: ['endedAt'],
  });
export type CreateWorkSessionInput = z.infer<typeof CreateWorkSessionInput>;

export const UpdateWorkSessionInput = z.object({
  startedAt: z.iso.datetime().optional(),
  endedAt: z.iso.datetime().nullish(),
  comment: z.string().max(2000).nullish(),
});
export type UpdateWorkSessionInput = z.infer<typeof UpdateWorkSessionInput>;

/* -------------------------------------------------------------------------- */
/* Proposal                                                                   */
/* -------------------------------------------------------------------------- */

export const Proposal = z.object({
  id: Id,
  projectId: Id,
  specialistId: Id,
  price: Money.nullable(),
  hourlyRate: Money.nullable(),
  estimatedDays: z.number().int().positive().nullable(),
  message: z.string().nullable(),
  status: ProposalStatus,
  createdAt: z.iso.datetime(),
});
export type Proposal = z.infer<typeof Proposal>;

export const CreateProposalInput = z
  .object({
    price: Money.nullish(),
    hourlyRate: Money.nullish(),
    estimatedDays: z.number().int().positive().max(3650).nullish(),
    message: z.string().max(5000).nullish(),
  })
  .refine((v) => v.price != null || v.hourlyRate != null, {
    message: 'Provide at least a price or an hourly rate',
    path: ['price'],
  });
export type CreateProposalInput = z.infer<typeof CreateProposalInput>;

export const UpdateProposalInput = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'WITHDRAWN']),
});
export type UpdateProposalInput = z.infer<typeof UpdateProposalInput>;

/* -------------------------------------------------------------------------- */
/* Share link (capability token)                                              */
/* -------------------------------------------------------------------------- */

export const ShareLink = z.object({
  id: Id,
  projectId: Id,
  expiresAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().nullable(),
  lastViewedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ShareLink = z.infer<typeof ShareLink>;

/** The token is returned only on creation - the database stores its hash. */
export const ShareLinkCreated = ShareLink.extend({
  token: z.string(),
  url: z.url(),
});
export type ShareLinkCreated = z.infer<typeof ShareLinkCreated>;

export const CreateShareLinkInput = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(30),
});
export type CreateShareLinkInput = z.infer<typeof CreateShareLinkInput>;

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

export const ReportTaskLine = z.object({
  taskId: Id,
  title: z.string(),
  status: TaskStatus,
  totalMinutes: z.number().int().nonnegative(),
  appliedRate: Money.nullable(),
  amount: Money,
});
export type ReportTaskLine = z.infer<typeof ReportTaskLine>;

export const ProjectReport = z.object({
  project: Project.pick({ id: true, title: true, status: true, hourlyRate: true }),
  generatedAt: z.iso.datetime(),
  lines: z.array(ReportTaskLine),
  totalMinutes: z.number().int().nonnegative(),
  totalAmount: Money,
});
export type ProjectReport = z.infer<typeof ProjectReport>;

/** Read-only view reachable through a share link. */
export const PublicProjectView = z.object({
  project: Project.pick({
    id: true,
    title: true,
    description: true,
    status: true,
    externalClientName: true,
  }),
  tasks: z.array(ReportTaskLine),
  totalMinutes: z.number().int().nonnegative(),
  totalAmount: Money,
  expiresAt: z.iso.datetime(),
});
export type PublicProjectView = z.infer<typeof PublicProjectView>;
