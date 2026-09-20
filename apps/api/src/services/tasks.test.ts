import { describe, expect, it } from 'vitest';
import { HttpError } from '../middleware/error.js';
import {
  assertCanApproveTasks,
  assertCanAuthorTasks,
  assertProjectAcceptsTasks,
} from './tasks.js';

function thrownBy(fn: () => void): HttpError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }
  throw new Error('expected an HttpError, nothing was thrown');
}

const client = '11111111-1111-4111-8111-111111111111';
const specialist = '22222222-2222-4222-8222-222222222222';

describe('assertProjectAcceptsTasks', () => {
  it('allows open projects', () => {
    expect(() => assertProjectAcceptsTasks({ status: 'DRAFT' })).not.toThrow();
    expect(() => assertProjectAcceptsTasks({ status: 'IN_PROGRESS' })).not.toThrow();
  });

  it('refuses to change the task list of a closed project', () => {
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      const error = thrownBy(() => assertProjectAcceptsTasks({ status }));
      expect(error.status).toBe(422);
      expect(error.code).toBe('PROJECT_CLOSED');
    }
  });
});

describe('assertCanAuthorTasks', () => {
  it('lets the client write the list in CLIENT mode', () => {
    const project = { clientId: client, specialistId: specialist, taskAuthoring: 'CLIENT' as const };
    expect(() => assertCanAuthorTasks(project, client)).not.toThrow();

    const error = thrownBy(() => assertCanAuthorTasks(project, specialist));
    expect(error.status).toBe(403);
  });

  it('lets the specialist write the list in SPECIALIST mode', () => {
    const project = {
      clientId: client,
      specialistId: specialist,
      taskAuthoring: 'SPECIALIST' as const,
    };
    expect(() => assertCanAuthorTasks(project, specialist)).not.toThrow();
    expect(thrownBy(() => assertCanAuthorTasks(project, client)).status).toBe(403);
  });

  it('allows nobody while the authoring role is still unfilled', () => {
    const project = { clientId: client, specialistId: null, taskAuthoring: 'SPECIALIST' as const };
    expect(thrownBy(() => assertCanAuthorTasks(project, client)).status).toBe(403);
  });
});

describe('assertCanApproveTasks', () => {
  const specialistAuthored = {
    clientId: client,
    specialistId: specialist,
    taskAuthoring: 'SPECIALIST' as const,
  };

  it('lets the client approve a specialist-authored task', () => {
    expect(() => assertCanApproveTasks(specialistAuthored, client)).not.toThrow();
  });

  it('does not let the specialist approve their own task', () => {
    expect(thrownBy(() => assertCanApproveTasks(specialistAuthored, specialist)).status).toBe(403);
  });

  it('rejects approval when the client wrote the list themselves', () => {
    const error = thrownBy(() =>
      assertCanApproveTasks(
        { clientId: client, specialistId: specialist, taskAuthoring: 'CLIENT' },
        client,
      ),
    );
    expect(error.status).toBe(422);
    expect(error.code).toBe('APPROVAL_NOT_APPLICABLE');
  });
});
