import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';
import { openApiDocument } from './openapi.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { proposalsRouter } from './routes/proposals.js';
import { sessionsRouter } from './routes/sessions.js';
import { sharesRouter } from './routes/shares.js';
import { tasksRouter } from './routes/tasks.js';

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

  // A share-link token travels in the URL, so public responses must not be
  // indexed by search engines.
  app.use('/api/public', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', projectsRouter);
  app.use('/api', proposalsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', sessionsRouter);
  app.use('/api', sharesRouter);

  // The document is generated from the same Zod schemas used for request
  // validation, so the documentation cannot drift from the implementation.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
