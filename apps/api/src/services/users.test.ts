import { describe, expect, it } from 'vitest';
import { AdminUpdateUserInput, UserListQuery } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';
import { assertDeletable, assertNotSelf } from './users.js';

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const OTHER = 'a0000000-0000-4000-8000-000000000003';

function rejection(fn: () => void): HttpError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }
  throw new Error('Expected an HttpError');
}

describe('assertNotSelf', () => {
  it('lets an administrator act on someone else', () => {
    expect(() => assertNotSelf(OTHER, ADMIN)).not.toThrow();
  });

  it('refuses to block or delete their own account', () => {
    const error = rejection(() => assertNotSelf(ADMIN, ADMIN));
    expect(error.status).toBe(422);
    expect(error.code).toBe('CANNOT_MODIFY_SELF');
  });
});

describe('assertDeletable', () => {
  it('allows deleting an account nothing depends on', () => {
    expect(() => assertDeletable({ projects: 0, workSessions: 0 })).not.toThrow();
  });

  it.each([
    [{ projects: 1, workSessions: 0 }],
    [{ projects: 0, workSessions: 3 }],
    [{ projects: 2, workSessions: 5 }],
  ])('refuses an account with work history %o, and says what it has', (history) => {
    const error = rejection(() => assertDeletable(history));
    expect(error.status).toBe(409);
    expect(error.code).toBe('USER_HAS_WORK_HISTORY');
    expect(error.details).toEqual(history);
  });
});

describe('UserListQuery', () => {
  it('reads isBlocked from the query string as a boolean', () => {
    expect(UserListQuery.parse({ isBlocked: 'true' }).isBlocked).toBe(true);
    expect(UserListQuery.parse({ isBlocked: 'false' }).isBlocked).toBe(false);
    expect(UserListQuery.parse({}).isBlocked).toBeUndefined();
  });

  it('refuses anything but the literal words, instead of guessing', () => {
    expect(UserListQuery.safeParse({ isBlocked: '0' }).success).toBe(false);
    expect(UserListQuery.safeParse({ isBlocked: 'yes' }).success).toBe(false);
  });

  it('filters by a known role only', () => {
    expect(UserListQuery.parse({ role: 'ADMIN' }).role).toBe('ADMIN');
    expect(UserListQuery.safeParse({ role: 'ROOT' }).success).toBe(false);
  });
});

describe('AdminUpdateUserInput', () => {
  it('lets the administrator change the blocked flag and nothing else', () => {
    const parsed = AdminUpdateUserInput.parse({ isBlocked: true, role: 'ADMIN', email: 'x@y.lt' });
    expect(parsed).toEqual({ isBlocked: true });
  });

  it('requires the flag', () => {
    expect(AdminUpdateUserInput.safeParse({}).success).toBe(false);
  });
});
