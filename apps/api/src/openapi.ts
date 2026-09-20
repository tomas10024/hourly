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
  PublicProjectView,
  RegisterInput,
  ShareLink,
  ShareLinkCreated,
  Task,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateWorkSessionInput,
  WorkSession,
  paginated,
} from '@valandine/shared';
import { env } from './env.js';

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
 * The API specification is generated from the very Zod schemas that validate
 * incoming requests, so the documentation cannot drift from the implementation.
 *
 * When adding an endpoint, describe it here; its schemas belong in
 * `@valandine/shared`.
 */
export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Valandinė API',
    version: '0.1.0',
    description:
      'A marketplace for freelance work with transparent time tracking. ' +
      'Hierarchy: project -> task -> work session.',
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
        requestBody: { content: { 'application/json': { schema: RegisterInput } } },
        responses: { '201': json(AuthResponse, 'Account created'), ...errors },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        requestBody: { content: { 'application/json': { schema: LoginInput } } },
        responses: { '200': json(AuthResponse, 'Signed in'), ...errors },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh the access token (token rotation)',
        description:
          'The refresh token is read from an `httpOnly` cookie. ' +
          'Every refresh issues a new token and revokes the previous one.',
        responses: { '200': json(AuthResponse, 'New token issued'), ...errors },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign out',
        security: bearer,
        responses: { '204': { description: 'Signed out' }, ...errors },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Details of the signed-in user',
        security: bearer,
        responses: { '200': json(CurrentUser, 'User'), ...errors },
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
        responses: { '200': json(paginated(Project), 'Project list'), ...errors },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
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
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: UpdateProjectInput } } },
        responses: { '200': json(Project, 'Project updated'), ...errors },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },
    '/projects/{id}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Tasks of a given project',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(Task), 'Task list'), ...errors },
      },
    },
    '/projects/{id}/report': {
      get: {
        tags: ['Projects'],
        summary: 'Project report by task and accumulated hours',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(ProjectReport, 'Report'), ...errors },
      },
    },

    /* ----------------------------------- Tasks ----------------------------------- */
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        security: bearer,
        requestParams: { query: z.object({ projectId: z.uuid().optional() }) },
        responses: { '200': json(z.array(Task), 'Task list'), ...errors },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateTaskInput } } },
        responses: { '201': json(Task, 'Task created'), ...errors },
      },
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Task details',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(Task, 'Task'), ...errors },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task or change its status',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: UpdateTaskInput } } },
        responses: { '200': json(Task, 'Task updated'), ...errors },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },
    '/tasks/{id}/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work sessions of a given task',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(WorkSession), 'Session list'), ...errors },
      },
    },

    /* -------------------------------- Work sessions ------------------------------ */
    '/sessions': {
      get: {
        tags: ['Work sessions'],
        summary: 'List work sessions',
        security: bearer,
        requestParams: { query: z.object({ taskId: z.uuid().optional() }) },
        responses: { '200': json(z.array(WorkSession), 'Session list'), ...errors },
      },
      post: {
        tags: ['Work sessions'],
        summary: 'Start a work session or enter one manually',
        description:
          'Without `endedAt` the session is treated as running. ' +
          'A user may have only one unfinished session at a time.',
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateWorkSessionInput } },
        },
        responses: { '201': json(WorkSession, 'Session created'), ...errors },
      },
    },
    '/sessions/{id}': {
      get: {
        tags: ['Work sessions'],
        summary: 'Work session details',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(WorkSession, 'Session'), ...errors },
      },
      patch: {
        tags: ['Work sessions'],
        summary: 'Update or finish a work session',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: {
          content: { 'application/json': { schema: UpdateWorkSessionInput } },
        },
        responses: { '200': json(WorkSession, 'Session updated'), ...errors },
      },
      delete: {
        tags: ['Work sessions'],
        summary: 'Delete a work session',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },

    /* --------------------------------- Proposals --------------------------------- */
    '/projects/{id}/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'Proposals submitted for a project',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(Proposal), 'Proposal list'), ...errors },
      },
      post: {
        tags: ['Proposals'],
        summary: 'Submit a proposal for a project',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: CreateProposalInput } } },
        responses: { '201': json(Proposal, 'Proposal submitted'), ...errors },
      },
    },
    '/proposals/{id}': {
      patch: {
        tags: ['Proposals'],
        summary: 'Accept, reject or withdraw a proposal',
        description: 'Only one proposal per project may be accepted.',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: {
          content: {
            'application/json': {
              schema: z.object({
                status: z.enum(['ACCEPTED', 'REJECTED', 'WITHDRAWN']),
              }),
            },
          },
        },
        responses: { '200': json(Proposal, 'Proposal updated'), ...errors },
      },
      delete: {
        tags: ['Proposals'],
        summary: 'Delete your own proposal',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Deleted' }, ...errors },
      },
    },

    /* -------------------------------- Share links -------------------------------- */
    '/projects/{id}/shares': {
      get: {
        tags: ['Share links'],
        summary: 'Share links of a project',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(ShareLink), 'Share link list'), ...errors },
      },
      post: {
        tags: ['Share links'],
        summary: 'Generate a share link',
        description: 'The token is returned only once - the database stores its hash.',
        security: bearer,
        requestParams: { path: pathId },
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
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Revoked' }, ...errors },
      },
    },
    '/public/projects/{token}': {
      get: {
        tags: ['Share links'],
        summary: 'Project progress behind a share link',
        description:
          'Accessible without an account, read-only. ' +
          'The response carries an `X-Robots-Tag: noindex` header.',
        requestParams: { path: z.object({ token: z.string().min(20) }) },
        responses: {
          '200': json(PublicProjectView, 'Project progress'),
          '404': json(ApiError, 'Link is invalid, revoked or not found'),
        },
      },
    },
  },
});
