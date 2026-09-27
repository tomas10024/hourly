import { Router } from 'express';
import { AdminUpdateUserInput, UserListQuery } from '@hourly/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor } from '../lib/actor.js';
import { noContent } from '../lib/http.js';
import { linked, userLinks } from '../lib/links.js';
import { pageArgs, pageOf } from '../lib/pagination.js';
import { toCurrentUser, toPublicUser } from '../lib/serialize.js';
import { IdParam, parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { assertDeletable, assertNotSelf } from '../services/users.js';

export const usersRouter: Router = Router();

async function findUserOr404(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', `User ${id} does not exist`);
  return user;
}

/**
 * GET /users - every account, for the administrator.
 *
 * Unlike the public profile this includes the e-mail and the blocked flag,
 * which is what moderation needs. `q` searches the name and the e-mail.
 */
usersRouter.get('/users', requireRole('ADMIN'), async (req, res) => {
  const query = parseQuery(UserListQuery, req);
  const { q, role, isBlocked } = query;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(isBlocked !== undefined ? { isBlocked } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.user.count({ where }),
  ]);

  const items = rows.map((row) => linked(toCurrentUser(row), userLinks(row.id)));
  res.json(pageOf(req, items, total, query));
});

/**
 * GET /users/{id} - another user's public profile.
 *
 * For signed-in users: a client checks who bid on the project, a specialist
 * who published it. The e-mail and the blocked flag are not part of it.
 */
usersRouter.get('/users/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  requireActor(req);

  res.json(linked(toPublicUser(await findUserOr404(id)), userLinks(id)));
});

/**
 * PATCH /users/{id} - block or unblock an account.
 *
 * Blocking also revokes every refresh token of the account, so no session of
 * it survives. Access tokens already issued stop working on the next request
 * too, because `authenticate` checks the flag on every call.
 */
usersRouter.patch('/users/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const input = parseBody(AdminUpdateUserInput, req);

  const user = await findUserOr404(id);
  assertNotSelf(user.id, requireActor(req));

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isBlocked) {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return tx.user.update({ where: { id }, data: { isBlocked: input.isBlocked } });
  });

  res.json(linked(toCurrentUser(updated), userLinks(updated.id)));
});

/**
 * DELETE /users/{id} - remove an account that has no work history.
 *
 * Accounts that take part in projects are refused with 409 (see
 * `assertDeletable`); for those blocking is the answer. What remains deletable
 * - an unused registration, a specialist who only ever bid - goes together
 * with its proposals and refresh tokens.
 */
usersRouter.delete('/users/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parseParams(IdParam, req);

  const user = await findUserOr404(id);
  assertNotSelf(user.id, requireActor(req));

  const [projects, workSessions] = await Promise.all([
    prisma.project.count({ where: { OR: [{ clientId: id }, { specialistId: id }] } }),
    prisma.workSession.count({ where: { specialistId: id } }),
  ]);
  assertDeletable({ projects, workSessions });

  await prisma.user.delete({ where: { id } });
  noContent(res);
});
