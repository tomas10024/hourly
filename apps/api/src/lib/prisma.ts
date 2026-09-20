import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env, isProduction } from '../env.js';

/**
 * Viena bendra Prisma klientės instancija.
 * Prisma 7 jungiasi per tvarkyklės adapterį (`@prisma/adapter-pg`),
 * o ne per schemos faile nurodytą URL.
 *
 * Instancija saugoma `globalThis`, kad `tsx watch` perkrovimai
 * nekurtų naujo jungčių telkinio kiekvienam pakeitimui.
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
