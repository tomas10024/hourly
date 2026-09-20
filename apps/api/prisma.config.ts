import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 konfigūracija.
 * Nuo 7 versijos prisijungimo eilutė nebelaikoma `schema.prisma` faile -
 * migracijoms ji nurodoma čia, o vykdymo metu klientei perduodama per adapterį
 * (žr. `src/lib/prisma.ts`).
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
