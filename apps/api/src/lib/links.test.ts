import { describe, expect, it } from 'vitest';
import type {
  Project,
  Proposal,
  ShareLink,
  Task,
  WorkSession,
} from '../generated/prisma/client.js';
import type { Viewer } from '../services/access.js';
import { projectLinks, proposalLinks, sessionLinks, shareLinks, taskLinks } from './links.js';

/**
 * The action links must match what the routes accept. Each case below is a
 * role and a state from the permission matrix (README 5.3); the expected
 * actions are the ones the corresponding request would be allowed to do.
 */

const CLIENT = '11111111-1111-4111-8111-111111111111';
const SPECIALIST = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const ADMIN = '44444444-4444-4444-8444-444444444444';

const asClient: Viewer = { userId: CLIENT, role: 'CLIENT' };
const asSpecialist: Viewer = { userId: SPECIALIST, role: 'SPECIALIST' };
const asStranger: Viewer = { userId: STRANGER, role: 'SPECIALIST' };
const asAdmin: Viewer = { userId: ADMIN, role: 'ADMIN' };

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Parduotuvė',
    description: 'Administravimo sritis',
    origin: 'MARKETPLACE',
    status: 'IN_PROGRESS',
    taskAuthoring: 'CLIENT',
    budgetMin: null,
    budgetMax: null,
    hourlyRate: null,
    deadline: null,
    externalClientName: null,
    clientId: CLIENT,
    specialistId: SPECIALIST,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const task = (overrides: Partial<Task> = {}): Task =>
  ({ id: 't1', projectId: 'p1', approvedAt: null, ...overrides }) as Task;
const session = (overrides: Partial<WorkSession> = {}): WorkSession =>
  ({ id: 's1', taskId: 't1', specialistId: SPECIALIST, endedAt: null, ...overrides }) as WorkSession;
const proposal = (overrides: Partial<Proposal> = {}): Proposal =>
  ({ id: 'o1', projectId: 'p1', specialistId: STRANGER, status: 'PENDING', ...overrides }) as Proposal;

const actions = (links: Record<string, { method?: string }>) =>
  Object.entries(links)
    .filter(([, link]) => link.method !== undefined)
    .map(([rel]) => rel)
    .sort();

describe('projectLinks', () => {
  it('always leads to the project itself and its tasks', () => {
    const links = projectLinks(project({ status: 'PUBLISHED' }), null);
    expect(links.self?.href).toBe('/api/projects/p1');
    expect(links.tasks?.href).toBe('/api/projects/p1/tasks');
  });

  it('offers a guest nothing to do and no bids to read', () => {
    const links = projectLinks(project({ status: 'PUBLISHED', specialistId: null }), null);
    expect(actions(links)).toEqual([]);
    expect(links.proposals).toBeUndefined();
    expect(links.report).toBeUndefined();
  });

  it('offers the client of a draft editing, publishing, cancelling and deleting', () => {
    const links = projectLinks(project({ status: 'DRAFT', specialistId: null }), asClient);
    expect(actions(links)).toEqual(['cancel', 'create-task', 'delete', 'publish', 'update']);
    expect(links.shares?.href).toBe('/api/projects/p1/shares');
  });

  it('offers a specialist a bid on a published project, and nothing more', () => {
    const links = projectLinks(project({ status: 'PUBLISHED', specialistId: null }), asStranger);
    expect(actions(links)).toEqual(['submit-proposal']);
    expect(links['submit-proposal']?.method).toBe('POST');
  });

  it('follows the status: a running project can be completed, not published', () => {
    const links = projectLinks(project(), asClient);
    expect(links.complete?.method).toBe('PATCH');
    expect(links.publish).toBeUndefined();
    expect(links['submit-proposal']).toBeUndefined();
  });

  it('offers no new work on a closed project', () => {
    const links = projectLinks(project({ status: 'COMPLETED' }), asClient);
    expect(actions(links)).toEqual(['delete', 'update']);
    expect(links['create-task']).toBeUndefined();
  });

  it('gives the administrator the report and deletion, not editing', () => {
    const links = projectLinks(project(), asAdmin);
    expect(links.report).toBeDefined();
    expect(actions(links)).toEqual(['delete']);
  });
});

describe('taskLinks', () => {
  it('lets the assigned specialist start the timer', () => {
    const links = taskLinks(task(), project(), asSpecialist);
    expect(links['start-session']?.href).toBe('/api/projects/p1/tasks/t1/sessions');
    expect(links.sessions).toBeDefined();
  });

  it('offers approval to the client only while the task is unapproved', () => {
    const specialistList = project({ taskAuthoring: 'SPECIALIST' });
    expect(taskLinks(task(), specialistList, asClient).approve).toBeDefined();
    expect(taskLinks(task({ approvedAt: new Date() }), specialistList, asClient).approve).toBeUndefined();
    expect(taskLinks(task(), specialistList, asSpecialist).approve).toBeUndefined();
  });

  it('shows a bidder the planned work but not the hours', () => {
    const links = taskLinks(task(), project({ status: 'PUBLISHED', specialistId: null }), asStranger);
    expect(actions(links)).toEqual([]);
    expect(links.sessions).toBeUndefined();
  });
});

describe('sessionLinks', () => {
  it('lets the author stop a running session', () => {
    const links = sessionLinks(session(), task(), project(), asSpecialist);
    expect(links.self?.href).toBe('/api/projects/p1/tasks/t1/sessions/s1');
    expect(links.stop?.method).toBe('PATCH');
  });

  it('offers no stop once the session has ended', () => {
    const links = sessionLinks(session({ endedAt: new Date() }), task(), project(), asSpecialist);
    expect(links.stop).toBeUndefined();
    expect(links.update).toBeDefined();
  });

  it('lets the client read the hours but not change them', () => {
    expect(actions(sessionLinks(session(), task(), project(), asClient))).toEqual([]);
  });
});

describe('proposalLinks', () => {
  const published = project({ status: 'PUBLISHED', specialistId: null });

  it('lets the client accept or reject a pending offer', () => {
    expect(actions(proposalLinks(proposal(), published, asClient))).toEqual(['accept', 'reject']);
  });

  it('lets the author withdraw or delete a pending offer', () => {
    expect(actions(proposalLinks(proposal(), published, asStranger))).toEqual(['delete', 'withdraw']);
  });

  it('keeps an accepted offer as it is', () => {
    const accepted = proposal({ status: 'ACCEPTED' });
    expect(actions(proposalLinks(accepted, project(), asStranger))).toEqual([]);
    expect(actions(proposalLinks(accepted, project(), asClient))).toEqual([]);
  });
});

describe('shareLinks', () => {
  it('offers revoking only a link that is not revoked yet', () => {
    const link = { id: 'l1', projectId: 'p1', revokedAt: null } as ShareLink;
    expect(shareLinks(link).revoke?.href).toBe('/api/projects/p1/shares/l1');
    expect(shareLinks({ ...link, revokedAt: new Date() }).revoke).toBeUndefined();
  });
});
