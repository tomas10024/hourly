import { describe, expect, it } from 'vitest';
import { HttpError } from '../middleware/error.js';
import {
  assertCanDecide,
  assertCanSubmitProposal,
  assertIsProposalAuthor,
  assertProjectAcceptsProposals,
  assertProposalIsDeletable,
  assertProposalIsPending,
} from './proposals.js';

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
const other = '33333333-3333-4333-8333-333333333333';

describe('assertProjectAcceptsProposals', () => {
  it('accepts bids on a published marketplace project', () => {
    expect(() =>
      assertProjectAcceptsProposals({ origin: 'MARKETPLACE', status: 'PUBLISHED' }),
    ).not.toThrow();
  });

  it('refuses directly agreed work outright', () => {
    const error = thrownBy(() =>
      assertProjectAcceptsProposals({ origin: 'DIRECT', status: 'IN_PROGRESS' }),
    );
    expect(error.status).toBe(422);
    expect(error.code).toBe('NO_PROPOSAL_STAGE');
  });

  it('refuses a marketplace project that is not published', () => {
    for (const status of ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) {
      const error = thrownBy(() =>
        assertProjectAcceptsProposals({ origin: 'MARKETPLACE', status }),
      );
      expect(error.code).toBe('PROJECT_NOT_PUBLISHED');
    }
  });
});

describe('assertCanSubmitProposal', () => {
  it('lets a specialist bid', () => {
    expect(() => assertCanSubmitProposal({ clientId: client }, specialist)).not.toThrow();
  });

  it('does not let the client bid on their own project', () => {
    expect(thrownBy(() => assertCanSubmitProposal({ clientId: client }, client)).status).toBe(403);
  });
});

describe('assertProposalIsPending', () => {
  it('allows a decision on an open offer', () => {
    expect(() => assertProposalIsPending({ status: 'PENDING' })).not.toThrow();
  });

  it('refuses to reopen a settled offer', () => {
    for (const status of ['ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const) {
      const error = thrownBy(() => assertProposalIsPending({ status }));
      expect(error.status).toBe(422);
      expect(error.code).toBe('PROPOSAL_NOT_PENDING');
    }
  });
});

describe('who decides what', () => {
  it('lets only the client accept or reject', () => {
    expect(() => assertCanDecide({ clientId: client }, client)).not.toThrow();
    expect(thrownBy(() => assertCanDecide({ clientId: client }, specialist)).status).toBe(403);
    expect(thrownBy(() => assertCanDecide({ clientId: null }, specialist)).status).toBe(403);
  });

  it('lets only the author withdraw or delete', () => {
    expect(() => assertIsProposalAuthor({ specialistId: specialist }, specialist)).not.toThrow();
    expect(thrownBy(() => assertIsProposalAuthor({ specialistId: specialist }, other)).status).toBe(403);
  });
});

describe('assertProposalIsDeletable', () => {
  it('allows removing offers that were never accepted', () => {
    for (const status of ['PENDING', 'REJECTED', 'WITHDRAWN'] as const) {
      expect(() => assertProposalIsDeletable({ status })).not.toThrow();
    }
  });

  it('keeps the accepted offer as the record of the award', () => {
    const error = thrownBy(() => assertProposalIsDeletable({ status: 'ACCEPTED' }));
    expect(error.status).toBe(422);
    expect(error.code).toBe('PROPOSAL_ACCEPTED');
  });
});
