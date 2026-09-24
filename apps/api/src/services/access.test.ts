import { describe, expect, it } from 'vitest';
import type { ProjectOrigin, ProjectStatus } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';
import {
  type Viewer,
  assertCanCreateProject,
  assertCanDeleteProject,
  assertCanInspectProject,
  assertCanManageProject,
  assertCanViewProject,
  canViewProject,
} from './access.js';

/**
 * The permission matrix of README section "Autentifikacija ir autorizacija",
 * row by row. Each case names a caller and the answer they must get.
 */

const CLIENT = 'a0000000-0000-4000-8000-000000000002';
const SPECIALIST = 'a0000000-0000-4000-8000-000000000003';

const viewers = {
  guest: null,
  client: { userId: CLIENT, role: 'CLIENT' },
  specialist: { userId: SPECIALIST, role: 'SPECIALIST' },
  otherClient: { userId: 'a0000000-0000-4000-8000-000000000004', role: 'CLIENT' },
  otherSpecialist: { userId: 'a0000000-0000-4000-8000-000000000007', role: 'SPECIALIST' },
  admin: { userId: 'a0000000-0000-4000-8000-000000000001', role: 'ADMIN' },
} satisfies Record<string, Viewer>;

type Who = keyof typeof viewers;

function project(status: ProjectStatus, origin: ProjectOrigin = 'MARKETPLACE') {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    status,
    origin,
    clientId: origin === 'MARKETPLACE' ? CLIENT : null,
    specialistId: status === 'PUBLISHED' || status === 'DRAFT' ? null : SPECIALIST,
  };
}

/** The HTTP status a check answers with; 200 when it lets the caller through. */
function outcome(check: () => void): number {
  try {
    check();
    return 200;
  } catch (error) {
    if (error instanceof HttpError) return error.status;
    throw error;
  }
}

describe('canViewProject', () => {
  it.each<[Who, boolean]>([
    ['guest', true],
    ['otherClient', true],
    ['otherSpecialist', true],
    ['admin', true],
  ])('a PUBLISHED project is on the marketplace: %s sees it', (who, expected) => {
    expect(canViewProject(project('PUBLISHED'), viewers[who])).toBe(expected);
  });

  it.each<[ProjectStatus, Who, number]>([
    ['DRAFT', 'client', 200],
    ['DRAFT', 'guest', 404],
    ['DRAFT', 'otherClient', 404],
    ['DRAFT', 'otherSpecialist', 404],
    ['DRAFT', 'admin', 200],
    ['IN_PROGRESS', 'client', 200],
    ['IN_PROGRESS', 'specialist', 200],
    ['IN_PROGRESS', 'otherSpecialist', 404],
    ['IN_PROGRESS', 'admin', 200],
    ['COMPLETED', 'guest', 404],
    ['CANCELLED', 'otherClient', 404],
  ])('a %s project: %s gets %i', (status, who, expected) => {
    expect(outcome(() => assertCanViewProject(project(status), viewers[who]))).toBe(expected);
  });

  it('answers a hidden project exactly like a missing one', () => {
    try {
      assertCanViewProject(project('DRAFT'), viewers.otherClient);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
      expect((error as HttpError).message).toBe(
        'Project b0000000-0000-4000-8000-000000000001 does not exist',
      );
    }
  });
});

describe('assertCanInspectProject (work log and report)', () => {
  it.each<[ProjectStatus, Who, number]>([
    ['IN_PROGRESS', 'client', 200],
    ['IN_PROGRESS', 'specialist', 200],
    ['IN_PROGRESS', 'admin', 200],
    ['IN_PROGRESS', 'otherSpecialist', 404],
    ['IN_PROGRESS', 'guest', 404],
    ['COMPLETED', 'client', 200],
    // Visible, but the hours are not the stranger's business.
    ['PUBLISHED', 'otherSpecialist', 403],
    ['PUBLISHED', 'guest', 401],
  ])('a %s project: %s gets %i', (status, who, expected) => {
    expect(outcome(() => assertCanInspectProject(project(status), viewers[who]))).toBe(expected);
  });
});

describe('assertCanManageProject (edit project, tasks, share links)', () => {
  it.each<[ProjectStatus, Who, number]>([
    ['DRAFT', 'client', 200],
    ['IN_PROGRESS', 'client', 200],
    ['IN_PROGRESS', 'specialist', 200],
    ['PUBLISHED', 'otherSpecialist', 403],
    ['DRAFT', 'otherClient', 404],
    ['IN_PROGRESS', 'otherSpecialist', 404],
    // The administrator moderates by deleting, never by rewriting.
    ['IN_PROGRESS', 'admin', 403],
    ['PUBLISHED', 'guest', 401],
  ])('a %s project: %s gets %i', (status, who, expected) => {
    expect(outcome(() => assertCanManageProject(project(status), viewers[who]))).toBe(expected);
  });
});

describe('assertCanDeleteProject', () => {
  it.each<[ProjectOrigin, Who, number]>([
    ['MARKETPLACE', 'client', 200],
    // The assigned specialist is a party, but not the owner of the project.
    ['MARKETPLACE', 'specialist', 403],
    ['MARKETPLACE', 'otherSpecialist', 404],
    ['MARKETPLACE', 'admin', 200],
    ['DIRECT', 'specialist', 200],
    ['DIRECT', 'otherSpecialist', 404],
    ['DIRECT', 'admin', 200],
  ])('%s project in progress: %s gets %i', (origin, who, expected) => {
    expect(
      outcome(() => assertCanDeleteProject(project('IN_PROGRESS', origin), viewers[who])),
    ).toBe(expected);
  });

  it('lets anyone who sees a published project try, but only the owner succeeds', () => {
    expect(outcome(() => assertCanDeleteProject(project('PUBLISHED'), viewers.otherClient))).toBe(
      403,
    );
  });
});

describe('assertCanCreateProject', () => {
  it.each<[ProjectOrigin, Who, number]>([
    ['MARKETPLACE', 'client', 200],
    ['MARKETPLACE', 'specialist', 403],
    ['MARKETPLACE', 'admin', 403],
    ['DIRECT', 'specialist', 200],
    ['DIRECT', 'client', 403],
    ['DIRECT', 'admin', 403],
  ])('%s: %s gets %i', (origin, who, expected) => {
    const role = viewers[who]!.role;
    expect(outcome(() => assertCanCreateProject(origin, role))).toBe(expected);
  });

  it('says which role would have been needed', () => {
    try {
      assertCanCreateProject('MARKETPLACE', 'SPECIALIST');
      expect.unreachable();
    } catch (error) {
      expect((error as HttpError).details).toEqual({
        origin: 'MARKETPLACE',
        requiredRole: 'CLIENT',
        role: 'SPECIALIST',
      });
    }
  });
});
