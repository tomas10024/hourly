import { z } from 'zod';

/** Naudotojo rolė platformoje. */
export const Role = z.enum(['CLIENT', 'SPECIALIST', 'ADMIN']);
export type Role = z.infer<typeof Role>;

/**
 * Projekto kilmė: paskelbtas aikštelėje (su pasiūlymų etapu)
 * arba tiesiogiai sutartas darbas, kurį susikuria pats specialistas.
 */
export const ProjectOrigin = z.enum(['MARKETPLACE', 'DIRECT']);
export type ProjectOrigin = z.infer<typeof ProjectOrigin>;

/** Kas sudaro projekto užduočių sąrašą. */
export const TaskAuthoring = z.enum(['CLIENT', 'SPECIALIST']);
export type TaskAuthoring = z.infer<typeof TaskAuthoring>;

/** Projekto gyvavimo ciklo būsena. */
export const ProjectStatus = z.enum([
  'DRAFT',
  'PUBLISHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

/** Užduoties būsena. */
export const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatus>;

/** Pasiūlymo būsena. */
export const ProposalStatus = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

/** Projektų sąrašo atrankos kriterijus (`GET /projects?scope=...`). */
export const ProjectScope = z.enum(['marketplace', 'owned', 'assigned']);
export type ProjectScope = z.infer<typeof ProjectScope>;
