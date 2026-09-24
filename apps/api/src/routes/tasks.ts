import { Router } from 'express';
import { z } from 'zod';
import { CreateTaskInput, UpdateTaskInput } from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, requireAuth, viewer } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { toTask } from '../lib/serialize.js';
import { IdParam, parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import { assertCanManageProject, assertCanViewProject } from '../services/access.js';
import {
  assertCanApproveTasks,
  assertCanAuthorTasks,
  assertProjectAcceptsTasks,
} from '../services/tasks.js';

export const tasksRouter: Router = Router();

const TaskListQuery = z.object({ projectId: z.uuid().optional() });

/** Tasks are always read in the order the author arranged them. */
const TASK_ORDER: Prisma.TaskOrderByWithRelationInput[] = [
  { position: 'asc' },
  { createdAt: 'asc' },
];

/**
 * Loads a task together with its project, because every permission check and
 * every rule about tasks is really a question about the parent project.
 */
async function findTaskOr404(id: string) {
  const task = await prisma.task.findUnique({ where: { id }, include: { project: true } });
  if (!task) {
    throw new HttpError(404, 'NOT_FOUND', `Task ${id} does not exist`);
  }
  return task;
}

/**
 * The project a task is being attached to.
 *
 * 422 rather than 404: the identifier came from the request body, so the
 * address is fine and it is the content that refers to something missing.
 */
async function findReferencedProjectOr422(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new HttpError(422, 'INVALID_REFERENCE', `Project ${projectId} does not exist`, {
      field: 'projectId',
    });
  }
  return project;
}

/** The next free slot in the project's task list. */
async function nextPosition(projectId: string): Promise<number> {
  const { _max } = await prisma.task.aggregate({
    where: { projectId },
    _max: { position: true },
  });
  return (_max.position ?? -1) + 1;
}

/**
 * GET /tasks - tasks of the projects the actor takes part in.
 *
 * Without a filter this answers "my tasks"; `?projectId=` narrows it down to
 * one project. Tasks of strangers' projects are never included, so the list
 * cannot be used to browse other people's work.
 */
tasksRouter.get('/tasks', async (req, res) => {
  const actor = requireActor(req);
  const { projectId } = parseQuery(TaskListQuery, req);

  const rows = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      project: { OR: [{ clientId: actor }, { specialistId: actor }] },
    },
    orderBy: [{ projectId: 'asc' }, ...TASK_ORDER],
  });

  res.json(rows.map(toTask));
});

/**
 * GET /projects/{id}/tasks - the hierarchical view: project -> tasks.
 *
 * A missing project gives 404 rather than an empty list: those two answers
 * mean different things, and the client has to be able to tell them apart.
 * The tasks are as visible as their project - a published project shows its
 * planned work to prospective bidders.
 */
tasksRouter.get('/projects/:id/tasks', async (req, res) => {
  const { id } = parseParams(IdParam, req);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${id} does not exist`);
  }
  assertCanViewProject(project, viewer(req));

  const rows = await prisma.task.findMany({ where: { projectId: id }, orderBy: TASK_ORDER });
  res.json(rows.map(toTask));
});

/** GET /tasks/{id} - a single task, as visible as its project. */
tasksRouter.get('/tasks/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);

  const task = await findTaskOr404(id);
  assertCanViewProject(task.project, viewer(req));

  res.json(toTask(task));
});

/**
 * POST /tasks - add a task to a project.
 *
 * `position` may be left out: the server then appends the task to the end of
 * the list, so a client that does not care about ordering cannot create gaps
 * or collisions.
 */
tasksRouter.post('/tasks', async (req, res) => {
  const actor = requireActor(req);
  const input = parseBody(CreateTaskInput, req);

  const project = await findReferencedProjectOr422(input.projectId);
  assertProjectAcceptsTasks(project);
  assertCanAuthorTasks(project, actor);

  const row = await prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      hourlyRate: input.hourlyRate ?? null,
      estimatedHours: input.estimatedHours ?? null,
      position: input.position ?? (await nextPosition(input.projectId)),
    },
  });

  created(res, `/api/tasks/${row.id}`, toTask(row));
});

/**
 * PATCH /tasks/{id} - edit a task, move it, change its status or approve it.
 *
 * Both parties of the project may edit and move tasks, but `approved` is the
 * client's decision alone, so it is checked separately.
 */
tasksRouter.patch('/tasks/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const auth = requireAuth(req);
  const actor = auth.userId;
  const input = parseBody(UpdateTaskInput, req);

  // Permission before state: a stranger learns nothing about a project they
  // cannot see, not even that it is closed.
  const task = await findTaskOr404(id);
  assertCanManageProject(task.project, auth);
  assertProjectAcceptsTasks(task.project);

  const data: Prisma.TaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.position !== undefined) data.position = input.position;
  if (input.hourlyRate !== undefined) data.hourlyRate = input.hourlyRate;
  if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours;

  if (input.approved !== undefined) {
    assertCanApproveTasks(task.project, actor);
    data.approvedAt = input.approved ? new Date() : null;
  }

  res.json(toTask(await prisma.task.update({ where: { id }, data })));
});

/**
 * DELETE /tasks/{id} - remove a task.
 *
 * Its work sessions go with it through the cascade declared in the migration,
 * which is why a closed project refuses the operation: the report must keep
 * matching the hours that were actually logged.
 */
tasksRouter.delete('/tasks/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const auth = requireAuth(req);

  const task = await findTaskOr404(id);
  assertCanManageProject(task.project, auth);
  assertProjectAcceptsTasks(task.project);

  await prisma.task.delete({ where: { id } });
  noContent(res);
});
