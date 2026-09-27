import { createDocument } from 'zod-openapi';
import { z } from 'zod';
import {
  AdminUpdateUserInput,
  ApiError,
  AuthResponse,
  CreateProjectInput,
  CreateProposalInput,
  CreateShareLinkInput,
  CreateTaskInput,
  CreateWorkSessionInput,
  CurrentUser,
  LoginInput,
  Links,
  Project,
  ProjectListQuery,
  ProjectTaskListQuery,
  ProjectReport,
  Proposal,
  ProposalListQuery,
  PublicProjectView,
  PublicUser,
  RegisterInput,
  SessionListQuery,
  ShareListQuery,
  ShareLink,
  ShareLinkCreated,
  Task,
  TaskListQuery,
  TaskSessionListQuery,
  UpdateMeInput,
  UpdateProjectInput,
  UpdateProposalInput,
  UpdateTaskInput,
  UpdateWorkSessionInput,
  UserListQuery,
  WorkSession,
  paginated,
  withLinks,
} from '@hourly/shared';
import { env } from './env.js';
import {
  ProjectParams,
  ProposalParams,
  SessionParams,
  ShareParams,
  TaskParams,
} from './lib/scope.js';
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

/** A resource below a project that does not exist at the given address. */
const scopedNotFound = json(
  ApiError,
  'Not found - also when a child is addressed under a parent it does not belong to',
);

/*
 * Every resource is sent with its `_links` (see `lib/links.ts`), so the
 * documented responses carry them too.
 */
const LinkedProject = withLinks(Project);
const LinkedTask = withLinks(Task);
const LinkedWorkSession = withLinks(WorkSession);
const LinkedProposal = withLinks(Proposal);
const LinkedShareLink = withLinks(ShareLink);
const LinkedShareLinkCreated = withLinks(ShareLinkCreated);
const LinkedCurrentUser = withLinks(CurrentUser);
const LinkedPublicUser = withLinks(PublicUser);
const LinkedProjectReport = withLinks(ProjectReport);

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
      'Hierarchy: project -> task -> work session, addressed as ' +
      '`/projects/{projectId}/tasks/{taskId}/sessions/{sessionId}`. A child requested ' +
      'under a parent it does not belong to answers 404. A known address used with an ' +
      'unsupported method answers 405 with an `Allow` header.\n\n' +
      '**Hypermedia.** Every resource carries `_links`: related resources (`self`, ' +
      '`project`, `tasks`) and the actions the caller may take right now, with their ' +
      'method (`update`, `publish`, `stop`, `accept`...). Actions follow the role of ' +
      'the caller and the state of the resource. Lists add `first`, `prev`, `next` and ' +
      '`last`. Start at `GET /`.\n\n' +
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
    { name: 'Users' },
    { name: 'Operations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Operations'],
        summary: 'Entry point: links to everything the caller can reach',
        description:
          'A client that knows only this address can discover the others by following ' +
          '`_links`. What is offered depends on the caller: a guest gets the marketplace ' +
          'and the way in, a signed-in user their own collections, the administrator ' +
          'the user list as well.',
        security: optionalBearer,
        responses: {
          '200': json(z.object({ name: z.string(), _links: Links }), 'Entry point'),
        },
      },
    },
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
        responses: { '200': json(LinkedCurrentUser, 'User'), '401': errors['401'] },
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
          '200': json(LinkedCurrentUser, 'Updated user'),
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
          '`scope=marketplace` - publicly published (no token needed), `scope=owned` - ' +
          'created by the user, `scope=assigned` - carried out by the user, `scope=all` - ' +
          'every project, for the administrator only (403 otherwise).',
        requestParams: { query: ProjectListQuery },
        security: optionalBearer,
        responses: { '200': json(paginated(LinkedProject), 'Project list'), ...errors },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        description:
          'MARKETPLACE: the actor becomes the client and the project starts as DRAFT. ' +
          'DIRECT: the actor becomes the specialist, `externalClientName` is required ' +
          'and the project starts as IN_PROGRESS. A MARKETPLACE project is created by a ' +
          'client, a DIRECT one by a specialist; any other role gets 403.',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateProjectInput } } },
        responses: { '201': json(LinkedProject, 'Project created'), ...errors },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Project details',
        description:
          'A PUBLISHED project is public. Any other is visible only to its client, its ' +
          'specialist and the administrator - for everyone else it answers 404.',
        requestParams: { path: pathId },
        security: optionalBearer,
        responses: { '200': json(LinkedProject, 'Project'), ...errors },
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
        responses: { '200': json(LinkedProject, 'Project updated'), ...errors },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        description:
          'Tasks, work sessions, proposals and share links are removed with it. Allowed to ' +
          'the creator of the project (the client of a MARKETPLACE project, the specialist ' +
          'of a DIRECT one) and to the administrator.',
        requestParams: { path: pathId },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors },
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
          'counted - a running session has no duration yet. Readable by the parties of ' +
          'the project and the administrator.',
        requestParams: { path: pathId },
        security: bearer,
        responses: {
          '200': {
            description: 'Report',
            content: {
              'application/json': { schema: LinkedProjectReport },
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
        summary: 'My tasks across projects',
        description:
          'A personal view, not a second address: tasks of the projects the actor takes ' +
          'part in; `projectId` narrows it to one, `status` and `q` (title and ' +
          'description) filter it. Each task lives at `/projects/{projectId}/tasks/{taskId}`.',
        requestParams: { query: TaskListQuery },
        security: bearer,
        responses: { '200': json(paginated(LinkedTask), 'Task list'), ...errors },
      },
    },
    '/projects/{projectId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Tasks of a given project',
        description:
          'A missing project answers 404, which is not the same as an empty list. The ' +
          'tasks are as visible as their project. `status` and `q` (title and ' +
          'description) filter the list.',
        requestParams: { path: ProjectParams, query: ProjectTaskListQuery },
        security: optionalBearer,
        responses: { '200': json(paginated(LinkedTask), 'Task list'), ...errors },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task in the project',
        description:
          'Written by whoever the project named in `taskAuthoring`. Omitting `position` ' +
          'appends the task to the end of the list. The `Location` header points at ' +
          'the new task.',
        requestParams: { path: ProjectParams },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateTaskInput } } },
        responses: { '201': json(LinkedTask, 'Task created'), ...errors },
      },
    },
    '/projects/{projectId}/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Task details',
        description:
          'As visible as the project. A task of another project answers 404: it does ' +
          'not exist at this address.',
        requestParams: { path: TaskParams },
        security: optionalBearer,
        responses: { '200': json(LinkedTask, 'Task'), ...errors, '404': scopedNotFound },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task, move it, change its status or approve it',
        description:
          'Both parties of the project may edit and reorder tasks. `approved` is the ' +
          'decision of the client and applies only when the specialist authored the list.',
        requestParams: { path: TaskParams },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: UpdateTaskInput } } },
        responses: { '200': json(LinkedTask, 'Task updated'), ...errors, '404': scopedNotFound },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        description: 'Work sessions of the task are removed with it.',
        requestParams: { path: TaskParams },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors, '404': scopedNotFound },
      },
    },

    /* -------------------------------- Work sessions ------------------------------ */
    '/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'My work log across projects',
        description:
          'A personal view, not a second address: the sessions of the actor. `projectId` ' +
          'and `taskId` narrow it, `from`/`to` select by start time (`from <= startedAt < ' +
          'to`), `running=true` finds the timer still going. `projectId` and `taskId` of ' +
          'each entry give its address under `/projects/{projectId}/tasks/{taskId}/sessions`.',
        requestParams: { query: SessionListQuery },
        security: bearer,
        responses: { '200': json(paginated(LinkedWorkSession), 'Session list'), ...errors },
      },
    },
    '/projects/{projectId}/tasks/{taskId}/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work sessions of a task (project -> task -> sessions)',
        description:
          'The whole hierarchy in one address. A missing project, or a task that does ' +
          'not belong to it, answers 404 - not an empty list. Logged hours are readable ' +
          'by the parties of the project and the administrator. `from`/`to` select by ' +
          'start time (`from <= startedAt < to`), `running` by whether the timer is going.',
        requestParams: { path: TaskParams, query: TaskSessionListQuery },
        security: bearer,
        responses: {
          '200': json(paginated(LinkedWorkSession), 'Session list'),
          ...errors,
          '404': scopedNotFound,
        },
      },
      post: {
        tags: ['Work sessions'],
        summary: 'Start a work session or enter one manually',
        description:
          'Without `endedAt` the session is treated as running. A user may have only one ' +
          'unfinished session at a time, so a second one answers 409. `durationMinutes` ' +
          'and `appliedRate` are computed by the server and cannot be sent in.',
        requestParams: { path: TaskParams },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateWorkSessionInput } },
        },
        responses: {
          '201': json(LinkedWorkSession, 'Session created'),
          '409': json(ApiError, 'A work session is already running'),
          ...errors,
          '404': scopedNotFound,
        },
      },
    },
    '/projects/{projectId}/tasks/{taskId}/sessions/{sessionId}': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work session details',
        description: 'Readable by the parties of the project and the administrator.',
        requestParams: { path: SessionParams },
        security: bearer,
        responses: { '200': json(LinkedWorkSession, 'Session'), ...errors, '404': scopedNotFound },
      },
      patch: {
        tags: ['Work sessions'],
        summary: 'Update or finish a work session',
        description:
          'Sending `endedAt` stops the timer: the server then measures the duration and ' +
          'locks in the rate that was in force. Only the author may change a session.',
        requestParams: { path: SessionParams },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: UpdateWorkSessionInput } },
        },
        responses: {
          '200': json(LinkedWorkSession, 'Session updated'),
          '409': json(ApiError, 'Reopening would leave two sessions running'),
          ...errors,
          '404': scopedNotFound,
        },
      },
      delete: {
        tags: ['Work sessions'],
        summary: 'Delete a work session',
        requestParams: { path: SessionParams },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors, '404': scopedNotFound },
      },
    },

    /* --------------------------------- Proposals --------------------------------- */
    '/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'Offers submitted by the actor, with their statuses',
        requestParams: { query: ProposalListQuery },
        security: bearer,
        responses: { '200': json(paginated(LinkedProposal), 'Proposal list'), ...errors },
      },
    },
    '/projects/{projectId}/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'Proposals submitted for a project',
        description:
          'Competing bids reveal prices, so the client sees every offer while a ' +
          'specialist sees only their own. `status` filters the list.',
        requestParams: { path: ProjectParams, query: ProposalListQuery },
        security: bearer,
        responses: { '200': json(paginated(LinkedProposal), 'Proposal list'), ...errors },
      },
      post: {
        tags: ['Proposals'],
        summary: 'Submit a proposal for a project',
        description:
          'Only while the project is a PUBLISHED marketplace project. One offer per ' +
          'specialist per project, so a repeated attempt answers 409.',
        requestParams: { path: ProjectParams },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateProposalInput } } },
        responses: {
          '201': json(LinkedProposal, 'Proposal submitted'),
          '409': json(ApiError, 'This specialist has already bid on the project'),
          ...errors,
        },
      },
    },
    '/projects/{projectId}/proposals/{proposalId}': {
      get: {
        tags: ['Proposals'],
        summary: 'Proposal details',
        description:
          'Visible to the client of the project, the administrator and the specialist ' +
          'who submitted it; for anyone else it answers 404, as it is absent from their list.',
        requestParams: { path: ProposalParams },
        security: bearer,
        responses: { '200': json(LinkedProposal, 'Proposal'), ...errors, '404': scopedNotFound },
      },
      patch: {
        tags: ['Proposals'],
        summary: 'Accept, reject or withdraw a proposal',
        description:
          'ACCEPTED and REJECTED are decisions of the client, WITHDRAWN belongs to the ' +
          'specialist, and only a PENDING proposal can be changed. Accepting runs in one ' +
          'transaction: the offer wins, the competing offers are rejected, and the project ' +
          'moves to IN_PROGRESS with the specialist assigned. Only one proposal per project ' +
          'may be accepted.',
        requestParams: { path: ProposalParams },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: UpdateProposalInput } },
        },
        responses: {
          '200': json(LinkedProposal, 'Proposal updated'),
          '409': json(ApiError, 'Another proposal of this project is already accepted'),
          ...errors,
          '404': scopedNotFound,
        },
      },
      delete: {
        tags: ['Proposals'],
        summary: 'Delete your own proposal',
        description: 'An accepted proposal is kept as the record of how the work was awarded.',
        requestParams: { path: ProposalParams },
        security: bearer,
        responses: { '204': { description: 'Deleted' }, ...errors, '404': scopedNotFound },
      },
    },

    /* -------------------------------- Share links -------------------------------- */
    '/projects/{projectId}/shares': {
      get: {
        tags: ['Share links'],
        summary: 'Share links of a project',
        description:
          'Answers what exists and until when - never how to get in. `active=true` ' +
          'leaves the links that still open the project, `active=false` the revoked ' +
          'and expired ones.',
        requestParams: { path: ProjectParams, query: ShareListQuery },
        security: bearer,
        responses: { '200': json(paginated(LinkedShareLink), 'Share link list'), ...errors },
      },
      post: {
        tags: ['Share links'],
        summary: 'Generate a share link',
        description:
          'The token is readable only in this response: the database keeps nothing but ' +
          'its SHA-256 hash, so a lost link cannot be recovered, only replaced.',
        requestParams: { path: ProjectParams },
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateShareLinkInput } },
        },
        responses: { '201': json(LinkedShareLinkCreated, 'Share link created'), ...errors },
      },
    },
    '/projects/{projectId}/shares/{shareId}': {
      delete: {
        tags: ['Share links'],
        summary: 'Revoke a share link',
        description:
          'The record is kept and stamped with `revokedAt`, because the fact that a ' +
          'project was shared is part of its history. Revoking twice answers 204 again.',
        requestParams: { path: ShareParams },
        security: bearer,
        responses: { '204': { description: 'Revoked' }, ...errors, '404': scopedNotFound },
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

    /* ----------------------------------- Users ----------------------------------- */
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'All accounts (administrator)',
        description:
          'Includes the e-mail and the blocked flag. `q` searches the name and the e-mail; ' +
          '`role` and `isBlocked` narrow the list.',
        requestParams: { query: UserListQuery },
        security: bearer,
        responses: {
          '200': json(paginated(LinkedCurrentUser), 'User list'),
          '400': errors['400'],
          '401': errors['401'],
          '403': json(ApiError, 'Not an administrator'),
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: "Another user's public profile",
        description: 'Name, role, bio and registration date - no e-mail.',
        requestParams: { path: pathId },
        security: bearer,
        responses: {
          '200': json(LinkedPublicUser, 'Public profile'),
          '400': errors['400'],
          '401': errors['401'],
          '404': errors['404'],
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Block or unblock an account (administrator)',
        description:
          'Blocking revokes every refresh token of the account and rejects its access ' +
          'tokens from the next request on (ACCOUNT_BLOCKED). An administrator cannot ' +
          'block their own account.',
        requestParams: { path: pathId },
        security: bearer,
        requestBody: { content: { 'application/json': { schema: AdminUpdateUserInput } } },
        responses: {
          '200': json(LinkedCurrentUser, 'Updated account'),
          '400': errors['400'],
          '401': errors['401'],
          '403': json(ApiError, 'Not an administrator'),
          '404': errors['404'],
          '422': json(ApiError, 'Invalid content, or the own account (CANNOT_MODIFY_SELF)'),
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete an account without work history (administrator)',
        description:
          'An account that takes part in projects or has logged work answers 409 ' +
          '(USER_HAS_WORK_HISTORY) - deleting it would erase records of the other party, ' +
          'so it should be blocked instead.',
        requestParams: { path: pathId },
        security: bearer,
        responses: {
          '204': { description: 'Deleted' },
          '400': errors['400'],
          '401': errors['401'],
          '403': json(ApiError, 'Not an administrator'),
          '404': errors['404'],
          '409': json(ApiError, 'The account has work history (USER_HAS_WORK_HISTORY)'),
          '422': json(ApiError, 'The own account (CANNOT_MODIFY_SELF)'),
        },
      },
    },
  },
});
