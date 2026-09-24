import type { ProjectOrigin, ProjectStatus, Role } from '@hourly/shared';
import { HttpError, unauthorized } from '../middleware/error.js';
import { assertCanManage } from './projects.js';

/**
 * Who may see and who may do what with a project and everything under it.
 *
 * Two answers are kept apart on purpose:
 *
 *   404 - the caller may not even see the resource. It is reported exactly
 *         like a resource that does not exist, so probing identifiers reveals
 *         nothing (a stranger's draft "does not exist" for them).
 *   403 - the caller can see the resource but may not do this to it (a
 *         specialist reading a published project may not edit it).
 *
 * Every check therefore starts with visibility, and only then asks about the
 * specific permission. The functions are pure - the routes load the rows and
 * pass in the caller - so the whole permission matrix is unit tested.
 */

/** The caller: a verified user, or `null` for an anonymous request. */
export type Viewer = { userId: string; role: Role } | null;

type ProjectAccess = {
  id: string;
  status: ProjectStatus;
  clientId: string | null;
  specialistId: string | null;
};

/** The client or the assigned specialist - the two parties of the work. */
export function isParty(
  project: { clientId: string | null; specialistId: string | null },
  viewer: Viewer,
): boolean {
  return (
    viewer !== null &&
    (project.clientId === viewer.userId || project.specialistId === viewer.userId)
  );
}

const isAdmin = (viewer: Viewer) => viewer?.role === 'ADMIN';

/**
 * A published project is on the marketplace for everyone, guests included.
 * Before and after that stage only its parties see it - and the administrator,
 * who moderates content and settles disputes.
 */
export function canViewProject(project: ProjectAccess, viewer: Viewer): boolean {
  return project.status === 'PUBLISHED' || isParty(project, viewer) || isAdmin(viewer);
}

export function assertCanViewProject(project: ProjectAccess, viewer: Viewer): void {
  if (!canViewProject(project, viewer)) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${project.id} does not exist`);
  }
}

/**
 * The work log and the report: hours and money are the business of the two
 * parties. The administrator may read them too, to settle a dispute, but may
 * not change them.
 */
export function assertCanInspectProject(project: ProjectAccess, viewer: Viewer): void {
  assertCanViewProject(project, viewer);
  if (viewer === null) throw unauthorized('AUTH_REQUIRED', 'Sign in to use this endpoint');
  if (!isParty(project, viewer) && !isAdmin(viewer)) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      'Only the parties of this project or an administrator may see its work log',
    );
  }
}

/**
 * Changing a project or what belongs to it (tasks, share links): the parties
 * only. The administrator is deliberately not included - moderation means
 * removing content, not rewriting someone else's work.
 */
export function assertCanManageProject(project: ProjectAccess, viewer: Viewer): void {
  assertCanViewProject(project, viewer);
  if (viewer === null) throw unauthorized('AUTH_REQUIRED', 'Sign in to use this endpoint');
  assertCanManage(project, viewer.userId);
}

/**
 * Deleting a project belongs to whoever created it: the client of a
 * marketplace project, the specialist of directly agreed work. The other party
 * may not wipe it - a specialist removing the client's project would take the
 * client's record of the work with it. The administrator may delete anything
 * that breaks the rules.
 */
export function assertCanDeleteProject(
  project: ProjectAccess & { origin: ProjectOrigin },
  viewer: Viewer,
): void {
  assertCanViewProject(project, viewer);
  if (viewer === null) throw unauthorized('AUTH_REQUIRED', 'Sign in to use this endpoint');
  if (isAdmin(viewer)) return;

  const owner = project.origin === 'MARKETPLACE' ? project.clientId : project.specialistId;
  if (owner !== viewer.userId) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      project.origin === 'MARKETPLACE'
        ? 'Only the client who published this project or an administrator may delete it'
        : 'Only the specialist who created this project or an administrator may delete it',
    );
  }
}

/**
 * The origin of a project decides who creates it: a client publishes work on
 * the marketplace, a specialist records work agreed directly. The
 * administrator does neither.
 */
export function requiredRoleToCreate(origin: ProjectOrigin): Role {
  return origin === 'MARKETPLACE' ? 'CLIENT' : 'SPECIALIST';
}

export function assertCanCreateProject(origin: ProjectOrigin, role: Role): void {
  const required = requiredRoleToCreate(origin);
  if (role !== required) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      origin === 'MARKETPLACE'
        ? 'Only a client may publish a marketplace project'
        : 'Only a specialist may create a directly agreed project',
      { origin, requiredRole: required, role },
    );
  }
}
