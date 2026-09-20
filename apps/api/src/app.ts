import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';
import { openApiDocument } from './openapi.js';
import { errorHandler, notFound } from './middleware/error.js';
import { healthRouter } from './routes/health.js';

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

  // Peržiūros nuorodos žetonas keliauja adreso eilutėje, todėl viešų
  // atsakymų neleidžiame indeksuoti paieškos sistemoms.
  app.use('/api/public', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use('/api', healthRouter);

  // Specifikacija generuojama iš tų pačių Zod schemų, kurios naudojamos
  // validavimui, todėl dokumentacija nenutolsta nuo realizacijos.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
