import type { Request } from 'express';
import type { Links, ProjectStatus } from '@hourly/shared';
import type {
  Project,
  Proposal,
  ShareLink,
  Task,
  WorkSession,
} from '../generated/prisma/client.js';
import { HttpError } from '../middleware/error.js';
import {
  type Viewer,
  assertCanDeleteProject,
  assertCanInspectProject,
  assertCanManageProject,
  assertCanViewProject,
} from '../services/access.js';
import { ALLOWED_STATUS_TRANSITIONS } from '../services/projects.js';
import {
  assertCanDecide,
  assertCanSubmitProposal,
  assertIsProposalAuthor,
  assertProjectAcceptsProposals,
  assertProposalIsDeletable,
  assertProposalIsPending,
} from '../services/proposals.js';
import {
  assertIsAssignedSpecialist,
  assertIsSessionAuthor,
  assertProjectAcceptsWork,
} from '../services/sessions.js';
import {
  assertCanApproveTasks,
  assertCanAuthorTasks,
  assertProjectAcceptsTasks,
} from '../services/tasks.js';
import type { Page } from './pagination.js';

/**
 * Hypermedia: the `_links` of every response.
 *
 * Two kinds of links, in HAL style:
 *
 *   relations - where related resources live (`self`, `project`, `tasks`).
 *               They depend only on the resource.
 *   actions   - what the caller may do right now (`update`, `publish`,
 *               `stop`), with the HTTP method to use. They depend on who is
 *               asking and on the state of the resource: a draft offers
 *               `publish`, a running session offers `stop`, a stranger is
 *               offered nothing.
 *
 * An action is offered exactly when the route would accept it, because it is
 * decided by running the route's own checks (`allows`) rather than by a second
 * copy of the rules. A client can therefore show the buttons that come with
 * the links and never has to know the permission matrix. The only thing an
 * action link cannot promise is the absence of a conflict (409) - e.g. a
 * second running session - which depends on other resources.
 *
 * Addresses are relative (`/api/...`), so they stay correct behind the web
 * proxy and in any deployment.
 */

const API = '/api';

/** True when every check passes, i.e. the route would let this caller through. */
function allows(...checks: Array<() => void>): boolean {
  try {
    for (const check of checks) check();
    return true;
  } catch (error) {
    if (error instanceof HttpError) return false;
    throw error;
  }
}

/** The name of the action that moves a project to a given status. */
const TRANSITION: Record<ProjectStatus, string | null> = {
  DRAFT: null,
  PUBLISHED: 'publish',
  // Reached only by accepting a proposal, never by editing the project.
  IN_PROGRESS: null,
  COMPLETED: 'complete',
  CANCELLED: 'cancel',
};

/** Attaches `_links` to a serialized resource. */
export function linked<T extends object>(body: T, links: Links): T & { _links: Links } {
  return { ...body, _links: links };
}

export const paths = {
  project: (projectId: string) => `${API}/projects/${projectId}`,
  task: (projectId: string, taskId: string) => `${paths.project(projectId)}/tasks/${taskId}`,
  session: (projectId: string, taskId: string, sessionId: string) =>
    `${paths.task(projectId, taskId)}/sessions/${sessionId}`,
  proposal: (projectId: string, proposalId: string) =>
    `${paths.project(projectId)}/proposals/${proposalId}`,
  share: (projectId: string, shareId: string) => `${paths.project(projectId)}/shares/${shareId}`,
  user: (userId: string) => `${API}/users/${userId}`,
};

/**
 * A project. Its status transitions (`publish`, `complete`, `cancel`) are all
 * `PATCH` on the project with `{"status": ...}`; which of them appear follows
 * the allowed transitions from the current status.
 */
export function projectLinks(project: Project, viewer: Viewer): Links {
  const self = paths.project(project.id);
  const links: Links = {
    self: { href: self },
    tasks: { href: `${self}/tasks` },
  };

  if (viewer) links.proposals = { href: `${self}/proposals` };
  if (project.clientId) links.client = { href: paths.user(project.clientId) };
  if (project.specialistId) links.specialist = { href: paths.user(project.specialistId) };
  if (allows(() => assertCanInspectProject(project, viewer))) {
    links.report = { href: `${self}/report` };
  }

  if (allows(() => assertCanManageProject(project, viewer))) {
    links.shares = { href: `${self}/shares` };
    links.update = { href: self, method: 'PATCH' };
    for (const target of ALLOWED_STATUS_TRANSITIONS[project.status]) {
      const action = TRANSITION[target];
      if (action) links[action] = { href: self, method: 'PATCH' };
    }
  }

  if (
    viewer &&
    allows(
      () => assertCanViewProject(project, viewer),
      () => assertProjectAcceptsTasks(project),
      () => assertCanAuthorTasks(project, viewer.userId),
    )
  ) {
    links['create-task'] = { href: `${self}/tasks`, method: 'POST' };
  }

  if (
    viewer?.role === 'SPECIALIST' &&
    allows(
      () => assertCanViewProject(project, viewer),
      () => assertProjectAcceptsProposals(project),
      () => assertCanSubmitProposal(project, viewer.userId),
    )
  ) {
    links['submit-proposal'] = { href: `${self}/proposals`, method: 'POST' };
  }

  if (allows(() => assertCanDeleteProject(project, viewer))) {
    links.delete = { href: self, method: 'DELETE' };
  }

  return links;
}

/** A task of `project`. */
export function taskLinks(task: Task, project: Project, viewer: Viewer): Links {
  const self = paths.task(project.id, task.id);
  const links: Links = {
    self: { href: self },
    project: { href: paths.project(project.id) },
  };

  if (allows(() => assertCanInspectProject(project, viewer))) {
    links.sessions = { href: `${self}/sessions` };
  }

  const editable = allows(
    () => assertCanManageProject(project, viewer),
    () => assertProjectAcceptsTasks(project),
  );
  if (editable) {
    links.update = { href: self, method: 'PATCH' };
    links.delete = { href: self, method: 'DELETE' };
  }
  if (
    editable &&
    viewer &&
    task.approvedAt === null &&
    allows(() => assertCanApproveTasks(project, viewer.userId))
  ) {
    links.approve = { href: self, method: 'PATCH' };
  }

  if (
    viewer &&
    allows(
      () => assertCanViewProject(project, viewer),
      () => assertProjectAcceptsWork(project),
      () => assertIsAssignedSpecialist(project, viewer.userId),
    )
  ) {
    links['start-session'] = { href: `${self}/sessions`, method: 'POST' };
  }

  return links;
}

/** A work session of `task` in `project`. `stop` is a `PATCH` with `endedAt`. */
export function sessionLinks(
  session: WorkSession,
  task: Task,
  project: Project,
  viewer: Viewer,
): Links {
  const self = paths.session(project.id, task.id, session.id);
  const links: Links = {
    self: { href: self },
    task: { href: paths.task(project.id, task.id) },
    project: { href: paths.project(project.id) },
  };

  if (
    viewer &&
    allows(
      () => assertCanViewProject(project, viewer),
      () => assertIsSessionAuthor(session, viewer.userId),
      () => assertProjectAcceptsWork(project),
    )
  ) {
    if (session.endedAt === null) links.stop = { href: self, method: 'PATCH' };
    links.update = { href: self, method: 'PATCH' };
    links.delete = { href: self, method: 'DELETE' };
  }

  return links;
}

/**
 * A proposal for `project`. `accept`, `reject` and `withdraw` are `PATCH` with
 * the target `status`.
 */
export function proposalLinks(proposal: Proposal, project: Project, viewer: Viewer): Links {
  const self = paths.proposal(project.id, proposal.id);
  const links: Links = {
    self: { href: self },
    project: { href: paths.project(project.id) },
    specialist: { href: paths.user(proposal.specialistId) },
  };
  if (!viewer) return links;

  const pending = allows(() => assertProposalIsPending(proposal));
  const decides = pending && allows(() => assertCanDecide(project, viewer.userId));
  if (decides && allows(() => assertProjectAcceptsProposals(project))) {
    links.accept = { href: self, method: 'PATCH' };
  }
  if (decides) links.reject = { href: self, method: 'PATCH' };

  const isAuthor = allows(() => assertIsProposalAuthor(proposal, viewer.userId));
  if (isAuthor && pending) links.withdraw = { href: self, method: 'PATCH' };
  if (isAuthor && allows(() => assertProposalIsDeletable(proposal))) {
    links.delete = { href: self, method: 'DELETE' };
  }

  return links;
}

/**
 * A share link. It has no `self`: a link cannot be read back on its own (the
 * token is shown once), only listed with its project or revoked.
 */
export function shareLinks(link: ShareLink): Links {
  const links: Links = { project: { href: paths.project(link.projectId) } };
  if (link.revokedAt === null) {
    links.revoke = { href: paths.share(link.projectId, link.id), method: 'DELETE' };
  }
  return links;
}

/** A user profile. */
export function userLinks(userId: string): Links {
  return { self: { href: paths.user(userId) } };
}

/**
 * The links of a list page: `self`, `first`, `last` and, where they exist,
 * `prev` and `next`. They keep every filter of the request and change only
 * `page`, so following `next` continues the same selection.
 */
export function pageLinks(
  req: Request,
  page: Pick<Page<unknown>, 'page' | 'perPage' | 'totalPages'>,
): Links {
  const current = new URL(req.originalUrl, 'http://localhost');
  const at = (n: number) => {
    const url = new URL(current);
    url.searchParams.set('page', String(n));
    url.searchParams.set('perPage', String(page.perPage));
    return { href: `${url.pathname}${url.search}` };
  };

  const last = Math.max(page.totalPages, 1);
  const links: Links = { self: at(page.page), first: at(1), last: at(last) };
  // From past the end, "previous" is the last page that has anything.
  if (page.page > 1) links.prev = at(Math.min(page.page - 1, last));
  if (page.page < last) links.next = at(page.page + 1);
  return links;
}
