import { buildApp } from './app.js';
import { env } from './env.js';
import { prisma } from './lib/prisma.js';

const app = buildApp();
const server = app.listen(env.PORT, () => {
  console.log(`Valandinė API klauso http://localhost:${env.PORT}/api`);
  console.log(`Sąsajos dokumentacija: http://localhost:${env.PORT}/api/docs`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
