import { createDocument } from 'zod-openapi';
import { z } from 'zod';
import {
  ApiError,
  AuthResponse,
  CreateProjectInput,
  CreateProposalInput,
  CreateShareLinkInput,
  CreateTaskInput,
  CreateWorkSessionInput,
  CurrentUser,
  LoginInput,
  Project,
  ProjectListQuery,
  ProjectReport,
  Proposal,
  ProposalStatus,
  PublicProjectView,
  RegisterInput,
  ShareLink,
  ShareLinkCreated,
  Task,
  UpdateMeInput,
  UpdateProjectInput,
  UpdateProposalInput,
  UpdateTaskInput,
  UpdateWorkSessionInput,
  WorkSession,
  paginated,
} from '@hourly/shared';
import { env } from './env.js';
import { REFRESH_COOKIE } from './lib/refresh-cookie.js';

const bearer = [{ bearerAuth: [] }];

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});

const errors = {
  '400': json(ApiError, 'Bad request'),
  '401': json(ApiError, 'Not authenticated'),
  '403': json(ApiError, 'Not allowed'),
  '404': json(ApiError, 'Not found'),
  '422': json(ApiError, 'Validation failed'),
};

const pathId = z.object({ id: z.uuid() });

/**
 * Endpoints that also answer anonymous callers: a token is optional and, when
 * present, changes what the caller sees (e.g. `scope=owned`).
 */
const optionalBearer: Record<string, string[]>[] = [{}, { bearerAuth: [] }];

/**
 * The API specification is generated from the very Zod schemas that validate
 * incoming requests, so the documentation cannot drift from the implementation.
 *
 * When adding an endpoint, describe it here; its schemas belong in
 * `@hourly/shared`.
 */
export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Hourly API',
    version: '0.1.0',
    description:
      'A marketplace for freelance work with transparent time tracking. ' +
      'Hierarchy: project -> task -> work session.\n\n' +
      '**Authentication.** `POST /auth/login` returns a short-lived access token (JWT) ' +
      `and sets the \`${REFRESH_COOKIE}\` cookie. ` +
      'Send the token as `Authorization: Bearer <token>` (the **Authorize** ' +
      'button). When it expires (401 `TOKEN_EXPIRED`), `POST /auth/refresh` issues a new one.',
  },
  servers: [{ url: `http://localhost:${env.PORT}/api`, description: 'Local environment' }],
  tags: [
    { name: 'Authentication' },
    { name: 'Projects' },
    { name: 'Tasks' },
    { name: 'Work sessions' },
    { name: 'Proposals' },
    { name: 'Share links' },
    { name: 'Operations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Operations'],
        summary: 'Liveness probe',
        responses: {
          '200': json(z.object({ status: z.literal('ok'), uptime: z.number() }), 'Service is up'),
        },
      },
    },

    /* ------------------------------- Authentication ------------------------------ */
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register, choosing the client or specialist role',
        description:
          'The administrator role cannot be chosen. The new user is signed in at once: ' +
          `the response carries the access token and sets the \`${REFRESH_COOKIE}\` cookie.`,
        requestBody: { content: { 'application/json': { schema: RegisterInput } } },
        responses: {
          '201': {
            ...json(AuthResponse, 'Account created and signed in'),
            headers: z.object({
              Location: z.string().meta({ description: 'Address of the new user' }),
              'Set-Cookie': z.string().meta({ description: 'The refresh token (httpOnly)' }),
            }),
          },
          '400': errors['400'],
          '409': json(ApiError, 'An account with this e-mail already exists (EMAIL_TAKEN)'),
          '422': errors['422'],
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        description:
          'An unknown e-mail and a wrong password get the same 401. ' +
          'A blocked account gets 403 only after its password has been verified.',
        requestBody: { content: { 'application/json': { schema: LoginInput } } },
        responses: {
          '200': {
            ...json(AuthResponse, 'Signed in'),
            headers: z.object({
              'Set-Cookie': z.string().meta({ description: 'The refresh token (httpOnly)' }),
            }),
          },
          '400': errors['400'],
          '401': json(ApiError, 'Incorrect e-mail or password (INVALID_CREDENTIALS)'),
          '403': json(ApiError, 'The account is blocked (ACCOUNT_BLOCKED)'),
          '422': errors['422'],
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh the access token (token rotation)',
        description:
          `The refresh token is read from the \`${REFRESH_COOKIE}\` cookie only. ` +
          'Every refresh revokes the presented token and sets a new one, so each token ' +
          'works once. Presenting an already used token revokes every token of that ' +
          'login (REFRESH_TOKEN_REUSED).',
        security: [{ refreshCookie: [] }],
        responses: {
          '200': {
            ...json(AuthResponse, 'New tokens issued'),
            headers: z.object({
              'Set-Cookie': z.string().meta({ description: 'The next refresh token (httpOnly)' }),
            }),
          },
          '401': json(
            ApiError,
            'Missing, unknown or expired token (INVALID_REFRESH_TOKEN), or a reused one ' +
              '(REFRESH_TOKEN_REUSED)',
          ),
          '403': json(ApiError, 'The account is blocked (ACCOUNT_BLOCKED)'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign out',
        description:
          'Revokes every refresh token of this login and clears the cookie. Works without ' +
          'an access token and without a cookie (idempotent). Access tokens already issued ' +
          'stay valid until they expire.',
        security: [{ refreshCookie: [] }, {}],
        responses: { '204': { description: 'Signed out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Details of the signed-in user',
        security: bearer,
        responses: { '200': json(CurrentUser, 'User'), '401': errors['401'] },
      },
      patch: {
        tags: ['Authentication'],
        summary: 'Edit own name, bio or password',
        description:
          'A new password requires `currentPassword`. Changing the password signs out ' +
          'every other login of the account.',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: UpdateMeInput } } },
        responses: {
          '200': json(CurrentUser, 'Updated user'),
          '400': errors['400'],
          '401': errors['401'],
          '422': json(ApiError, 'Invalid content or wrong current password (INVALID_PASSWORD)'),
        },
      },
    },

    /* ---------------------------------- Projects --------------------------------- */
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        description:
          '`scope=marketplace` - publicly published, `scope=owned` - created by the user, ' +
          '`scope=assigned` - carried out by the user.',
        requestParams: { query: ProjectListQuery },
        security: optionalBearer,
        responses: { '200': json(paginated(Project), 'Project list'), ...errors },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        description:
          'MARKETPLACE: the actor becomes the client and the project starts as DRAFT. ' +
          'DIRECT: the actor becomes the specialist, `externalClientName` is required ' +
          'and the project starts as IN_PROGRESS.',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateProjectInput } } },
        responses: { '201': json(Project, 'Project created'), ...errors },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Project details',
        requestParams: { path: pathId },
        responses: { '200': json(Project, 'Project'), ...errors },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update a project',
        description:
          'Only the fields present in the body are written. Status changes follow the ' +
          'project lifecycle; PUBLISHED -> IN_PROGRESS happens by accepting a proposal.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: UpdateProjectInput } } },
        responses: { '200': json(Project, 'Project updated'), ...errors },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        description: 'Tasks, work sessions, proposals and share links are removed with it.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },
    '/projects/{id}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Tasks of a given project',
        description: 'A missing project answers 404, which is not the same as an empty list.',
        requestParams: { path: pathId },
        responses: { '200': json(z.array(Task), 'Task list'), ...errors },
      },
    },
    '/projects/{id}/report': {
      get: {
        tags: ['Projects'],
        summary: 'Project report by task and accumulated hours',
        description:
          'One resource in two representations, selected with the `Accept` header: ' +
          '`application/json` (the default) or `text/csv`, which is returned as a ' +
          'download. Anything else answers 406. Only finished work sessions are ' +
          'counted - a running session has no duration yet.',
        requestParams: { path: pathId },
        security: bearer,
        responses: {
          '200': {
            description: 'Report',
            content: {
              'application/json': { schema: ProjectReport },
              'text/csv': { schema: z.string() },
            },
          },
          '406': json(ApiError, 'The requested media type is not available'),
          ...errors,
        },
      },
    },

    /* ----------------------------------- Tasks ----------------------------------- */
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        description:
          'Tasks of the projects the actor takes part in; `projectId` narrows it to one.',
        requestParams: {
          query: z.object({ projectId: z.uuid().optional() }),
        },
        security: bearer,
        responses: { '200': json(z.array(Task), 'Task list'), ...errors },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        description:
          'Written by whoever the project named in `taskAuthoring`. Omitting `position` ' +
          'appends the task to the end of the list. An unknown `projectId` answers 422.',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateTaskInput } } },
        responses: { '201': json(Task, 'Task created'), ...errors },
      },
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Task details',
        requestParams: { path: pathId },
        responses: { '200': json(Task, 'Task'), ...errors },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task, move it, change its status or approve it',
        description:
          'Both parties of the project may edit and reorder tasks. `approved` is the ' +
          'decision of the client and applies only when the specialist authored the list.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: UpdateTaskInput } } },
        responses: { '200': json(Task, 'Task updated'), ...errors },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        description: 'Work sessions of the task are removed with it.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },
    '/tasks/{id}/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work sessions of a given task',
        description: 'A missing task answers 404, which is not the same as an empty list.',
        requestParams: { path: pathId },
        responses: { '200': json(z.array(WorkSession), 'Session list'), ...errors },
      },
    },

    /* -------------------------------- Work sessions ------------------------------ */
    '/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'List work sessions',
        description: 'The work log of the actor; `taskId` narrows it to one task.',
        requestParams: {
          query: z.object({ taskId: z.uuid().optional() }),
        },
        security: bearer,
        responses: { '200': json(z.array(WorkSession), 'Session list'), ...errors },
      },
      post: {
        tags: ['Work sessions'],
        summary: 'Start a work session or enter one manually',
        description:
          'Without `endedAt` the session is treated as running. A user may have only one ' +
          'unfinished session at a time, so a second one answers 409. `durationMinutes` ' +
          'and `appliedRate` are computed by the server and cannot be sent in.',
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateWorkSessionInput } },
        },
        responses: {
          '201': json(WorkSession, 'Session created'),
          '409': json(ApiError, 'A work session is already running'),
          ...errors,
        },
      },
    },
    '/sessions/{id}': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work session details',
        requestParams: { path: pathId },
        responses: { '200': json(WorkSession, 'Session'), ...errors },
      },
      patch: {
        tags: ['Work sessions'],
        summary: 'Update or finish a work session',
        description:
          'Sending `endedAt` stops the timer: the server then measures the duration and ' +
          'locks in the rate that was in force. Only the author may change a session.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: UpdateWorkSessionInput } },
        },
        responses: {
          '200': json(WorkSession, 'Session updated'),
          '409': json(ApiError, 'Reopening would leave two sessions running'),
          ...errors,
        },
      },
      delete: {
        tags: ['Work sessions'],
        summary: 'Delete a work session',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },

    /* --------------------------------- Proposals --------------------------------- */
    '/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'Offers submitted by the actor, with their statuses',
        requestParams: {
          query: z.object({ status: ProposalStatus.optional() }),
        },
        security: bearer,
        responses: { '200': json(z.array(Proposal), 'Proposal list'), ...errors },
      },
    },
    '/projects/{id}/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'Proposals submitted for a project',
        description:
          'Competing bids reveal prices, so the client sees every offer while a ' +
          'specialist sees only their own.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '200': json(z.array(Proposal), 'Proposal list'), ...errors },
      },
      post: {
        tags: ['Proposals'],
        summary: 'Submit a proposal for a project',
        description:
          'Only while the project is a PUBLISHED marketplace project. One offer per ' +
          'specialist per project, so a repeated attempt answers 409.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateProposalInput } } },
        responses: {
          '201': json(Proposal, 'Proposal submitted'),
          '409': json(ApiError, 'This specialist has already bid on the project'),
          ...errors,
        },
      },
    },
    '/proposals/{id}': {
      patch: {
        tags: ['Proposals'],
        summary: 'Accept, reject or withdraw a proposal',
        description:
          'ACCEPTED and REJECTED are decisions of the client, WITHDRAWN belongs to the ' +
          'specialist, and only a PENDING proposal can be changed. Accepting runs in one ' +
          'transaction: the offer wins, the competing offers are rejected, and the project ' +
          'moves to IN_PROGRESS with the specialist assigned. Only one proposal per project ' +
          'may be accepted.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: UpdateProposalInput } },
        },
        responses: {
          '200': json(Proposal, 'Proposal updated'),
          '409': json(ApiError, 'Another proposal of this project is already accepted'),
          ...errors,
        },
      },
      delete: {
        tags: ['Proposals'],
        summary: 'Delete your own proposal',
        description: 'An accepted proposal is kept as the record of how the work was awarded.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },

    /* -------------------------------- Share links -------------------------------- */
    '/projects/{id}/shares': {
      get: {
        tags: ['Share links'],
        summary: 'Share links of a project',
        description: 'Answers what exists and until when - never how to get in.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '200': json(z.array(ShareLink), 'Share link list'), ...errors },
      },
      post: {
        tags: ['Share links'],
        summary: 'Generate a share link',
        description:
          'The token is readable only in this response: the database keeps nothing but ' +
          'its SHA-256 hash, so a lost link cannot be recovered, only replaced.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateShareLinkInput } },
        },
        responses: { '201': json(ShareLinkCreated, 'Share link created'), ...errors },
      },
    },
    '/shares/{id}': {
      delete: {
        tags: ['Share links'],
        summary: 'Revoke a share link',
        description:
          'The record is kept and stamped with `revokedAt`, because the fact that a ' +
          'project was shared is part of its history. Revoking twice answers 204 again.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Revoked' }, ...errors },
      },
    },
    '/public/projects/{token}': {
      get: {
        tags: ['Share links'],
        summary: 'Project progress behind a share link',
        description:
          'Accessible without an account, read-only. A link that does not exist, one ' +
          'that was revoked and one that expired all answer an identical 404, so a ' +
          'visitor cannot probe which tokens once existed. The response carries an ' +
          '`X-Robots-Tag: noindex` header because the token travels in the address.',
        requestParams: { path: z.object({ token: z.string().min(20).max(200) }) },
        responses: {
          '200': json(PublicProjectView, 'Project progress'),
          '400': json(ApiError, 'Malformed token in the address'),
          '404': json(ApiError, 'Link is invalid, revoked or not found'),
        },
      },
    },
  },
});
