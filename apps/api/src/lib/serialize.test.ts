import { describe, expect, it } from 'vitest';
import { Project, ShareLink, Task, WorkSession, CurrentUser } from '@hourly/shared';
import { Prisma } from '../generated/prisma/client.js';
import type {
  Project as ProjectRow,
  ShareLink as ShareLinkRow,
  Task as TaskRow,
  User as UserRow,
} from '../generated/prisma/client.js';
import {
  money,
  iso,
  toCurrentUser,
  toProject,
  toShareLink,
  toTask,
  toSession,
  type SessionRow,
} from './serialize.js';

/**
 * These tests keep the responses in step with their own OpenAPI document:
 * the serialized result is fed to the very Zod schema the specification is
 * generated from. If the two drift apart, the test fails.
 *
 * Sample values are Lithuanian on purpose - they are domain content, not code.
 */

const D = (value: string) => new Prisma.Decimal(value);
const T = (value: string) => new Date(value);

describe('money', () => {
  it('converts Decimal into a number with two decimal places', () => {
    expect(money(D('1200'))).toBe(1200);
    expect(money(D('35.5'))).toBe(35.5);
    expect(money(D('35.005'))).toBe(35.01);
  });

  it('keeps null as null (the field is optional)', () => {
    expect(money(null)).toBeNull();
  });
});

describe('iso', () => {
  it('converts Date into an ISO 8601 string', () => {
    expect(iso(T('2026-09-20T12:00:00.000Z'))).toBe('2026-09-20T12:00:00.000Z');
    expect(iso(null)).toBeNull();
  });
});

describe('toProject', () => {
  const row: ProjectRow = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Internetinė parduotuvė',
    description: 'Administravimo sritis užsakymams tvarkyti.',
    origin: 'MARKETPLACE',
    status: 'IN_PROGRESS',
    taskAuthoring: 'CLIENT',
    budgetMin: D('1200'),
    budgetMax: D('2000.50'),
    hourlyRate: D('35'),
    deadline: T('2026-12-01T00:00:00.000Z'),
    externalClientName: null,
    clientId: '22222222-2222-4222-8222-222222222222',
    specialistId: null,
    createdAt: T('2026-09-01T10:00:00.000Z'),
    updatedAt: T('2026-09-10T10:00:00.000Z'),
  };

  it('produces a value accepted by the Project schema (i.e. the OpenAPI contract)', () => {
    expect(() => Project.parse(toProject(row))).not.toThrow();
  });

  it('turns Decimal fields into numbers and dates into strings', () => {
    const result = toProject(row);
    expect(result.budgetMin).toBe(1200);
    expect(result.budgetMax).toBe(2000.5);
    expect(result.deadline).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('toTask and toSession', () => {
  it('produces a task accepted by the Task schema', () => {
    const row: TaskRow = {
      id: '33333333-3333-4333-8333-333333333333',
      projectId: '11111111-1111-4111-8111-111111111111',
      title: 'Užsakymų sąrašas',
      description: null,
      status: 'IN_PROGRESS',
      position: 1,
      hourlyRate: D('45'),
      estimatedHours: D('8.5'),
      approvedAt: null,
      createdAt: T('2026-09-01T10:00:00.000Z'),
      updatedAt: T('2026-09-01T10:00:00.000Z'),
    };
    expect(() => Task.parse(toTask(row))).not.toThrow();
    expect(toTask(row).estimatedHours).toBe(8.5);
  });

  it('produces a running session accepted by the WorkSession schema', () => {
    const row: SessionRow = {
      id: '44444444-4444-4444-8444-444444444444',
      task: { projectId: '11111111-1111-4111-8111-111111111111' },
      taskId: '33333333-3333-4333-8333-333333333333',
      specialistId: '55555555-5555-4555-8555-555555555555',
      startedAt: T('2026-09-20T09:00:00.000Z'),
      endedAt: null,
      durationMinutes: null,
      comment: null,
      appliedRate: null,
      createdAt: T('2026-09-20T09:00:00.000Z'),
      updatedAt: T('2026-09-20T09:00:00.000Z'),
    };
    const result = toSession(row);
    expect(() => WorkSession.parse(result)).not.toThrow();
    expect(result.endedAt).toBeNull();
    expect(result.projectId).toBe('11111111-1111-4111-8111-111111111111');
  });
});

describe('secrets never reach the response', () => {
  it('serializes a share link without its token hash', () => {
    const row: ShareLinkRow = {
      id: '66666666-6666-4666-8666-666666666666',
      projectId: '11111111-1111-4111-8111-111111111111',
      tokenHash: 'ac1d-secret-hash',
      expiresAt: T('2026-10-20T00:00:00.000Z'),
      revokedAt: null,
      lastViewedAt: null,
      createdAt: T('2026-09-20T00:00:00.000Z'),
    };
    const result = toShareLink(row);
    expect(() => ShareLink.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('secret-hash');
  });

  it('serializes a user without the password hash', () => {
    const row: UserRow = {
      id: '55555555-5555-4555-8555-555555555555',
      email: 'specialistas@hourly.lt',
      passwordHash: 'bcrypt-secret-value',
      displayName: 'Specialistas',
      role: 'SPECIALIST',
      bio: null,
      isBlocked: false,
      createdAt: T('2026-09-01T10:00:00.000Z'),
      updatedAt: T('2026-09-01T10:00:00.000Z'),
    };
    const result = toCurrentUser(row);
    expect(() => CurrentUser.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
