import { z } from 'zod';
import { prisma } from './prisma.js';
import { HttpError } from '../middleware/error.js';

/**
 * Scoping through the URL.
 *
 * Everything below a project is addressed through it:
 *
 *   /projects/{projectId}/tasks/{taskId}/sessions/{sessionId}
 *
 * Each identifier is looked up WITHIN its parent, so a task of project A
 * requested under project B does not exist at that address and answers 404 -
 * neither 403 (nothing is being refused, there is simply nothing there) nor
 * 422 (the address is well formed). The lookups run from the outside in, so
 * the 404 names the first identifier that does not fit.
 *
 * Only existence is decided here. Whether the caller may see or change what
 * was found is still the job of `services/access.ts`, called by the route.
 */

export const ProjectParams = z.object({ projectId: z.uuid() });
export const TaskParams = ProjectParams.extend({ taskId: z.uuid() });
export const SessionParams = TaskParams.extend({ sessionId: z.uuid() });
export const ProposalParams = ProjectParams.extend({ proposalId: z.uuid() });
export const ShareParams = ProjectParams.extend({ shareId: z.uuid() });

type ProjectParams = z.infer<typeof ProjectParams>;
type TaskParams = z.infer<typeof TaskParams>;
type SessionParams = z.infer<typeof SessionParams>;
type ProposalParams = z.infer<typeof ProposalParams>;
type ShareParams = z.infer<typeof ShareParams>;

export async function findProjectOr404({ projectId }: ProjectParams) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${projectId} does not exist`);
  }
  return project;
}

/**
 * A task of the given project, with the project loaded - every permission
 * check and every rule about tasks is really a question about the project.
 *
 * The happy path is a single query; only a miss asks which level was wrong.
 */
export async function findTaskOr404({ projectId, taskId }: TaskParams) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: { project: true },
  });
  if (!task) {
    await findProjectOr404({ projectId });
    throw new HttpError(404, 'NOT_FOUND', `Task ${taskId} does not exist in project ${projectId}`);
  }
  return task;
}

/** A work session of the given task of the given project, with both parents. */
export async function findSessionOr404({ projectId, taskId, sessionId }: SessionParams) {
  const session = await prisma.workSession.findFirst({
    where: { id: sessionId, taskId, task: { projectId } },
    include: { task: { include: { project: true } } },
  });
  if (!session) {
    await findTaskOr404({ projectId, taskId });
    throw new HttpError(
      404,
      'NOT_FOUND',
      `Work session ${sessionId} does not exist in task ${taskId}`,
    );
  }
  return session;
}

export async function findProposalOr404({ projectId, proposalId }: ProposalParams) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, projectId },
    include: { project: true },
  });
  if (!proposal) {
    await findProjectOr404({ projectId });
    throw new HttpError(
      404,
      'NOT_FOUND',
      `Proposal ${proposalId} does not exist in project ${projectId}`,
    );
  }
  return proposal;
}

export async function findShareOr404({ projectId, shareId }: ShareParams) {
  const link = await prisma.shareLink.findFirst({
    where: { id: shareId, projectId },
    include: { project: true },
  });
  if (!link) {
    await findProjectOr404({ projectId });
    throw new HttpError(
      404,
      'NOT_FOUND',
      `Share link ${shareId} does not exist in project ${projectId}`,
    );
  }
  return link;
}
