import { Router } from 'express';
import { z } from 'zod';
import { CreateShareLinkInput } from '@hourly/shared';
import { prisma } from '../lib/prisma.js';
import { requireActor } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { iso, money, toShareLink } from '../lib/serialize.js';
import { IdParam, parseBody, parseParams } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../env.js';
import { assertCanManage } from '../services/projects.js';
import { summarizeTasks } from '../services/report.js';
import {
  expiresAtFromNow,
  generateShareToken,
  hashShareToken,
  isShareUsable,
  shareUrl,
} from '../services/shares.js';

export const sharesRouter: Router = Router();

/** Long enough to be a real token; anything shorter is a malformed address. */
const TokenParam = z.object({ token: z.string().min(20).max(200) });

async function findProjectOr404(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${id} does not exist`);
  }
  return project;
}

/**
 * POST /projects/{id}/shares - create a read-only link for the project.
 *
 * The response is the only time the token is ever readable: the database keeps
 * nothing but its hash, so a lost link cannot be recovered, only replaced.
 */
sharesRouter.post('/projects/:id/shares', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);
  const input = parseBody(CreateShareLinkInput, req);

  assertCanManage(await findProjectOr404(id), actor);

  const { token, tokenHash } = generateShareToken();
  const row = await prisma.shareLink.create({
    data: { projectId: id, tokenHash, expiresAt: expiresAtFromNow(input.expiresInDays) },
  });

  created(res, `/api/shares/${row.id}`, {
    ...toShareLink(row),
    token,
    url: shareUrl(env.WEB_ORIGIN, token),
  });
});

/**
 * GET /projects/{id}/shares - links created for the project.
 *
 * Tokens are absent by construction: `toShareLink` cannot serialize the hash,
 * so this endpoint answers what exists and until when, not how to get in.
 */
sharesRouter.get('/projects/:id/shares', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);

  assertCanManage(await findProjectOr404(id), actor);

  const rows = await prisma.shareLink.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(rows.map(toShareLink));
});

/**
 * DELETE /shares/{id} - revoke a link.
 *
 * The row is kept and only stamped with `revokedAt`, because the fact that a
 * project was shared - and until when it could be read - is part of its
 * history. Revoking twice answers 204 again: the caller asked for a state
 * that already holds.
 */
sharesRouter.delete('/shares/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);

  const link = await prisma.shareLink.findUnique({ where: { id }, include: { project: true } });
  if (!link) {
    throw new HttpError(404, 'NOT_FOUND', `Share link ${id} does not exist`);
  }
  assertCanManage(link.project, actor);

  if (link.revokedAt === null) {
    await prisma.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  noContent(res);
});

/**
 * GET /public/projects/{token} - the project behind a share link.
 *
 * No account, no actor, read-only. A link that does not exist, one that has
 * been revoked and one that has expired all answer an identical 404: telling
 * them apart would let a visitor probe which tokens once existed.
 *
 * `X-Robots-Tag: noindex` is set for the whole `/api/public` branch in
 * `app.ts`, because the token travels in the address.
 */
sharesRouter.get('/public/projects/:token', async (req, res) => {
  const { token } = parseParams(TokenParam, req);

  const link = await prisma.shareLink.findUnique({
    where: { tokenHash: hashShareToken(token) },
    include: {
      project: {
        include: {
          tasks: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            include: { sessions: true },
          },
        },
      },
    },
  });

  if (!link || !isShareUsable(link)) {
    throw new HttpError(404, 'NOT_FOUND', 'The link is invalid, revoked or expired');
  }

  // Tells the specialist whether the client has looked at the progress yet.
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { lastViewedAt: new Date() },
  });

  const summary = summarizeTasks(
    link.project.tasks.map((task) => ({
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
    money(link.project.hourlyRate),
  );

  res.json({
    project: {
      id: link.project.id,
      title: link.project.title,
      description: link.project.description,
      status: link.project.status,
      externalClientName: link.project.externalClientName,
    },
    tasks: summary.lines,
    totalMinutes: summary.totalMinutes,
    totalAmount: summary.totalAmount,
    expiresAt: iso(link.expiresAt),
  });
});
