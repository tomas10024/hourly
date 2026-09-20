import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env, isProduction } from '../env.js';

/**
 * A single shared Prisma client instance.
 * Prisma 7 connects through a driver adapter (`@prisma/adapter-pg`) instead of
 * a URL declared in the schema file.
 *
 * The instance is stored on `globalThis` so that `tsx watch` reloads do not
 * open a new connection pool on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['warn', 'error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (!isProduction) globalForPrisma.prisma = prisma;
