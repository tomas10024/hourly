import { z } from 'zod';

/** A user role on the platform. */
export const Role = z.enum(['CLIENT', 'SPECIALIST', 'ADMIN']);
export type Role = z.infer<typeof Role>;

/**
 * Where the project came from: published on the marketplace (with a proposal
 * stage) or work agreed directly and created by the specialist.
 */
export const ProjectOrigin = z.enum(['MARKETPLACE', 'DIRECT']);
export type ProjectOrigin = z.infer<typeof ProjectOrigin>;

/** Who authors the project task list. */
export const TaskAuthoring = z.enum(['CLIENT', 'SPECIALIST']);
export type TaskAuthoring = z.infer<typeof TaskAuthoring>;

/** Project lifecycle status. */
export const ProjectStatus = z.enum([
  'DRAFT',
  'PUBLISHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

/** Task status. */
export const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatus>;

/** Proposal status. */
export const ProposalStatus = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

/** Selection criterion for the project list (`GET /projects?scope=...`). */
export const ProjectScope = z.enum(['marketplace', 'owned', 'assigned']);
export type ProjectScope = z.infer<typeof ProjectScope>;
