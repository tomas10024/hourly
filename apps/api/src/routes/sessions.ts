import { Router } from 'express';
import { z } from 'zod';
import { CreateWorkSessionInput, UpdateWorkSessionInput } from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { money, toSession } from '../lib/serialize.js';
import { IdParam, parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
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

/** A session always carries its task and project - every rule needs them. */
async function findSessionOr404(id: string) {
  const session = await prisma.workSession.findUnique({
    where: { id },
    include: { task: { include: { project: true } } },
  });
  if (!session) {
    throw new HttpError(404, 'NOT_FOUND', `Work session ${id} does not exist`);
  }
  return session;
}

/** The task a session is being attached to; 422 because it came from the body. */
async function findReferencedTaskOr422(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) {
    throw new HttpError(422, 'INVALID_REFERENCE', `Task ${taskId} does not exist`, {
      field: 'taskId',
    });
  }
  return task;
}

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
  });

  if (running) {
    throw new HttpError(409, 'SESSION_ALREADY_RUNNING', 'You already have a running work session', {
      sessionId: running.id,
      taskId: running.taskId,
      startedAt: running.startedAt.toISOString(),
    });
  }
}

/**
 * GET /sessions - the actor's own work log.
 *
 * Scoped to the actor rather than to everything readable, because a work log
 * is personal; `?taskId=` narrows it to one task.
 */
sessionsRouter.get('/sessions', async (req, res) => {
  const actor = requireActor(req);
  const { taskId } = parseQuery(SessionListQuery, req);

  const rows = await prisma.workSession.findMany({
    where: { specialistId: actor, ...(taskId ? { taskId } : {}) },
    orderBy: SESSION_ORDER,
  });

  res.json(rows.map(toSession));
});

/** GET /tasks/{id}/sessions - the hierarchical view: task -> work sessions. */
sessionsRouter.get('/tasks/:id/sessions', async (req, res) => {
  const { id } = parseParams(IdParam, req);

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) {
    throw new HttpError(404, 'NOT_FOUND', `Task ${id} does not exist`);
  }

  const rows = await prisma.workSession.findMany({ where: { taskId: id }, orderBy: SESSION_ORDER });
  res.json(rows.map(toSession));
});

/** GET /sessions/{id} - a single work session. */
sessionsRouter.get('/sessions/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  res.json(toSession(await findSessionOr404(id)));
});

/**
 * POST /sessions - start a session or enter a finished one by hand.
 *
 * Both cases share one endpoint because they create the same resource; the
 * only difference is whether `endedAt` is known yet. Note what the client
 * cannot send: neither the duration nor the rate, because those are exactly
 * the numbers the whole system is supposed to make trustworthy.
 */
sessionsRouter.post('/sessions', async (req, res) => {
  const actor = requireActor(req);
  const input = parseBody(CreateWorkSessionInput, req);

  const task = await findReferencedTaskOr422(input.taskId);
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
      taskId: input.taskId,
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
  });

  created(res, `/api/sessions/${row.id}`, toSession(row));
});

/**
 * PATCH /sessions/{id} - correct a session or stop the running one.
 *
 * Stopping the timer is an ordinary update: sending `endedAt` closes the
 * session, and the server then measures the duration and locks in the rate.
 */
sessionsRouter.patch('/sessions/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);
  const input = parseBody(UpdateWorkSessionInput, req);

  const session = await findSessionOr404(id);
  assertIsSessionAuthor(session, actor);
  assertProjectAcceptsWork(session.task.project);

  // The checks run on the merged values: whatever the request leaves out keeps
  // the value already stored.
  const startedAt = input.startedAt !== undefined ? new Date(input.startedAt) : session.startedAt;
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

  res.json(toSession(await prisma.workSession.update({ where: { id }, data })));
});

/** DELETE /sessions/{id} - remove an entry from the work log. */
sessionsRouter.delete('/sessions/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);

  const session = await findSessionOr404(id);
  assertIsSessionAuthor(session, actor);
  assertProjectAcceptsWork(session.task.project);

  await prisma.workSession.delete({ where: { id } });
  noContent(res);
});
