import { Router } from 'express';
import { z } from 'zod';
import { CreateWorkSessionInput, UpdateWorkSessionInput } from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, viewer } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { SessionParams, TaskParams, findSessionOr404, findTaskOr404 } from '../lib/scope.js';
import { money, toSession } from '../lib/serialize.js';
import { parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import { assertCanInspectProject, assertCanViewProject } from '../services/access.js';
import {
  assertChronology,
  assertIsAssignedSpecialist,
  assertIsSessionAuthor,
  assertNotInFuture,
  assertProjectAcceptsWork,
  durationMinutes,
  resolveAppliedRate,
} from '../services/sessions.js';

export const sessionsRouter: Router = Router();

const SessionListQuery = z.object({ taskId: z.uuid().optional() });

/** Newest first: the work log is read from the most recent entry backwards. */
const SESSION_ORDER: Prisma.WorkSessionOrderByWithRelationInput = { startedAt: 'desc' };

/** What `toSession` needs besides the row itself: the project of the task. */
const WITH_PROJECT_ID = { task: { select: { projectId: true } } } as const;

/**
 * At most one running session per specialist.
 *
 * The database enforces this with a partial unique index
 * (`work_sessions_one_open_per_specialist`), which is the real guarantee and
 * holds even against two simultaneous requests. This check runs first only to
 * answer with a useful message instead of a bare constraint violation.
 */
async function assertNoOtherRunningSession(specialistId: string, exceptId?: string) {
  const running = await prisma.workSession.findFirst({
    where: {
      specialistId,
      endedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    include: WITH_PROJECT_ID,
  });

  if (running) {
    throw new HttpError(409, 'SESSION_ALREADY_RUNNING', 'You already have a running work session', {
      sessionId: running.id,
      taskId: running.taskId,
      projectId: running.task.projectId,
      startedAt: running.startedAt.toISOString(),
    });
  }
}

/**
 * GET /sessions - the actor's own work log.
 *
 * Not a second address of the sessions but a personal view across all
 * projects: a work log is personal, so it is scoped to the actor rather than
 * to everything readable. `?taskId=` narrows it to one task. Every entry
 * carries `projectId` and `taskId`, which together give its address.
 */
sessionsRouter.get('/sessions', async (req, res) => {
  const actor = requireActor(req);
  const { taskId } = parseQuery(SessionListQuery, req);

  const rows = await prisma.workSession.findMany({
    where: { specialistId: actor, ...(taskId ? { taskId } : {}) },
    include: WITH_PROJECT_ID,
    orderBy: SESSION_ORDER,
  });

  res.json(rows.map(toSession));
});

/**
 * GET /projects/{projectId}/tasks/{taskId}/sessions - the full hierarchy:
 * project -> task -> work sessions.
 *
 * A missing project or a task of another project answers 404, which is not
 * the same as an empty list. Logged hours are for the parties of the project
 * and, to settle a dispute, the administrator.
 */
sessionsRouter.get('/projects/:projectId/tasks/:taskId/sessions', async (req, res) => {
  const task = await findTaskOr404(parseParams(TaskParams, req));
  assertCanInspectProject(task.project, viewer(req));

  const rows = await prisma.workSession.findMany({
    where: { taskId: task.id },
    include: WITH_PROJECT_ID,
    orderBy: SESSION_ORDER,
  });
  res.json(rows.map(toSession));
});

/**
 * GET /projects/{projectId}/tasks/{taskId}/sessions/{sessionId} - a single
 * work session; same audience as the task's log.
 */
sessionsRouter.get('/projects/:projectId/tasks/:taskId/sessions/:sessionId', async (req, res) => {
  const session = await findSessionOr404(parseParams(SessionParams, req));
  assertCanInspectProject(session.task.project, viewer(req));

  res.json(toSession(session));
});

/**
 * POST /projects/{projectId}/tasks/{taskId}/sessions - start a session or
 * enter a finished one by hand.
 *
 * Both cases share one endpoint because they create the same resource; the
 * only difference is whether `endedAt` is known yet. Note what the client
 * cannot send: neither the duration nor the rate, because those are exactly
 * the numbers the whole system is supposed to make trustworthy.
 */
sessionsRouter.post('/projects/:projectId/tasks/:taskId/sessions', async (req, res) => {
  const params = parseParams(TaskParams, req);
  const actor = requireActor(req);
  const input = parseBody(CreateWorkSessionInput, req);

  const task = await findTaskOr404(params);
  assertCanViewProject(task.project, viewer(req));
  assertProjectAcceptsWork(task.project);
  assertIsAssignedSpecialist(task.project, actor);

  const startedAt = new Date(input.startedAt);
  const endedAt = input.endedAt ? new Date(input.endedAt) : null;

  assertNotInFuture(startedAt, 'startedAt');
  if (endedAt) assertNotInFuture(endedAt, 'endedAt');
  assertChronology(startedAt, endedAt);

  if (endedAt === null) await assertNoOtherRunningSession(actor);

  const row = await prisma.workSession.create({
    data: {
      taskId: task.id,
      specialistId: actor,
      startedAt,
      endedAt,
      comment: input.comment ?? null,
      // Both are filled in only once the session is over: a running session
      // has no duration yet, and its rate is fixed at the moment it ends.
      durationMinutes: endedAt ? durationMinutes(startedAt, endedAt) : null,
      appliedRate: endedAt
        ? resolveAppliedRate(money(task.hourlyRate), money(task.project.hourlyRate))
        : null,
    },
    include: WITH_PROJECT_ID,
  });

  created(
    res,
    `/api/projects/${task.projectId}/tasks/${task.id}/sessions/${row.id}`,
    toSession(row),
  );
});

/**
 * PATCH /projects/{projectId}/tasks/{taskId}/sessions/{sessionId} - correct a
 * session or stop the running one.
 *
 * Stopping the timer is an ordinary update: sending `endedAt` closes the
 * session, and the server then measures the duration and locks in the rate.
 */
sessionsRouter.patch(
  '/projects/:projectId/tasks/:taskId/sessions/:sessionId',
  async (req, res) => {
    const params = parseParams(SessionParams, req);
    const actor = requireActor(req);
    const input = parseBody(UpdateWorkSessionInput, req);

    const session = await findSessionOr404(params);
    assertCanViewProject(session.task.project, viewer(req));
    assertIsSessionAuthor(session, actor);
    assertProjectAcceptsWork(session.task.project);

    // The checks run on the merged values: whatever the request leaves out
    // keeps the value already stored.
    const startedAt =
      input.startedAt !== undefined ? new Date(input.startedAt) : session.startedAt;
    const endedAt =
      input.endedAt === undefined
        ? session.endedAt
        : input.endedAt === null
          ? null
          : new Date(input.endedAt);

    assertNotInFuture(startedAt, 'startedAt');
    if (endedAt) assertNotInFuture(endedAt, 'endedAt');
    assertChronology(startedAt, endedAt);

    // Reopening a finished session would give the specialist a second running
    // one, which the partial unique index forbids.
    if (endedAt === null && session.endedAt !== null) {
      await assertNoOtherRunningSession(actor, session.id);
    }

    const data: Prisma.WorkSessionUpdateInput = {};
    if (input.comment !== undefined) data.comment = input.comment;

    if (input.startedAt !== undefined || input.endedAt !== undefined) {
      data.startedAt = startedAt;
      data.endedAt = endedAt;
      data.durationMinutes = endedAt ? durationMinutes(startedAt, endedAt) : null;

      // The rate is locked in once, when the session first ends. Correcting the
      // timestamps afterwards must not reprice work at today's rate.
      if (endedAt !== null && session.appliedRate === null) {
        data.appliedRate = resolveAppliedRate(
          money(session.task.hourlyRate),
          money(session.task.project.hourlyRate),
        );
      }
    }

    const row = await prisma.workSession.update({
      where: { id: session.id },
      data,
      include: WITH_PROJECT_ID,
    });
    res.json(toSession(row));
  },
);

/**
 * DELETE /projects/{projectId}/tasks/{taskId}/sessions/{sessionId} - remove an
 * entry from the work log.
 */
sessionsRouter.delete(
  '/projects/:projectId/tasks/:taskId/sessions/:sessionId',
  async (req, res) => {
    const params = parseParams(SessionParams, req);
    const actor = requireActor(req);

    const session = await findSessionOr404(params);
    assertCanViewProject(session.task.project, viewer(req));
    assertIsSessionAuthor(session, actor);
    assertProjectAcceptsWork(session.task.project);

    await prisma.workSession.delete({ where: { id: session.id } });
    noContent(res);
  },
);
