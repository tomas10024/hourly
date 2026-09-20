import { Router } from 'express';
import { z } from 'zod';
import {
  CreateProposalInput,
  ProposalStatus,
  UpdateProposalInput,
} from '@valandine/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireActor } from '../lib/actor.js';
import { created, noContent } from '../lib/http.js';
import { toProposal } from '../lib/serialize.js';
import { IdParam, parseBody, parseParams, parseQuery } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import {
  assertCanDecide,
  assertCanSubmitProposal,
  assertIsProposalAuthor,
  assertProjectAcceptsProposals,
  assertProposalIsDeletable,
  assertProposalIsPending,
} from '../services/proposals.js';

export const proposalsRouter: Router = Router();

const ProposalListQuery = z.object({ status: ProposalStatus.optional() });

/** Newest first - the client reviews the most recent offers. */
const PROPOSAL_ORDER: Prisma.ProposalOrderByWithRelationInput = { createdAt: 'desc' };

async function findProposalOr404(id: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!proposal) {
    throw new HttpError(404, 'NOT_FOUND', `Proposal ${id} does not exist`);
  }
  return proposal;
}

async function findProjectOr404(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', `Project ${id} does not exist`);
  }
  return project;
}

/**
 * GET /proposals - the actor's own offers and their statuses.
 *
 * Not part of the hierarchy, but a specialist has to be able to follow the
 * offers they made across projects without visiting each project in turn.
 */
proposalsRouter.get('/proposals', async (req, res) => {
  const actor = requireActor(req);
  const { status } = parseQuery(ProposalListQuery, req);

  const rows = await prisma.proposal.findMany({
    where: { specialistId: actor, ...(status ? { status } : {}) },
    orderBy: PROPOSAL_ORDER,
  });

  res.json(rows.map(toProposal));
});

/**
 * GET /projects/{id}/proposals - offers made for one project.
 *
 * Unlike the other listings this one is not public: competing bids reveal
 * prices. The client sees every offer, a specialist sees only their own.
 */
proposalsRouter.get('/projects/:id/proposals', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);

  const project = await findProjectOr404(id);
  const isClient = project.clientId === actor;

  const rows = await prisma.proposal.findMany({
    where: { projectId: id, ...(isClient ? {} : { specialistId: actor }) },
    orderBy: PROPOSAL_ORDER,
  });

  res.json(rows.map(toProposal));
});

/**
 * POST /projects/{id}/proposals - submit an offer.
 *
 * One offer per specialist per project, enforced by the `@@unique` constraint
 * in the schema; a repeated attempt surfaces as 409 through the error handler.
 */
proposalsRouter.post('/projects/:id/proposals', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);
  const input = parseBody(CreateProposalInput, req);

  const project = await findProjectOr404(id);
  assertProjectAcceptsProposals(project);
  assertCanSubmitProposal(project, actor);

  // The `@@unique([projectId, specialistId])` constraint is the real guarantee;
  // this lookup only turns it into an answer that names the existing offer.
  const existing = await prisma.proposal.findUnique({
    where: { projectId_specialistId: { projectId: id, specialistId: actor } },
  });
  if (existing) {
    throw new HttpError(409, 'PROPOSAL_ALREADY_SUBMITTED', 'You have already bid on this project', {
      proposalId: existing.id,
      status: existing.status,
    });
  }

  const row = await prisma.proposal.create({
    data: {
      projectId: id,
      specialistId: actor,
      price: input.price ?? null,
      hourlyRate: input.hourlyRate ?? null,
      estimatedDays: input.estimatedDays ?? null,
      message: input.message ?? null,
    },
  });

  created(res, `/api/proposals/${row.id}`, toProposal(row));
});

/**
 * PATCH /proposals/{id} - accept, reject or withdraw an offer.
 *
 * Who may do what differs per target status, so the permission check is chosen
 * by the requested transition rather than by the route.
 */
proposalsRouter.patch('/proposals/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);
  const { status } = parseBody(UpdateProposalInput, req);

  const proposal = await findProposalOr404(id);
  assertProposalIsPending(proposal);

  if (status === 'WITHDRAWN') {
    assertIsProposalAuthor(proposal, actor);
    const row = await prisma.proposal.update({ where: { id }, data: { status } });
    res.json(toProposal(row));
    return;
  }

  assertCanDecide(proposal.project, actor);

  if (status === 'REJECTED') {
    const row = await prisma.proposal.update({ where: { id }, data: { status } });
    res.json(toProposal(row));
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

  res.json(toProposal(accepted));
});

/** DELETE /proposals/{id} - withdraw an offer from the list entirely. */
proposalsRouter.delete('/proposals/:id', async (req, res) => {
  const { id } = parseParams(IdParam, req);
  const actor = requireActor(req);

  const proposal = await findProposalOr404(id);
  assertIsProposalAuthor(proposal, actor);
  assertProposalIsDeletable(proposal);

  await prisma.proposal.delete({ where: { id } });
  noContent(res);
});
