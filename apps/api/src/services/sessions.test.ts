import { describe, expect, it } from 'vitest';
import { HttpError } from '../middleware/error.js';
import {
  assertChronology,
  assertIsAssignedSpecialist,
  assertIsSessionAuthor,
  assertNotInFuture,
  assertProjectAcceptsWork,
  durationMinutes,
  resolveAppliedRate,
} from './sessions.js';

function thrownBy(fn: () => void): HttpError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }
  throw new Error('expected an HttpError, nothing was thrown');
}

const specialist = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const at = (iso: string) => new Date(iso);

describe('durationMinutes', () => {
  it('measures whole hours and partial ones', () => {
    expect(durationMinutes(at('2026-09-20T09:00:00Z'), at('2026-09-20T13:00:00Z'))).toBe(240);
    expect(durationMinutes(at('2026-09-20T09:00:00Z'), at('2026-09-20T09:45:00Z'))).toBe(45);
  });

  it('rounds to the nearest minute', () => {
    expect(durationMinutes(at('2026-09-20T09:00:00Z'), at('2026-09-20T09:01:40Z'))).toBe(2);
  });

  it('counts across a midnight boundary', () => {
    expect(durationMinutes(at('2026-09-20T23:30:00Z'), at('2026-09-21T00:30:00Z'))).toBe(60);
  });
});

describe('assertChronology', () => {
  it('accepts a finished session and a running one', () => {
    expect(() =>
      assertChronology(at('2026-09-20T09:00:00Z'), at('2026-09-20T10:00:00Z')),
    ).not.toThrow();
    expect(() => assertChronology(at('2026-09-20T09:00:00Z'), null)).not.toThrow();
  });

  it('rejects an end that is not after the start', () => {
    for (const end of ['2026-09-20T08:00:00Z', '2026-09-20T09:00:00Z']) {
      const error = thrownBy(() => assertChronology(at('2026-09-20T09:00:00Z'), at(end)));
      expect(error.status).toBe(422);
      expect(error.code).toBe('INVALID_TIME_RANGE');
    }
  });
});

describe('assertNotInFuture', () => {
  it('accepts the recent past and tolerates small clock differences', () => {
    expect(() => assertNotInFuture(new Date(Date.now() - 60_000), 'startedAt')).not.toThrow();
    expect(() => assertNotInFuture(new Date(Date.now() + 60_000), 'startedAt')).not.toThrow();
  });

  it('rejects a timestamp well ahead of the server clock', () => {
    const error = thrownBy(() =>
      assertNotInFuture(new Date(Date.now() + 24 * 60 * 60_000), 'endedAt'),
    );
    expect(error.status).toBe(422);
    expect(error.code).toBe('TIMESTAMP_IN_FUTURE');
  });
});

describe('resolveAppliedRate', () => {
  it('prefers the task rate over the project rate', () => {
    expect(resolveAppliedRate(45, 35)).toBe(45);
  });

  it('falls back to the project rate when the task defines none', () => {
    expect(resolveAppliedRate(null, 35)).toBe(35);
  });

  it('leaves the session unpriced when no level defines a rate', () => {
    expect(resolveAppliedRate(null, null)).toBeNull();
  });

  it('treats a zero task rate as a real value, not as missing', () => {
    expect(resolveAppliedRate(0, 35)).toBe(0);
  });
});

describe('assertProjectAcceptsWork', () => {
  it('allows logging on a project in progress', () => {
    expect(() => assertProjectAcceptsWork({ status: 'IN_PROGRESS' })).not.toThrow();
  });

  it('refuses every other status', () => {
    for (const status of ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'] as const) {
      const error = thrownBy(() => assertProjectAcceptsWork({ status }));
      expect(error.status).toBe(422);
      expect(error.code).toBe('PROJECT_NOT_IN_PROGRESS');
    }
  });
});

describe('who may log and change work', () => {
  it('allows only the assigned specialist to log time', () => {
    expect(() => assertIsAssignedSpecialist({ specialistId: specialist }, specialist)).not.toThrow();
    expect(thrownBy(() => assertIsAssignedSpecialist({ specialistId: specialist }, other)).status).toBe(403);
    expect(thrownBy(() => assertIsAssignedSpecialist({ specialistId: null }, other)).status).toBe(403);
  });

  it('allows only the author to change a session', () => {
    expect(() => assertIsSessionAuthor({ specialistId: specialist }, specialist)).not.toThrow();
    expect(thrownBy(() => assertIsSessionAuthor({ specialistId: specialist }, other)).code).toBe('FORBIDDEN');
  });
});
