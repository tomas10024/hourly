import { describe, expect, it } from 'vitest';
import { HttpError } from '../middleware/error.js';
import { assertBudgetRange, assertCanManage, assertStatusTransition } from './projects.js';

/** Helper: run `fn` and return the HttpError it threw. */
function thrownBy(fn: () => void): HttpError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }
  throw new Error('expected an HttpError, nothing was thrown');
}

describe('assertStatusTransition', () => {
  it('allows the documented lifecycle steps', () => {
    expect(() => assertStatusTransition('DRAFT', 'PUBLISHED')).not.toThrow();
    expect(() => assertStatusTransition('IN_PROGRESS', 'COMPLETED')).not.toThrow();
    expect(() => assertStatusTransition('PUBLISHED', 'CANCELLED')).not.toThrow();
  });

  it('accepts a no-op (the status is simply resent)', () => {
    expect(() => assertStatusTransition('DRAFT', 'DRAFT')).not.toThrow();
  });

  it('rejects reopening a finished project', () => {
    const error = thrownBy(() => assertStatusTransition('COMPLETED', 'IN_PROGRESS'));
    expect(error.status).toBe(422);
    expect(error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects skipping the proposal stage and explains why', () => {
    const error = thrownBy(() => assertStatusTransition('PUBLISHED', 'IN_PROGRESS'));
    expect(error.status).toBe(422);
    expect(error.message).toContain('proposal is accepted');
  });
});

describe('assertBudgetRange', () => {
  it('accepts a valid range and partially empty ranges', () => {
    expect(() => assertBudgetRange(100, 200)).not.toThrow();
    expect(() => assertBudgetRange(100, 100)).not.toThrow();
    expect(() => assertBudgetRange(null, 200)).not.toThrow();
    expect(() => assertBudgetRange(100, null)).not.toThrow();
  });

  it('rejects a reversed range with 422', () => {
    const error = thrownBy(() => assertBudgetRange(500, 200));
    expect(error.status).toBe(422);
    expect(error.code).toBe('INVALID_BUDGET_RANGE');
  });
});

describe('assertCanManage', () => {
  const client = '11111111-1111-4111-8111-111111111111';
  const specialist = '22222222-2222-4222-8222-222222222222';
  const stranger = '33333333-3333-4333-8333-333333333333';

  it('allows both parties of the project', () => {
    const project = { clientId: client, specialistId: specialist };
    expect(() => assertCanManage(project, client)).not.toThrow();
    expect(() => assertCanManage(project, specialist)).not.toThrow();
  });

  it('rejects anyone else with 403', () => {
    const error = thrownBy(() =>
      assertCanManage({ clientId: client, specialistId: specialist }, stranger),
    );
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('rejects an unassigned side (null must never match)', () => {
    const error = thrownBy(() =>
      assertCanManage({ clientId: client, specialistId: null }, stranger),
    );
    expect(error.status).toBe(403);
  });
});
