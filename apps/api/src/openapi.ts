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
  '400': json(ApiError, 'Netinkama užklausa'),
  '401': json(ApiError, 'Neautentifikuota'),
  '403': json(ApiError, 'Neturima teisių'),
  '404': json(ApiError, 'Nerasta'),
  '422': json(ApiError, 'Nepraėjo duomenų validavimo'),
};

const pathId = z.object({ id: z.uuid() });

/**
 * Sąsajos specifikacija generuojama iš tų pačių Zod schemų, kuriomis
 * validuojamos užklausos, todėl dokumentacija negali nutolti nuo realizacijos.
 *
 * Pridedant naują metodą, jo aprašas rašomas čia, o schemos - `@valandine/shared`.
 */
export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Valandinė API',
    version: '0.1.0',
    description:
      'Darbų aikštelė ir skaidri atliktų darbų laiko apskaita. ' +
      'Hierarchija: projektas -> užduotis -> darbo sesija.',
  },
  servers: [{ url: `http://localhost:${env.PORT}/api`, description: 'Vietinė aplinka' }],
  tags: [
    { name: 'Autentifikacija' },
    { name: 'Projektai' },
    { name: 'Užduotys' },
    { name: 'Darbo sesijos' },
    { name: 'Pasiūlymai' },
    { name: 'Peržiūros nuorodos' },
    { name: 'Tarnybiniai' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Tarnybiniai'],
        summary: 'Gyvybingumo patikrinimas',
        responses: {
          '200': json(
            z.object({ status: z.literal('ok'), uptime: z.number() }),
            'Servisas veikia',
          ),
        },
      },
    },

    /* ------------------------------ Autentifikacija ------------------------------ */
    '/auth/register': {
      post: {
        tags: ['Autentifikacija'],
        summary: 'Registracija pasirenkant užsakovo arba specialisto rolę',
        requestBody: { content: { 'application/json': { schema: RegisterInput } } },
        responses: { '201': json(AuthResponse, 'Paskyra sukurta'), ...errors },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autentifikacija'],
        summary: 'Prisijungimas',
        requestBody: { content: { 'application/json': { schema: LoginInput } } },
        responses: { '200': json(AuthResponse, 'Prisijungta'), ...errors },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Autentifikacija'],
        summary: 'Prieigos žetono atnaujinimas (žetonų rotacija)',
        description:
          'Atnaujinimo žetonas skaitomas iš `httpOnly` slapuko. ' +
          'Kiekvienas atnaujinimas išduoda naują žetoną ir panaikina ankstesnįjį.',
        responses: { '200': json(AuthResponse, 'Išduotas naujas žetonas'), ...errors },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Autentifikacija'],
        summary: 'Atsijungimas',
        security: bearer,
        responses: { '204': { description: 'Atsijungta' }, ...errors },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autentifikacija'],
        summary: 'Prisijungusio naudotojo duomenys',
        security: bearer,
        responses: { '200': json(CurrentUser, 'Naudotojas'), ...errors },
      },
    },

    /* --------------------------------- Projektai --------------------------------- */
    '/projects': {
      get: {
        tags: ['Projektai'],
        summary: 'Projektų sąrašas',
        description:
          '`scope=marketplace` - viešai paskelbti, `scope=owned` - naudotojo sukurti, ' +
          '`scope=assigned` - jo vykdomi.',
        requestParams: { query: ProjectListQuery },
        responses: { '200': json(paginated(Project), 'Projektų sąrašas'), ...errors },
      },
      post: {
        tags: ['Projektai'],
        summary: 'Sukurti projektą',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateProjectInput } } },
        responses: { '201': json(Project, 'Projektas sukurtas'), ...errors },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['Projektai'],
        summary: 'Projekto duomenys',
        requestParams: { path: pathId },
        responses: { '200': json(Project, 'Projektas'), ...errors },
      },
      patch: {
        tags: ['Projektai'],
        summary: 'Redaguoti projektą',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: UpdateProjectInput } } },
        responses: { '200': json(Project, 'Projektas atnaujintas'), ...errors },
      },
      delete: {
        tags: ['Projektai'],
        summary: 'Šalinti projektą',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Pašalinta' }, ...errors },
      },
    },
    '/projects/{id}/tasks': {
      get: {
        tags: ['Užduotys'],
        summary: 'Konkretaus projekto užduotys',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(Task), 'Užduočių sąrašas'), ...errors },
      },
    },
    '/projects/{id}/report': {
      get: {
        tags: ['Projektai'],
        summary: 'Projekto ataskaita pagal užduotis ir sukauptas valandas',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(ProjectReport, 'Ataskaita'), ...errors },
      },
    },

    /* --------------------------------- Užduotys ---------------------------------- */
    '/tasks': {
      get: {
        tags: ['Užduotys'],
        summary: 'Užduočių sąrašas',
        security: bearer,
        requestParams: { query: z.object({ projectId: z.uuid().optional() }) },
        responses: { '200': json(z.array(Task), 'Užduočių sąrašas'), ...errors },
      },
      post: {
        tags: ['Užduotys'],
        summary: 'Sukurti užduotį',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: CreateTaskInput } } },
        responses: { '201': json(Task, 'Užduotis sukurta'), ...errors },
      },
    },
    '/tasks/{id}': {
      get: {
        tags: ['Užduotys'],
        summary: 'Užduoties duomenys',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(Task, 'Užduotis'), ...errors },
      },
      patch: {
        tags: ['Užduotys'],
        summary: 'Redaguoti užduotį arba keisti jos būseną',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: UpdateTaskInput } } },
        responses: { '200': json(Task, 'Užduotis atnaujinta'), ...errors },
      },
      delete: {
        tags: ['Užduotys'],
        summary: 'Šalinti užduotį',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Pašalinta' }, ...errors },
      },
    },
    '/tasks/{id}/sessions': {
      get: {
        tags: ['Darbo sesijos'],
        summary: 'Konkrečios užduoties darbo sesijos',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(WorkSession), 'Sesijų sąrašas'), ...errors },
      },
    },

    /* ------------------------------- Darbo sesijos ------------------------------- */
    '/sessions': {
      get: {
        tags: ['Darbo sesijos'],
        summary: 'Darbo sesijų sąrašas',
        security: bearer,
        requestParams: { query: z.object({ taskId: z.uuid().optional() }) },
        responses: { '200': json(z.array(WorkSession), 'Sesijų sąrašas'), ...errors },
      },
      post: {
        tags: ['Darbo sesijos'],
        summary: 'Pradėti arba rankiniu būdu įvesti darbo sesiją',
        description:
          'Nenurodžius `endedAt`, sesija laikoma vykdoma. ' +
          'Naudotojas vienu metu gali turėti tik vieną neužbaigtą sesiją.',
        security: bearer,
        requestBody: {
          content: { 'application/json': { schema: CreateWorkSessionInput } },
        },
        responses: { '201': json(WorkSession, 'Sesija sukurta'), ...errors },
      },
    },
    '/sessions/{id}': {
      get: {
        tags: ['Darbo sesijos'],
        summary: 'Darbo sesijos duomenys',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(WorkSession, 'Sesija'), ...errors },
      },
      patch: {
        tags: ['Darbo sesijos'],
        summary: 'Redaguoti arba užbaigti darbo sesiją',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: {
          content: { 'application/json': { schema: UpdateWorkSessionInput } },
        },
        responses: { '200': json(WorkSession, 'Sesija atnaujinta'), ...errors },
      },
      delete: {
        tags: ['Darbo sesijos'],
        summary: 'Šalinti darbo sesiją',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Pašalinta' }, ...errors },
      },
    },

    /* -------------------------------- Pasiūlymai --------------------------------- */
    '/projects/{id}/proposals': {
      get: {
        tags: ['Pasiūlymai'],
        summary: 'Projektui pateikti pasiūlymai',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(Proposal), 'Pasiūlymų sąrašas'), ...errors },
      },
      post: {
        tags: ['Pasiūlymai'],
        summary: 'Pateikti pasiūlymą projektui',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: { content: { 'application/json': { schema: CreateProposalInput } } },
        responses: { '201': json(Proposal, 'Pasiūlymas pateiktas'), ...errors },
      },
    },
    '/proposals/{id}': {
      patch: {
        tags: ['Pasiūlymai'],
        summary: 'Priimti, atmesti arba atšaukti pasiūlymą',
        description: 'Vienam projektui gali būti priimtas tik vienas pasiūlymas.',
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
        responses: { '200': json(Proposal, 'Pasiūlymas atnaujintas'), ...errors },
      },
      delete: {
        tags: ['Pasiūlymai'],
        summary: 'Šalinti savo pasiūlymą',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Pašalinta' }, ...errors },
      },
    },

    /* ----------------------------- Peržiūros nuorodos ---------------------------- */
    '/projects/{id}/shares': {
      get: {
        tags: ['Peržiūros nuorodos'],
        summary: 'Projekto peržiūros nuorodų sąrašas',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '200': json(z.array(ShareLink), 'Nuorodų sąrašas'), ...errors },
      },
      post: {
        tags: ['Peržiūros nuorodos'],
        summary: 'Sugeneruoti peržiūros nuorodą',
        description: 'Žetonas grąžinamas tik kartą - duomenų bazėje laikoma tik jo maiša.',
        security: bearer,
        requestParams: { path: pathId },
        requestBody: {
          content: { 'application/json': { schema: CreateShareLinkInput } },
        },
        responses: { '201': json(ShareLinkCreated, 'Nuoroda sukurta'), ...errors },
      },
    },
    '/shares/{id}': {
      delete: {
        tags: ['Peržiūros nuorodos'],
        summary: 'Atšaukti peržiūros nuorodą',
        security: bearer,
        requestParams: { path: pathId },
        responses: { '204': { description: 'Atšaukta' }, ...errors },
      },
    },
    '/public/projects/{token}': {
      get: {
        tags: ['Peržiūros nuorodos'],
        summary: 'Projekto darbo eiga pagal peržiūros nuorodą',
        description:
          'Prieiga be paskyros, tik skaitymo režimu. ' +
          'Atsakyme nustatoma `X-Robots-Tag: noindex` antraštė.',
        requestParams: { path: z.object({ token: z.string().min(20) }) },
        responses: {
          '200': json(PublicProjectView, 'Projekto darbo eiga'),
          '404': json(ApiError, 'Nuoroda negalioja, atšaukta arba nerasta'),
        },
      },
    },
  },
});
