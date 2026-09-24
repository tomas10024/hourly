import { describe, expect, it } from 'vitest';
import { UpdateMeInput } from '@valandine/shared';
import { classifyRefresh, normalizeEmail } from './auth.js';

const now = new Date('2026-09-24T12:00:00.000Z');
const tomorrow = new Date('2026-09-25T12:00:00.000Z');
const yesterday = new Date('2026-09-23T12:00:00.000Z');

describe('normalizeEmail', () => {
  it('ignores case and surrounding spaces, so one address is one account', () => {
    expect(normalizeEmail('  Rasa@ZaliaLanka.LT ')).toBe('rasa@zalialanka.lt');
  });
});

describe('classifyRefresh', () => {
  it('accepts a live token', () => {
    expect(classifyRefresh({ revokedAt: null, expiresAt: tomorrow }, now)).toBe('ok');
  });

  it('does not know a token that was never issued', () => {
    expect(classifyRefresh(null, now)).toBe('unknown');
  });

  it('refuses an expired token, including at the exact expiry moment', () => {
    expect(classifyRefresh({ revokedAt: null, expiresAt: yesterday }, now)).toBe('expired');
    expect(classifyRefresh({ revokedAt: null, expiresAt: now }, now)).toBe('expired');
  });

  it('treats a revoked token as a replay - the signal of theft', () => {
    expect(classifyRefresh({ revokedAt: yesterday, expiresAt: tomorrow }, now)).toBe('reused');
  });

  it('still reports a replay when the replayed token has also expired', () => {
    expect(classifyRefresh({ revokedAt: yesterday, expiresAt: yesterday }, now)).toBe('reused');
  });
});

describe('UpdateMeInput', () => {
  it('accepts a name or bio change on its own', () => {
    expect(UpdateMeInput.safeParse({ displayName: 'Rasa' }).success).toBe(true);
    expect(UpdateMeInput.safeParse({ bio: null }).success).toBe(true);
  });

  it('requires the current password to set a new one', () => {
    expect(UpdateMeInput.safeParse({ password: 'naujas-slaptazodis' }).success).toBe(false);
    expect(
      UpdateMeInput.safeParse({ password: 'naujas-slaptazodis', currentPassword: 'senas' })
        .success,
    ).toBe(true);
  });

  it('refuses an empty change', () => {
    expect(UpdateMeInput.safeParse({}).success).toBe(false);
  });

  it('does not let a user change their e-mail or role', () => {
    const parsed = UpdateMeInput.parse({ displayName: 'Rasa', role: 'ADMIN', email: 'x@y.lt' });
    expect(parsed).not.toHaveProperty('role');
    expect(parsed).not.toHaveProperty('email');
  });
});
