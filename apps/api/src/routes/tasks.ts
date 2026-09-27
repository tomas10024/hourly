import { Router } from 'express';
import { z } from 'zod';
import { CreateTaskInput, UpdateTaskInput } from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, requireAuth, viewer } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { toTask } from '../lib/serialize.js';
import { ProjectParams, TaskParams, findProjectOr404, findTaskOr404 } from '../lib/scope.js';
import { parseBody, parseParams, parseQuery } from '../lib/validate.js';
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
 * Not a second address of the tasks but a personal view across the hierarchy:
 * without a filter it answers "my tasks", `?projectId=` narrows it down to one
 * project. Each task keeps its one address under its project. Tasks of
 * strangers' projects are never included, so the list cannot be used to
 * browse other people's work.
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
 * GET /projects/{projectId}/tasks - the hierarchical view: project -> tasks.
 *
 * A missing project gives 404 rather than an empty list: those two answers
 * mean different things, and the client has to be able to tell them apart.
 * The tasks are as visible as their project - a published project shows its
 * planned work to prospective bidders.
 */
tasksRouter.get('/projects/:projectId/tasks', async (req, res) => {
  const project = await findProjectOr404(parseParams(ProjectParams, req));
  assertCanViewProject(project, viewer(req));

  const rows = await prisma.task.findMany({
    where: { projectId: project.id },
    orderBy: TASK_ORDER,
  });
  res.json(rows.map(toTask));
});

/**
 * GET /projects/{projectId}/tasks/{taskId} - a single task, as visible as its
 * project. A task of another project does not exist at this address (404).
 */
tasksRouter.get('/projects/:projectId/tasks/:taskId', async (req, res) => {
  const task = await findTaskOr404(parseParams(TaskParams, req));
  assertCanViewProject(task.project, viewer(req));

  res.json(toTask(task));
});

/**
 * POST /projects/{projectId}/tasks - add a task to a project.
 *
 * The project is named by the address, so a missing one is a 404 like any
 * other unknown address. `position` may be left out: the server then appends
 * the task to the end of the list, so a client that does not care about
 * ordering cannot create gaps or collisions.
 */
tasksRouter.post('/projects/:projectId/tasks', async (req, res) => {
  const params = parseParams(ProjectParams, req);
  const actor = requireActor(req);
  const input = parseBody(CreateTaskInput, req);

  const project = await findProjectOr404(params);
  assertCanViewProject(project, viewer(req));
  assertProjectAcceptsTasks(project);
  assertCanAuthorTasks(project, actor);

  const row = await prisma.task.create({
    data: {
      projectId: project.id,
      title: input.title,
      description: input.description ?? null,
      hourlyRate: input.hourlyRate ?? null,
      estimatedHours: input.estimatedHours ?? null,
      position: input.position ?? (await nextPosition(project.id)),
    },
  });

  created(res, `/api/projects/${project.id}/tasks/${row.id}`, toTask(row));
});

/**
 * PATCH /projects/{projectId}/tasks/{taskId} - edit a task, move it, change
 * its status or approve it.
 *
 * Both parties of the project may edit and move tasks, but `approved` is the
 * client's decision alone, so it is checked separately.
 */
tasksRouter.patch('/projects/:projectId/tasks/:taskId', async (req, res) => {
  const params = parseParams(TaskParams, req);
  const auth = requireAuth(req);
  const actor = auth.userId;
  const input = parseBody(UpdateTaskInput, req);

  // Permission before state: a stranger learns nothing about a project they
  // cannot see, not even that it is closed.
  const task = await findTaskOr404(params);
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

  res.json(toTask(await prisma.task.update({ where: { id: task.id }, data })));
});

/**
 * DELETE /projects/{projectId}/tasks/{taskId} - remove a task.
 *
 * Its work sessions go with it through the cascade declared in the migration,
 * which is why a closed project refuses the operation: the report must keep
 * matching the hours that were actually logged.
 */
tasksRouter.delete('/projects/:projectId/tasks/:taskId', async (req, res) => {
  const params = parseParams(TaskParams, req);
  const auth = requireAuth(req);

  const task = await findTaskOr404(params);
  assertCanManageProject(task.project, auth);
  assertProjectAcceptsTasks(task.project);

  await prisma.task.delete({ where: { id: task.id } });
  noContent(res);
});
