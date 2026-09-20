import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRouter: Router = Router();

/** Liveness probe - no dependencies. */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/** Readiness probe - also verifies the database connection. */
healthRouter.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});
