import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import {
  LoginInput,
  RegisterInput,
  UpdateMeInput,
  type AuthResponse,
  type Links,
} from '@hourly/shared';
import type { Prisma, User as UserRow } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, requireAuth } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { linked, paths } from '../lib/links.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../lib/passwords.js';
import { loginLimit, refreshLimit, registerLimit } from '../lib/rate-limit.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../lib/refresh-cookie.js';
import { hashToken } from '../lib/secure-token.js';
import { toCurrentUser } from '../lib/serialize.js';
import { newRefreshToken, signAccessToken } from '../lib/tokens.js';
import { parseBody } from '../lib/validate.js';
import { HttpError, unauthorized } from '../middleware/error.js';
import { classifyRefresh, normalizeEmail } from '../services/auth.js';

export const authRouter: Router = Router();

const accountBlocked = () => new HttpError(403, 'ACCOUNT_BLOCKED', 'This account is blocked');

/**
 * Issues the pair of tokens and puts the refresh token into the cookie.
 *
 * A login starts a new token family; a refresh continues the family of the
 * token it replaces. The family is the sign-in itself: the access token names
 * it in `sid`, and revoking it (logout, reuse) ends both kinds of token.
 * `db` lets a refresh store the new token in the same transaction that
 * revokes the old one.
 */
async function issueTokens(
  res: Response,
  user: UserRow,
  familyId: string = randomUUID(),
  db: Prisma.TransactionClient = prisma,
): Promise<AuthResponse> {
  const refresh = newRefreshToken();
  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId,
      expiresAt: refresh.expiresAt,
    },
  });
  setRefreshCookie(res, refresh.token, refresh.expiresAt);

  return { accessToken: signAccessToken(user, familyId), user: toCurrentUser(user) };
}

function revokeFamily(familyId: string, now: Date = new Date()) {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: now },
  });
}

/**
 * POST /auth/register - create a client or specialist account.
 *
 * `RegisterInput` only admits CLIENT and SPECIALIST, so an administrator
 * cannot be self-registered. The new user is signed in straight away.
 */
authRouter.post('/auth/register', registerLimit, async (req, res) => {
  const input = parseBody(RegisterInput, req);
  const email = normalizeEmail(input.email);

  // Checked first to avoid hashing a password for nothing. Two simultaneous
  // registrations can still race past it; the unique index then answers 409.
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this e-mail already exists');
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      role: input.role,
    },
  });

  created(res, `/api/users/${user.id}`, await issueTokens(res, user));
});

/**
 * POST /auth/login - exchange e-mail and password for tokens.
 *
 * An unknown e-mail and a wrong password get the same answer and take the
 * same time (`DUMMY_HASH`), so the endpoint does not reveal which addresses
 * have accounts. A blocked account is reported only after the password has
 * been verified - someone without the password learns nothing about it.
 */
authRouter.post('/auth/login', loginLimit, async (req, res) => {
  const input = parseBody(LoginInput, req);

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw unauthorized('INVALID_CREDENTIALS', 'Incorrect e-mail or password');
  }
  if (user.isBlocked) throw accountBlocked();

  res.json(await issueTokens(res, user));
});

/**
 * POST /auth/refresh - a new access token for the refresh token in the cookie.
 *
 * Rotation: the presented token is revoked and a new one from the same family
 * takes its place, so every refresh token works exactly once. Presenting a
 * token that was already used revokes the whole family (see `classifyRefresh`).
 *
 * The token is read from the cookie only, never from the body: a value that
 * page scripts can hand over is a value that page scripts can steal.
 */
authRouter.post('/auth/refresh', refreshLimit, async (req, res) => {
  // A refused token is useless from then on, so every failure also drops the
  // cookie; the client does not keep sending it.
  const fail = (error: HttpError) => {
    clearRefreshCookie(res);
    return error;
  };
  // Revoked tokens are not only replays: a password change or logout on
  // another device revokes them too. The message covers both; the family is
  // revoked either way.
  const reused = () =>
    fail(
      unauthorized(
        'REFRESH_TOKEN_REUSED',
        'Refresh token was already used or revoked; sign in again',
      ),
    );

  const token = readRefreshCookie(req);
  if (token === null) throw fail(unauthorized('INVALID_REFRESH_TOKEN', 'No refresh token'));

  const now = new Date();
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  // Before anything else: blocking revokes every token of the user, and the
  // honest answer to a blocked user is "blocked", not "token reused".
  if (row?.user.isBlocked) {
    await revokeFamily(row.familyId, now);
    throw fail(accountBlocked());
  }

  switch (classifyRefresh(row, now)) {
    case 'unknown':
    case 'expired':
      throw fail(unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired'));
    case 'reused':
      await revokeFamily(row!.familyId, now);
      throw reused();
    case 'ok':
      break;
  }

  const { user, familyId } = row!;

  // The old token is revoked and its successor stored in one transaction, so
  // the family never has a moment without a usable token - `authenticate`
  // would otherwise take such a moment for a logout.
  //
  // The revocation is conditional on `revokedAt: null`, so of two concurrent
  // refreshes with the same token only one can win. The loser is
  // indistinguishable from a replay and is treated as one - two valid
  // successors must never exist.
  const issued = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: row!.id, revokedAt: null },
      data: { revokedAt: now },
    });
    return count === 1 ? issueTokens(res, user, familyId, tx) : null;
  });
  if (issued === null) {
    await revokeFamily(familyId, now);
    throw reused();
  }

  res.json(issued);
});

/**
 * POST /auth/logout - end this login.
 *
 * Driven by the cookie alone, not by the access token, so signing out works
 * even after the access token has expired. The family is revoked, which kills
 * every refresh token of this login - and, because the access token names the
 * family in `sid`, the access token too: the next request with it answers 401
 * `SESSION_REVOKED` instead of working until its `exp`.
 *
 * Idempotent: without a cookie, or with an unknown one, the caller is already
 * signed out and gets 204 all the same.
 */
authRouter.post('/auth/logout', async (req, res) => {
  const token = readRefreshCookie(req);
  clearRefreshCookie(res);

  if (token !== null) {
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { familyId: true },
    });
    if (row) await revokeFamily(row.familyId);
  }

  noContent(res);
});

/** The own account: itself, the public profile others see, and the way out. */
function meLinks(userId: string): Links {
  return {
    self: { href: '/api/auth/me' },
    update: { href: '/api/auth/me', method: 'PATCH' },
    profile: { href: paths.user(userId) },
    logout: { href: '/api/auth/logout', method: 'POST' },
  };
}

async function findMeOr401(id: string): Promise<UserRow> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw unauthorized('INVALID_TOKEN', 'The account no longer exists');
  return user;
}

/** GET /auth/me - the signed-in user, including the e-mail. */
authRouter.get('/auth/me', async (req, res) => {
  const user = await findMeOr401(requireActor(req));
  res.json(linked(toCurrentUser(user), meLinks(user.id)));
});

/**
 * PATCH /auth/me - edit one's own name, bio or password.
 *
 * A password change signs out every other login: whoever might have known the
 * old password loses their tokens with it. The login making the change
 * (the `sid` of its access token) stays signed in.
 */
authRouter.patch('/auth/me', async (req, res) => {
  const auth = requireAuth(req);
  const user = await findMeOr401(auth.userId);
  const input = parseBody(UpdateMeInput, req);

  let passwordHash: string | undefined;
  if (input.password !== undefined) {
    if (!(await verifyPassword(input.currentPassword!, user.passwordHash))) {
      throw new HttpError(422, 'INVALID_PASSWORD', 'The current password is incorrect', {
        field: 'currentPassword',
      });
    }
    passwordHash = await hashPassword(input.password);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { displayName: input.displayName, bio: input.bio, passwordHash },
  });

  if (passwordHash !== undefined) {
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null, familyId: { not: auth.sessionId } },
      data: { revokedAt: new Date() },
    });
  }

  res.json(linked(toCurrentUser(updated), meLinks(updated.id)));
});
