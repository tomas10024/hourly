import { Router } from 'express';
import {
  CreateProjectInput,
  type ProjectReport,
  ProjectListQuery,
  UpdateProjectInput,
} from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, requireAuth, requireRoleOf, viewer } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { pageArgs, pageOf } from '../lib/pagination.js';
import { money, toProject } from '../lib/serialize.js';
import { UTF8_BOM, toCsv } from '../lib/csv.js';
import { IdParam, parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import {
  assertCanCreateProject,
  assertCanDeleteProject,
  assertCanInspectProject,
  assertCanManageProject,
  assertCanViewProject,
} from '../services/access.js';
import { assertBudgetRange, assertStatusTransition } from '../services/projects.js';
import { reportToCsvRows, summarizeTasks } from '../services/report.js';

export const projectsRouter: Router = Router();

/** Loads a project or fails with 404 - used by every single-resource route. */
async function findProjectOr404(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${id} does not exist`);
  }
  return project;
}

/**
 * GET /projects - list projects.
 *
 * `scope` decides which set is being asked for; it is a query parameter rather
 * than a separate address (`/my-projects`) because the resource stays the same
 * and only the selection criterion changes.
 *
 * The filters are collected into an `AND` array instead of a single object so
 * that a narrowing `status` cannot silently overwrite the scope filter.
 */
projectsRouter.get('/projects', async (req, res) => {
  const query = parseQuery(ProjectListQuery, req);
  const { scope, q, status, origin } = query;

  const filters: Prisma.ProjectWhereInput[] = [];

  if (scope === 'marketplace') {
    // Anyone may browse the marketplace, so no actor is required here.
    filters.push({ origin: 'MARKETPLACE', status: 'PUBLISHED' });
  } else if (scope === 'owned') {
    filters.push({ clientId: requireActor(req) });
  } else if (scope === 'assigned') {
    filters.push({ specialistId: requireActor(req) });
  } else {
    // Every project in every status - moderation needs the full picture.
    requireRoleOf(req, 'ADMIN');
  }

  if (status) filters.push({ status });
  if (origin) filters.push({ origin });

  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.ProjectWhereInput = { AND: filters };

  // One round trip for both the page and the total, so the count cannot be
  // taken from a different state of the data than the rows.
  const [rows, total] = await prisma.$transaction([
    prisma.project.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.project.count({ where }),
  ]);

  res.json(pageOf(rows.map(toProject), total, query));
});

/**
 * GET /projects/{id} - a single project.
 *
 * A published project is public, guests included. Any other is visible only to
 * its parties and the administrator; for everyone else it does not exist (404).
 */
projectsRouter.get('/projects/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);

  const project = await findProjectOr404(id);
  assertCanViewProject(project, viewer(req));

  res.json(toProject(project));
});

/**
 * POST /projects - create a project.
 *
 * The two origins differ in more than a flag, so the server derives the rest
 * instead of trusting the client:
 *   MARKETPLACE - the actor is the client, the project starts as a DRAFT and
 *                 has to go through the proposal stage;
 *   DIRECT      - the actor is the specialist, the client is a plain name, and
 *                 there is nothing to bid on, so work starts immediately.
 *
 * Which of the two a caller may create follows from their role.
 */
projectsRouter.post('/projects', async (req, res) => {
  const { userId: actor, role } = requireAuth(req);
  const input = parseBody(CreateProjectInput, req);
  assertCanCreateProject(input.origin, role);
  const isDirect = input.origin === 'DIRECT';

  const row = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      origin: input.origin,
      // Directly agreed work has no client account, so its task list can only
      // ever be written by the specialist - the requested mode is ignored.
      taskAuthoring: isDirect ? 'SPECIALIST' : input.taskAuthoring,
      status: isDirect ? 'IN_PROGRESS' : 'DRAFT',
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      hourlyRate: input.hourlyRate ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      externalClientName: isDirect ? (input.externalClientName ?? null) : null,
      clientId: isDirect ? null : actor,
      specialistId: isDirect ? actor : null,
    },
  });

  created(res, `/api/projects/${row.id}`, toProject(row));
});

/**
 * PATCH /projects/{id} - update a project.
 *
 * Only the keys actually present in the body are written, so sending
 * `{"status":"PUBLISHED"}` cannot wipe the budget. `null` is a meaningful
 * value here (clear the field) and is therefore distinguished from "absent".
 */
projectsRouter.patch('/projects/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const auth = requireAuth(req);
  const input = parseBody(UpdateProjectInput, req);

  const existing = await findProjectOr404(id);
  assertCanManageProject(existing, auth);

  if (input.status) assertStatusTransition(existing.status, input.status);

  // The range has to hold after the update, so it is checked on the merged
  // values: whatever the request did not mention keeps its stored value.
  assertBudgetRange(
    input.budgetMin === undefined ? money(existing.budgetMin) : (input.budgetMin ?? null),
    input.budgetMax === undefined ? money(existing.budgetMax) : (input.budgetMax ?? null),
  );

  const data: Prisma.ProjectUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.budgetMin !== undefined) data.budgetMin = input.budgetMin;
  if (input.budgetMax !== undefined) data.budgetMax = input.budgetMax;
  if (input.hourlyRate !== undefined) data.hourlyRate = input.hourlyRate;
  if (input.deadline !== undefined) {
    data.deadline = input.deadline === null ? null : new Date(input.deadline);
  }

  res.json(toProject(await prisma.project.update({ where: { id }, data })));
});

/**
 * GET /projects/{id}/report - what was done, for how long, and for how much.
 *
 * One resource in two representations, chosen by the `Accept` header rather
 * than by a `?format=` parameter or a separate address: it is the same report
 * either way, only the media type differs. That is what content negotiation is
 * for, and an unsupported type is answered with 406 instead of quietly
 * sending JSON.
 *
 * Running sessions are left out - only finished work is reported. Readable by
 * the parties and, to settle a dispute, by the administrator.
 */
projectsRouter.get('/projects/:id/report', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const auth = requireAuth(req);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { sessions: true },
      },
    },
  });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${id} does not exist`);
  }
  assertCanInspectProject(project, auth);

  // `req.accepts` returns the best match for the client's Accept header, or
  // false when nothing offered here is acceptable. No header at all, or */*,
  // resolves to the first entry - so JSON stays the default.
  const format = req.accepts(['application/json', 'text/csv']);
  if (format === false) {
    throw new HttpError(
      406,
      'NOT_ACCEPTABLE',
      'This report is available as application/json or text/csv',
    );
  }

  const summary = summarizeTasks(
    project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      hourlyRate: money(task.hourlyRate),
      sessions: task.sessions.map((session) => ({
        endedAt: session.endedAt,
        durationMinutes: session.durationMinutes,
        appliedRate: money(session.appliedRate),
      })),
    })),
    money(project.hourlyRate),
  );

  const report: ProjectReport = {
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      hourlyRate: money(project.hourlyRate),
    },
    generatedAt: new Date().toISOString(),
    lines: summary.lines,
    totalMinutes: summary.totalMinutes,
    totalAmount: summary.totalAmount,
  };

  if (format === 'text/csv') {
    res.type('text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${project.id}.csv"`);
    res.send(UTF8_BOM + toCsv(reportToCsvRows(report)));
    return;
  }

  res.json(report);
});

/**
 * DELETE /projects/{id} - remove a project.
 *
 * Tasks, work sessions, proposals and share links go with it through the
 * cascade declared in the migration. 204 because there is nothing left to
 * return. Only the creator of the project, or the administrator removing
 * content that breaks the rules, may do it.
 */
projectsRouter.delete('/projects/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const auth = requireAuth(req);

  assertCanDeleteProject(await findProjectOr404(id), auth);
  await prisma.project.delete({ where: { id } });

  noContent(res);
});
