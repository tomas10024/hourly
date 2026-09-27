import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';
import { openApiDocument } from './openapi.js';
import { authenticate } from './middleware/auth.js';
import { cacheControl } from './middleware/cache.js';
import { errorHandler, methodNotAllowed, notFound } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { rootRouter } from './routes/root.js';
import { proposalsRouter } from './routes/proposals.js';
import { sessionsRouter } from './routes/sessions.js';
import { sharesRouter } from './routes/shares.js';
import { tasksRouter } from './routes/tasks.js';
import { usersRouter } from './routes/users.js';

export function buildApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Who may store a response and for how long (see `middleware/cache.ts`).
  app.use('/api', cacheControl);

  // A share-link token travels in the URL, so public responses must not be
  // indexed by search engines.
  app.use('/api/public', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  // Every request under /api gets `req.auth`: the verified user, or null for
  // an anonymous one. Whether anonymity is acceptable is up to each endpoint.
  app.use('/api', authenticate);

  const routers = [
    rootRouter,
    healthRouter,
    authRouter,
    projectsRouter,
    proposalsRouter,
    tasksRouter,
    sessionsRouter,
    sharesRouter,
    usersRouter,
  ];
  for (const router of routers) app.use('/api', router);

  // The document is generated from the same Zod schemas used for request
  // validation, so the documentation cannot drift from the implementation.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // A known address with an unsupported method: 405, not 404.
  app.use('/api', methodNotAllowed(routers));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
