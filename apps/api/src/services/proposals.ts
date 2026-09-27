import type { ProjectOrigin, ProjectStatus, ProposalStatus, Role } from '@hourly/shared';
import { HttpError } from '../middleware/error.js';

/**
 * Proposal domain rules.
 *
 * A proposal is what drives a marketplace project from "published" to "being
 * worked on". It sits beside the project -> task -> session hierarchy rather
 * than inside it, so its rules are about who may decide what, and when.
 */

/**
 * Bidding is only open on a published marketplace project.
 *
 * Directly agreed work is rejected separately, because there the answer is not
 * "not yet" but "never": such a project is created by the specialist who
 * already has the job.
 */
export function assertProjectAcceptsProposals(project: {
  origin: ProjectOrigin;
  status: ProjectStatus;
}): void {
  if (project.origin !== 'MARKETPLACE') {
    throw new HttpError(
      422,
      'NO_PROPOSAL_STAGE',
      'Directly agreed work has no proposal stage',
      { origin: project.origin },
    );
  }

  if (project.status !== 'PUBLISHED') {
    throw new HttpError(
      422,
      'PROJECT_NOT_PUBLISHED',
      `Proposals are accepted only while the project is PUBLISHED, this one is ${project.status}`,
      { status: project.status },
    );
  }
}

/** Nobody may bid on their own project. */
export function assertCanSubmitProposal(
  project: { clientId: string | null },
  actorId: string,
): void {
  if (project.clientId === actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'The client of a project cannot bid on it');
  }
}

/**
 * Every decision applies to a proposal that is still open.
 *
 * Without this an already rejected proposal could be accepted later, quietly
 * replacing the specialist who is doing the work.
 */
export function assertProposalIsPending(proposal: { status: ProposalStatus }): void {
  if (proposal.status !== 'PENDING') {
    throw new HttpError(
      422,
      'PROPOSAL_NOT_PENDING',
      `Only a PENDING proposal can be changed, this one is ${proposal.status}`,
      { status: proposal.status },
    );
  }
}

/** Accepting and rejecting are the decisions of the client who published the work. */
export function assertCanDecide(project: { clientId: string | null }, actorId: string): void {
  if (project.clientId === null || project.clientId !== actorId) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      'Only the client of the project may accept or reject proposals',
    );
  }
}

/** Withdrawing and deleting belong to the specialist who submitted the proposal. */
export function assertIsProposalAuthor(
  proposal: { specialistId: string },
  actorId: string,
): void {
  if (proposal.specialistId !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the specialist who submitted it may change this proposal');
  }
}

/**
 * An accepted proposal is the record of how the project was awarded, so it
 * cannot simply be deleted while the work is assigned.
 */
export function assertProposalIsDeletable(proposal: { status: ProposalStatus }): void {
  if (proposal.status === 'ACCEPTED') {
    throw new HttpError(
      422,
      'PROPOSAL_ACCEPTED',
      'An accepted proposal cannot be deleted - it is the record of how the project was awarded',
    );
  }
}

/**
 * Competing bids reveal prices: the client of the project and the
 * administrator see every offer, a specialist only their own. For anyone else
 * the offer does not exist (404), just as it is absent from their list.
 */
export function seesAllProposals(
  project: { clientId: string | null },
  viewer: { userId: string; role: Role },
): boolean {
  return project.clientId === viewer.userId || viewer.role === 'ADMIN';
}

export function assertCanSeeProposal(
  proposal: { id: string; specialistId: string },
  project: { clientId: string | null },
  viewer: { userId: string; role: Role },
): void {
  if (!seesAllProposals(project, viewer) && proposal.specialistId !== viewer.userId) {
    throw new HttpError(404, 'NOT_FOUND', `Proposal ${proposal.id} does not exist`);
  }
}
