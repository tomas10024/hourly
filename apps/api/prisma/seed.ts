import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing (see apps/api/.env.example).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Shared password for the demo accounts. */
const DEMO_PASSWORD = 'slaptazodis123';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [admin, client, specialist] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@valandine.lt' },
      update: {},
      create: {
        email: 'admin@valandine.lt',
        passwordHash,
        displayName: 'Administratorius',
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'uzsakovas@valandine.lt' },
      update: {},
      create: {
        email: 'uzsakovas@valandine.lt',
        passwordHash,
        displayName: 'UAB Pavyzdys',
        role: 'CLIENT',
        bio: 'Nedidelė įmonė, perkanti kūrimo darbus iš išorės.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'specialistas@valandine.lt' },
      update: {},
      create: {
        email: 'specialistas@valandine.lt',
        passwordHash,
        displayName: 'Laisvai samdomas programuotojas',
        role: 'SPECIALIST',
        bio: 'Saityno taikomosios programos, TypeScript.',
      },
    }),
  ]);

  // 1. Marketplace project: published, with an accepted proposal.
  const marketplace = await prisma.project.create({
    data: {
      title: 'Internetinės parduotuvės administravimo sritis',
      description:
        'Reikalinga administravimo sritis užsakymams peržiūrėti ir prekių likučiams tvarkyti.',
      origin: 'MARKETPLACE',
      status: 'IN_PROGRESS',
      taskAuthoring: 'SPECIALIST',
      budgetMin: 1200,
      budgetMax: 2000,
      hourlyRate: 35,
      clientId: client.id,
      specialistId: specialist.id,
      tasks: {
        create: [
          { title: 'Autentifikacija ir rolės', position: 0, status: 'DONE' },
          { title: 'Užsakymų sąrašas', position: 1, status: 'IN_PROGRESS' },
          { title: 'Prekių likučių ataskaita', position: 2, hourlyRate: 45 },
        ],
      },
      proposals: {
        create: {
          specialistId: specialist.id,
          price: 1600,
          hourlyRate: 35,
          estimatedDays: 20,
          message: 'Turiu panašios patirties, galiu pradėti kitą savaitę.',
          status: 'ACCEPTED',
        },
      },
    },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });

  // A few finished work sessions so the report has something to show.
  const [firstTask, secondTask] = marketplace.tasks;
  if (firstTask && secondTask) {
    const day = (offset: number, hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    await prisma.workSession.createMany({
      data: [
        {
          taskId: firstTask.id,
          specialistId: specialist.id,
          startedAt: day(3, 9),
          endedAt: day(3, 13),
          durationMinutes: 240,
          appliedRate: 35,
          comment: 'JWT žetonai ir rolių tikrinimas.',
        },
        {
          taskId: secondTask.id,
          specialistId: specialist.id,
          startedAt: day(2, 10),
          endedAt: day(2, 12),
          durationMinutes: 120,
          appliedRate: 35,
          comment: 'Užsakymų sąrašo puslapiavimas.',
        },
      ],
    });
  }

  // 2. Directly agreed work: no proposal stage, with a share link.
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const direct = await prisma.project.create({
    data: {
      title: 'Kirpyklos internetinė svetainė',
      description: 'Vieno puslapio svetainė su registracijos forma. Sutarta telefonu.',
      origin: 'DIRECT',
      status: 'IN_PROGRESS',
      taskAuthoring: 'SPECIALIST',
      hourlyRate: 30,
      externalClientName: 'Kirpykla „Ramunė“',
      specialistId: specialist.id,
      tasks: {
        create: [
          { title: 'Maketas', position: 0, status: 'DONE' },
          { title: 'Registracijos forma', position: 1 },
        ],
      },
      shareLinks: {
        create: {
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt,
        },
      },
    },
  });

  console.log('Seed data written:');
  console.table([
    { account: admin.email, role: 'ADMIN' },
    { account: client.email, role: 'CLIENT' },
    { account: specialist.email, role: 'SPECIALIST' },
  ]);
  console.log(`Password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`Marketplace project: ${marketplace.id}`);
  console.log(`Direct project: ${direct.id}`);
  console.log(`Share link: http://localhost:3000/p/${token}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
