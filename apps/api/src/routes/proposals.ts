import { Router, type Request } from 'express';
import { CreateProposalInput, ProposalListQuery, UpdateProposalInput } from '@hourly/shared';
import type { Prisma, Project, Proposal } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor, requireAuth, requireRoleOf, viewer } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { linked, proposalLinks } from '../lib/links.js';
import { pageArgs, pageOf } from '../lib/pagination.js';
import { toProposal } from '../lib/serialize.js';
import {
  ProjectParams,
  ProposalParams,
  findProjectOr404,
  findProposalOr404,
} from '../lib/scope.js';
import { parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import { assertCanViewProject } from '../services/access.js';
import {
  assertCanDecide,
  assertCanSeeProposal,
  assertCanSubmitProposal,
  assertIsProposalAuthor,
  assertProjectAcceptsProposals,
  assertProposalIsDeletable,
  assertProposalIsPending,
  seesAllProposals,
} from '../services/proposals.js';

export const proposalsRouter: Router = Router();

/** A proposal as it is sent: its fields and the links this caller is offered. */
function present(proposal: Proposal, project: Project, req: Request) {
  return linked(toProposal(proposal), proposalLinks(proposal, project, viewer(req)));
}

/** Newest first - the client reviews the most recent offers. */
const PROPOSAL_ORDER: Prisma.ProposalOrderByWithRelationInput = { createdAt: 'desc' };

/**
 * GET /proposals - the actor's own offers and their statuses.
 *
 * Not part of the hierarchy, but a specialist has to be able to follow the
 * offers they made across projects without visiting each project in turn.
 */
proposalsRouter.get('/proposals', async (req, res) => {
  const actor = requireActor(req);
  const query = parseQuery(ProposalListQuery, req);

  const where: Prisma.ProposalWhereInput = {
    specialistId: actor,
    ...(query.status ? { status: query.status } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.proposal.findMany({
      where,
      include: { project: true },
      orderBy: PROPOSAL_ORDER,
      ...pageArgs(query),
    }),
    prisma.proposal.count({ where }),
  ]);

  const items = rows.map((row) => present(row, row.project, req));
  res.json(pageOf(req, items, total, query));
});

/**
 * GET /projects/{projectId}/proposals - offers made for one project.
 *
 * Unlike the other listings this one is not public: competing bids reveal
 * prices. The client (and the administrator) sees every offer, a specialist
 * sees only their own.
 */
proposalsRouter.get('/projects/:projectId/proposals', async (req, res) => {
  const params = parseParams(ProjectParams, req);
  const auth = requireAuth(req);
  const query = parseQuery(ProposalListQuery, req);

  const project = await findProjectOr404(params);
  assertCanViewProject(project, auth);

  const where: Prisma.ProposalWhereInput = {
    projectId: project.id,
    ...(seesAllProposals(project, auth) ? {} : { specialistId: auth.userId }),
    ...(query.status ? { status: query.status } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.proposal.findMany({ where, orderBy: PROPOSAL_ORDER, ...pageArgs(query) }),
    prisma.proposal.count({ where }),
  ]);

  const items = rows.map((row) => present(row, project, req));
  res.json(pageOf(req, items, total, query));
});

/**
 * GET /projects/{projectId}/proposals/{proposalId} - a single offer, visible
 * to the same people who see it in the project's list.
 */
proposalsRouter.get('/projects/:projectId/proposals/:proposalId', async (req, res) => {
  const params = parseParams(ProposalParams, req);
  const auth = requireAuth(req);

  const proposal = await findProposalOr404(params);
  assertCanViewProject(proposal.project, auth);
  assertCanSeeProposal(proposal, proposal.project, auth);

  res.json(present(proposal, proposal.project, req));
});

/**
 * POST /projects/{projectId}/proposals - submit an offer.
 *
 * Bidding is what specialists do, so the role is checked first. One offer per
 * specialist per project, enforced by the `@@unique` constraint in the schema;
 * a repeated attempt surfaces as 409 through the error handler.
 */
proposalsRouter.post('/projects/:projectId/proposals', async (req, res) => {
  const params = parseParams(ProjectParams, req);
  const actor = requireRoleOf(req, 'SPECIALIST');
  const input = parseBody(CreateProposalInput, req);

  const project = await findProjectOr404(params);
  assertCanViewProject(project, viewer(req));
  assertProjectAcceptsProposals(project);
  assertCanSubmitProposal(project, actor);

  // The `@@unique([projectId, specialistId])` constraint is the real guarantee;
  // this lookup only turns it into an answer that names the existing offer.
  const existing = await prisma.proposal.findUnique({
    where: { projectId_specialistId: { projectId: project.id, specialistId: actor } },
  });
  if (existing) {
    throw new HttpError(409, 'PROPOSAL_ALREADY_SUBMITTED', 'You have already bid on this project', {
      proposalId: existing.id,
      status: existing.status,
    });
  }

  const row = await prisma.proposal.create({
    data: {
      projectId: project.id,
      specialistId: actor,
      price: input.price ?? null,
      hourlyRate: input.hourlyRate ?? null,
      estimatedDays: input.estimatedDays ?? null,
      message: input.message ?? null,
    },
  });

  created(res, `/api/projects/${project.id}/proposals/${row.id}`, present(row, project, req));
});

/**
 * PATCH /projects/{projectId}/proposals/{proposalId} - accept, reject or
 * withdraw an offer.
 *
 * Who may do what differs per target status, so the permission check is chosen
 * by the requested transition rather than by the route.
 */
proposalsRouter.patch('/projects/:projectId/proposals/:proposalId', async (req, res) => {
  const params = parseParams(ProposalParams, req);
  const actor = requireActor(req);
  const { status } = parseBody(UpdateProposalInput, req);

  const proposal = await findProposalOr404(params);
  const { id } = proposal;
  assertProposalIsPending(proposal);

  if (status === 'WITHDRAWN') {
    assertIsProposalAuthor(proposal, actor);
    const row = await prisma.proposal.update({ where: { id }, data: { status } });
    res.json(present(row, proposal.project, req));
    return;
  }

  assertCanDecide(proposal.project, actor);

  if (status === 'REJECTED') {
    const row = await prisma.proposal.update({ where: { id }, data: { status } });
    res.json(present(row, proposal.project, req));
    return;
  }

  // Accepting is the moment a marketplace project actually starts, and it
  // changes three things at once. They run in one transaction so the project
  // can never end up IN_PROGRESS without a specialist, and the losing offers
  // can never stay PENDING forever.
  assertProjectAcceptsProposals(proposal.project);

  const accepted = await prisma.$transaction(async (tx) => {
    // First, so that the partial unique index `proposals_one_accepted_per_project`
    // rejects a second acceptance before anything else is touched.
    const row = await tx.proposal.update({ where: { id }, data: { status: 'ACCEPTED' } });

    await tx.proposal.updateMany({
      where: { projectId: proposal.projectId, status: 'PENDING', id: { not: id } },
      data: { status: 'REJECTED' },
    });

    await tx.project.update({
      where: { id: proposal.projectId },
      data: { status: 'IN_PROGRESS', specialistId: proposal.specialistId },
    });

    return row;
  });

  // The project changed inside the transaction, and the links follow it.
  const project = await findProjectOr404({ projectId: proposal.projectId });
  res.json(present(accepted, project, req));
});

/**
 * DELETE /projects/{projectId}/proposals/{proposalId} - withdraw an offer from
 * the list entirely.
 */
proposalsRouter.delete('/projects/:projectId/proposals/:proposalId', async (req, res) => {
  const params = parseParams(ProposalParams, req);
  const actor = requireActor(req);

  const proposal = await findProposalOr404(params);
  assertIsProposalAuthor(proposal, actor);
  assertProposalIsDeletable(proposal);

  await prisma.proposal.delete({ where: { id: proposal.id } });
  noContent(res);
});
