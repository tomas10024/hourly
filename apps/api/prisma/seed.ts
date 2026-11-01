import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Demo data for the defence.
 *
 * Two properties matter as much as the content:
 *
 *  - it is repeatable. Everything is wiped and rewritten inside one
 *    transaction, so `npm run db:seed` can be run again at any time and always
 *    leaves the same database behind;
 *  - the identifiers are fixed. Re-seeding keeps every address the same, which
 *    is what lets the Postman collection point at a known project or task.
 *
 * The data itself is Lithuanian on purpose: it is the subject matter of the
 * system, not code.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing (see apps/api/.env.example).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Shared password for the demo accounts. */
const DEMO_PASSWORD = 'slaptazodis123';

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

/* -------------------------------------------------------------------------- */
/* Fixed identifiers                                                          */
/* -------------------------------------------------------------------------- */

const user = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  client: 'a0000000-0000-4000-8000-000000000002',
  specialist: 'a0000000-0000-4000-8000-000000000003',
  clientGreen: 'a0000000-0000-4000-8000-000000000004',
  clientCafe: 'a0000000-0000-4000-8000-000000000005',
  designer: 'a0000000-0000-4000-8000-000000000006',
  frontend: 'a0000000-0000-4000-8000-000000000007',
  dataEngineer: 'a0000000-0000-4000-8000-000000000008',
  blocked: 'a0000000-0000-4000-8000-000000000009',
  // The lighter side of the marketplace, for a smile at the defence. None of
  // them is a Postman account.
  granny: 'a0000000-0000-4000-8000-000000000010',
  startup: 'a0000000-0000-4000-8000-000000000011',
  junior: 'a0000000-0000-4000-8000-000000000012',
  cat: 'a0000000-0000-4000-8000-000000000013',
};

const project = {
  shop: 'b0000000-0000-4000-8000-000000000001', // MARKETPLACE, IN_PROGRESS
  salon: 'b0000000-0000-4000-8000-000000000002', // DIRECT, IN_PROGRESS
  school: 'b0000000-0000-4000-8000-000000000003', // MARKETPLACE, PUBLISHED
  cafe: 'b0000000-0000-4000-8000-000000000004', // MARKETPLACE, DRAFT
  brand: 'b0000000-0000-4000-8000-000000000005', // MARKETPLACE, COMPLETED
  migration: 'b0000000-0000-4000-8000-000000000006', // MARKETPLACE, CANCELLED
  warehouse: 'b0000000-0000-4000-8000-000000000007', // DIRECT, IN_PROGRESS
  tablet: 'b0000000-0000-4000-8000-000000000008', // MARKETPLACE, IN_PROGRESS
  dumplings: 'b0000000-0000-4000-8000-000000000009', // MARKETPLACE, PUBLISHED
  laser: 'b0000000-0000-4000-8000-000000000010', // DIRECT, IN_PROGRESS
  lab: 'b0000000-0000-4000-8000-000000000011', // DIRECT, IN_PROGRESS
};

const task = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const proposal = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const share = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A timestamp `days` ago at the given hour, so the data ages with the clock. */
function daysAgo(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

type SessionSeed = {
  taskId: string;
  specialistId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  appliedRate: number | null;
  comment: string | null;
};

/**
 * A finished session.
 *
 * `durationMinutes` and `appliedRate` are written out exactly as the API would
 * write them when the session is stopped, so the seeded rows are consistent
 * with rows created through the endpoints.
 */
function done(
  taskId: string,
  specialistId: string,
  startedAt: Date,
  minutes: number,
  rate: number,
  comment: string,
): SessionSeed {
  return {
    taskId,
    specialistId,
    startedAt,
    endedAt: new Date(startedAt.getTime() + minutes * 60_000),
    durationMinutes: minutes,
    appliedRate: rate,
    comment,
  };
}

/**
 * A session still running.
 *
 * Only one per specialist is possible (partial unique index), and it belongs
 * to a specialist the demo does not act as - otherwise the very first attempt
 * to start a timer in the Postman collection would answer 409.
 */
function running(taskId: string, specialistId: string, startedAt: Date, comment: string): SessionSeed {
  return {
    taskId,
    specialistId,
    startedAt,
    endedAt: null,
    durationMinutes: null,
    appliedRate: null,
    comment,
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  /* ---------------------------------------------------------------------- */
  /* Wipe                                                                    */
  /* ---------------------------------------------------------------------- */

  // Children first, even though the foreign keys cascade: being explicit makes
  // the order of the data obvious to anyone reading this file.
  await prisma.$transaction([
    prisma.workSession.deleteMany(),
    prisma.shareLink.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  /* ---------------------------------------------------------------------- */
  /* People                                                                  */
  /* ---------------------------------------------------------------------- */

  await prisma.user.createMany({
    data: [
      {
        id: user.admin,
        email: 'admin@hourly.lt',
        passwordHash,
        displayName: 'Administratorius',
        role: 'ADMIN',
      },
      {
        id: user.client,
        email: 'uzsakovas@hourly.lt',
        passwordHash,
        displayName: 'UAB „Pavyzdys“',
        role: 'CLIENT',
        bio: 'Nedidelė įmonė, perkanti kūrimo darbus iš išorės.',
      },
      {
        id: user.specialist,
        email: 'specialistas@hourly.lt',
        passwordHash,
        displayName: 'Laisvai samdomas programuotojas',
        role: 'SPECIALIST',
        bio: 'Saityno taikomosios programos, TypeScript, Node.js.',
      },
      {
        id: user.clientGreen,
        email: 'rasa@zalialanka.lt',
        passwordHash,
        displayName: 'MB „Žalia Lanka“',
        role: 'CLIENT',
        bio: 'Kraštovaizdžio tvarkymo įmonė iš Kauno.',
      },
      {
        id: user.clientCafe,
        email: 'mindaugas@kavinepupa.lt',
        passwordHash,
        displayName: 'Kavinė „Pupa“',
        role: 'CLIENT',
        bio: 'Trijų kavinių tinklas, ieškantis užsakymų sistemos.',
      },
      {
        id: user.designer,
        email: 'gabija@dizainas.lt',
        passwordHash,
        displayName: 'Gabija Petrauskaitė',
        role: 'SPECIALIST',
        bio: 'Grafikos dizainerė: logotipai, stiliaus gairės, spauda.',
      },
      {
        id: user.frontend,
        email: 'tomas@frontend.lt',
        passwordHash,
        displayName: 'Tomas Jankauskas',
        role: 'SPECIALIST',
        bio: 'Kliento pusės kūrėjas, React ir prieinamumas.',
      },
      {
        id: user.dataEngineer,
        email: 'ieva@duomenys.lt',
        passwordHash,
        displayName: 'Ieva Kazlauskienė',
        role: 'SPECIALIST',
        bio: 'Duomenų inžinerija, ataskaitų automatizavimas.',
      },
      // Blocked by the administrator: signing in answers 403 ACCOUNT_BLOCKED.
      // Has no projects or sessions, so blocking is its whole story.
      {
        id: user.blocked,
        email: 'blokuotas@hourly.lt',
        passwordHash,
        displayName: 'Užblokuotas naudotojas',
        role: 'SPECIALIST',
        bio: 'Paskyra užblokuota dėl taisyklių pažeidimo.',
        isBlocked: true,
      },
      {
        id: user.granny,
        email: 'aldona@mociute.lt',
        passwordHash,
        displayName: 'Močiutė Aldona',
        role: 'CLIENT',
        bio: 'Turiu planšetę, du anūkus ir labai daug klausimų. Slaptažodį laikau ant lipnuko prie ekrano.',
      },
      {
        id: user.startup,
        email: 'ceo@cepelinai.ai',
        passwordHash,
        displayName: 'UAB „Cepelinų dirbtinis intelektas“',
        role: 'CLIENT',
        bio: 'Keičiame cepelinų rinką iš pagrindų. Biudžeto neturime, bet turime viziją ir 87 skaidres.',
      },
      {
        id: user.junior,
        email: 'paulius@junior.lt',
        passwordHash,
        displayName: 'Paulius, jaunesnysis programuotojas',
        role: 'SPECIALIST',
        bio: 'Trys mėnesiai patirties, trisdešimt metų pasitikėjimo savimi. Pas mane veikia.',
      },
      {
        id: user.cat,
        email: 'murkis@katinas.lt',
        passwordHash,
        displayName: 'Katinas Murkis',
        role: 'SPECIALIST',
        bio: 'Klaviatūrų testuotojas (vaikštau per jas). Dirbu, kai nemiegu, t. y. dvi valandas per parą.',
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Projects - every status and both origins are represented                */
  /* ---------------------------------------------------------------------- */

  await prisma.project.createMany({
    data: [
      {
        id: project.shop,
        title: 'Internetinės parduotuvės administravimo sritis',
        description:
          'Reikalinga administravimo sritis užsakymams peržiūrėti ir prekių likučiams tvarkyti. ' +
          'Svarbu rolių atskyrimas: sandėlio darbuotojas neturi matyti finansinių ataskaitų.',
        origin: 'MARKETPLACE',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        budgetMin: 1200,
        budgetMax: 2000,
        hourlyRate: 35,
        deadline: daysAgo(-21, 17),
        clientId: user.client,
        specialistId: user.specialist,
      },
      {
        id: project.salon,
        title: 'Kirpyklos internetinė svetainė',
        description:
          'Vieno puslapio svetainė su registracijos forma ir kainoraščiu. Sutarta telefonu, ' +
          'užsakovė platformos paskyros neturi.',
        origin: 'DIRECT',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        hourlyRate: 30,
        externalClientName: 'Kirpykla „Ramunė“',
        specialistId: user.specialist,
      },
      {
        id: project.school,
        title: 'Mokyklos svetainės atnaujinimas',
        description:
          'Esama svetainė pasenusi ir neprisitaiko prie telefono ekrano. Reikia atnaujinti ' +
          'išvaizdą, pridėti naujienų skiltį ir pritaikyti ekrano skaitytuvams.',
        origin: 'MARKETPLACE',
        status: 'PUBLISHED',
        taskAuthoring: 'CLIENT',
        budgetMin: 800,
        budgetMax: 1500,
        hourlyRate: 28,
        deadline: daysAgo(-45, 17),
        clientId: user.clientGreen,
      },
      {
        id: project.cafe,
        title: 'Kavinės išankstinių užsakymų sistema',
        description:
          'Klientai galėtų užsisakyti kavą iš anksto ir atsiimti be eilės. Kol kas renkame ' +
          'reikalavimus, skelbti dar neskubame.',
        origin: 'MARKETPLACE',
        status: 'DRAFT',
        taskAuthoring: 'CLIENT',
        budgetMin: 2000,
        budgetMax: 3500,
        clientId: user.clientCafe,
      },
      {
        id: project.brand,
        title: 'Logotipas ir stiliaus gairės',
        description:
          'Naujas logotipas, spalvų paletė ir trumpas stiliaus gairių dokumentas, kuriuo ' +
          'galėtų naudotis rinkodaros komanda.',
        origin: 'MARKETPLACE',
        status: 'COMPLETED',
        taskAuthoring: 'SPECIALIST',
        budgetMin: 600,
        budgetMax: 1200,
        hourlyRate: 40,
        clientId: user.client,
        specialistId: user.designer,
      },
      {
        id: project.migration,
        title: 'Senos apskaitos sistemos duomenų perkėlimas',
        description:
          'Duomenų perkėlimas iš senos vietinės sistemos. Užsakovas atsisakė darbų, nes ' +
          'nusprendė likti prie esamo sprendimo.',
        origin: 'MARKETPLACE',
        status: 'CANCELLED',
        taskAuthoring: 'CLIENT',
        budgetMin: 1500,
        budgetMax: 2500,
        clientId: user.clientGreen,
      },
      {
        id: project.warehouse,
        title: 'Sandėlio likučių ataskaitos',
        description:
          'Savaitinės likučių ataskaitos, kurios pačios susiformuoja ir išsiunčiamos ' +
          'vadovams. Darbas sutartas tiesiogiai.',
        origin: 'DIRECT',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        hourlyRate: 45,
        externalClientName: 'UAB „Medžio dirbtuvės“',
        specialistId: user.dataEngineer,
      },
      {
        id: project.tablet,
        title: 'Planšetė, kuri pasako, ar „Facebook“ įrašą sukūrė dirbtinis intelektas',
        description:
          'Feisbuke vis matau šuniukus su šešiais pirštais ir 120 metų sulaukusias močiutes, ' +
          'iškepusias 3 metrų tortą. Anūkas sako, kad tai dirbtinis intelektas. Noriu, kad planšetė ' +
          'pati perspėtų, kas tikra, o kas ne. Atsiskaitysiu ir koldūnais.',
        origin: 'MARKETPLACE',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        budgetMin: 50,
        budgetMax: 150,
        hourlyRate: 15,
        deadline: daysAgo(-10, 12),
        clientId: user.granny,
        specialistId: user.junior,
      },
      {
        id: project.dumplings,
        title: 'Cepelinų pristatymas dronais su dirbtiniu intelektu',
        description:
          'Ieškome specialisto, kuris už 50 EUR ir 0,001 % akcijų sukurtų „cepelinų Uberį“. ' +
          'Būtina: blokų grandinė, dirbtinis intelektas, metavisata. Pageidautina: veikiantis ' +
          'produktas iki pirmadienio.',
        origin: 'MARKETPLACE',
        status: 'PUBLISHED',
        taskAuthoring: 'CLIENT',
        budgetMin: 30,
        budgetMax: 50,
        deadline: daysAgo(-3, 9),
        clientId: user.startup,
      },
      {
        id: project.laser,
        title: 'Raudono lazerio taškelio sugavimas',
        description:
          'Taškelis pasirodo kasdien 19 val. ir dingsta, vos jį pagavus. Tikėtina, kad tai ne ' +
          'taškelio, o šeimininko rankos klaida. Sutarta tiesiogiai, prie maisto dubenėlio.',
        origin: 'DIRECT',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        hourlyRate: 2,
        externalClientName: 'Šeimininkas (nežino, kad yra užsakovas)',
        specialistId: user.cat,
      },
      {
        id: project.lab,
        title: 'Laboratorinis darbas, kuris turi veikti per gynimą',
        description:
          'Lokaliai veikia. Debesyje – kaip kada. Gynimas jau greitai, todėl darbas apskaitomas ' +
          'minutės tikslumu, o įkainis atitinka studento stipendiją.',
        origin: 'DIRECT',
        status: 'IN_PROGRESS',
        taskAuthoring: 'SPECIALIST',
        hourlyRate: 1,
        externalClientName: 'Labai griežta komisija',
        specialistId: user.frontend,
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Tasks                                                                   */
  /* ---------------------------------------------------------------------- */

  await prisma.task.createMany({
    data: [
      // Internetinės parduotuvės administravimo sritis
      {
        id: task(1),
        projectId: project.shop,
        title: 'Autentifikacija ir rolės',
        description: 'Prisijungimas, rolių tikrinimas, sesijos galiojimas.',
        status: 'DONE',
        position: 0,
        estimatedHours: 12,
        approvedAt: daysAgo(24, 10),
      },
      {
        id: task(2),
        projectId: project.shop,
        title: 'Užsakymų sąrašas su filtrais',
        description: 'Puslapiavimas, filtrai pagal būseną ir datą.',
        status: 'IN_PROGRESS',
        position: 1,
        estimatedHours: 16,
        approvedAt: daysAgo(24, 10),
      },
      {
        id: task(3),
        projectId: project.shop,
        title: 'Prekių likučių ataskaita',
        description: 'Atskiras įkainis, nes reikia duomenų bazės optimizavimo.',
        status: 'TODO',
        position: 2,
        hourlyRate: 45,
        estimatedHours: 8,
      },
      {
        id: task(4),
        projectId: project.shop,
        title: 'Nuolaidų kodai',
        description: 'Laukiama užsakovo sprendimo dėl kodų galiojimo taisyklių.',
        status: 'BLOCKED',
        position: 3,
        estimatedHours: 6,
      },
      {
        id: task(21),
        projectId: project.shop,
        title: 'Mokėjimų integracija',
        description: 'Banklink ir kortelių mokėjimai per mokėjimų tarpininką.',
        status: 'TODO',
        position: 4,
        estimatedHours: 14,
        approvedAt: daysAgo(24, 10),
      },

      // Kirpyklos internetinė svetainė
      {
        id: task(5),
        projectId: project.salon,
        title: 'Maketas ir spalvos',
        status: 'DONE',
        position: 0,
        estimatedHours: 6,
      },
      {
        id: task(6),
        projectId: project.salon,
        title: 'Registracijos forma',
        description: 'Laiko pasirinkimas ir patvirtinimas el. paštu.',
        status: 'IN_PROGRESS',
        position: 1,
        estimatedHours: 10,
      },
      {
        id: task(7),
        projectId: project.salon,
        title: 'Turinio suvedimas',
        status: 'TODO',
        position: 2,
        estimatedHours: 4,
      },

      // Mokyklos svetainės atnaujinimas (paskelbtas, laukia pasiūlymų)
      { id: task(8), projectId: project.school, title: 'Naujas titulinis puslapis', status: 'TODO', position: 0, estimatedHours: 10 },
      { id: task(9), projectId: project.school, title: 'Naujienų skiltis', status: 'TODO', position: 1, estimatedHours: 12 },
      { id: task(10), projectId: project.school, title: 'Prieinamumo patikra', status: 'TODO', position: 2, estimatedHours: 6 },

      // Kavinės sistema (juodraštis)
      { id: task(11), projectId: project.cafe, title: 'Reikalavimų sąrašas', status: 'TODO', position: 0 },
      { id: task(12), projectId: project.cafe, title: 'Meniu struktūra', status: 'TODO', position: 1 },

      // Logotipas ir stiliaus gairės (užbaigtas)
      { id: task(13), projectId: project.brand, title: 'Koncepcija ir eskizai', status: 'DONE', position: 0, estimatedHours: 8, approvedAt: daysAgo(60, 12) },
      { id: task(14), projectId: project.brand, title: 'Logotipo variantai', status: 'DONE', position: 1, estimatedHours: 10, approvedAt: daysAgo(60, 12) },
      {
        id: task(15),
        projectId: project.brand,
        title: 'Stiliaus gairių dokumentas',
        status: 'DONE',
        position: 2,
        hourlyRate: 50,
        estimatedHours: 6,
        approvedAt: daysAgo(60, 12),
      },

      // Duomenų perkėlimas (atšauktas)
      { id: task(16), projectId: project.migration, title: 'Duomenų struktūros analizė', status: 'TODO', position: 0 },
      { id: task(17), projectId: project.migration, title: 'Perkėlimo scenarijai', status: 'TODO', position: 1 },

      // Sandėlio likučių ataskaitos
      { id: task(18), projectId: project.warehouse, title: 'Duomenų šaltinių auditas', status: 'DONE', position: 0, estimatedHours: 12 },
      { id: task(19), projectId: project.warehouse, title: 'Ataskaitų šablonai', status: 'IN_PROGRESS', position: 1, estimatedHours: 14 },
      { id: task(20), projectId: project.warehouse, title: 'Automatinis siuntimas', status: 'TODO', position: 2, estimatedHours: 8 },

      // Močiutės planšetė
      { id: task(22), projectId: project.tablet, title: 'Atpažinti šešis pirštus nuotraukose', status: 'DONE', position: 0, estimatedHours: 4, approvedAt: daysAgo(10, 18) },
      {
        id: task(23),
        projectId: project.tablet,
        title: 'Perspėjimas „Tai DI“ dideliu šriftu',
        description: '72 pt, kad matytųsi ir be akinių.',
        status: 'DONE',
        position: 1,
        estimatedHours: 1,
        approvedAt: daysAgo(10, 18),
      },
      {
        id: task(24),
        projectId: project.tablet,
        title: 'Atpažinti įrašus „Pažymėk patinka, jei sutinki“',
        description: 'Kol kas visi tokie įrašai atpažinti kaip DI. Klaidų nerasta.',
        status: 'IN_PROGRESS',
        position: 2,
        estimatedHours: 3,
        approvedAt: daysAgo(10, 18),
      },
      {
        id: task(25),
        projectId: project.tablet,
        title: 'Patikrinti, ar anūko nuotraukos iš Bali tikros',
        description: 'Anūkas atsisako pateikti duomenis.',
        status: 'BLOCKED',
        position: 3,
        estimatedHours: 2,
      },
      {
        id: task(26),
        projectId: project.tablet,
        title: 'Paaiškinti, kodėl perspėjimas rodomas prie visų giminaičių sveikinimų',
        status: 'TODO',
        position: 4,
        estimatedHours: 3,
      },

      // Cepelinai dronais (paskelbtas, laukia pasiūlymų)
      { id: task(27), projectId: project.dumplings, title: 'Dirbtinis intelektas, nuspėjantis, kada norėsis cepelinų', status: 'TODO', position: 0, estimatedHours: 200 },
      { id: task(28), projectId: project.dumplings, title: 'Spirgučių sekimas blokų grandinėje', status: 'TODO', position: 1, estimatedHours: 120 },
      { id: task(29), projectId: project.dumplings, title: 'Dronas, kuris nenumeta grietinės', status: 'TODO', position: 2, estimatedHours: 80 },
      { id: task(30), projectId: project.dumplings, title: 'Investuotojų pristatymas (87 skaidrės)', status: 'TODO', position: 3, estimatedHours: 1 },

      // Lazerio taškelis
      { id: task(31), projectId: project.laser, title: 'Taškelio stebėjimas iš po sofos', status: 'DONE', position: 0, estimatedHours: 5 },
      {
        id: task(32),
        projectId: project.laser,
        title: 'Šuolis ant sienos',
        description: 'Antras bandymas. Pirmasis baigėsi vazono netektimi.',
        status: 'IN_PROGRESS',
        position: 1,
        estimatedHours: 1,
      },
      {
        id: task(33),
        projectId: project.laser,
        title: 'Ataskaita šeimininkui',
        description: 'Neturiu nykščių.',
        status: 'BLOCKED',
        position: 2,
        estimatedHours: 1,
      },

      // Laboratorinis darbas
      {
        id: task(34),
        projectId: project.lab,
        title: 'Įdiegti į Azure',
        description: 'Planuota viena valanda. Prireikė septynių bandymų, trijų regionų ir vienos kvotos.',
        status: 'DONE',
        position: 0,
        estimatedHours: 1,
      },
      { id: task(35), projectId: project.lab, title: 'Išsiaiškinti, kodėl lokaliai veikia, o debesyje – ne', status: 'DONE', position: 1, estimatedHours: 0.5 },
      { id: task(36), projectId: project.lab, title: 'Paaiškinti, kad tai ne klaida, o funkcija', status: 'IN_PROGRESS', position: 2, estimatedHours: 2 },
      {
        id: task(37),
        projectId: project.lab,
        title: 'Išsimiegoti',
        description: 'Laukiama sesijos pabaigos.',
        status: 'BLOCKED',
        position: 3,
        estimatedHours: 8,
      },
      {
        id: task(38),
        projectId: project.lab,
        title: 'Gauti dešimtuką',
        description: 'Priklauso nuo komisijos nuotaikos ir šio projekto.',
        status: 'TODO',
        position: 4,
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Work sessions                                                           */
  /* ---------------------------------------------------------------------- */

  await prisma.workSession.createMany({
    data: [
      // Parduotuvės administravimo sritis, 35 EUR/h
      done(task(1), user.specialist, daysAgo(22, 9), 240, 35, 'Prisijungimo srautas ir žetonų galiojimas.'),
      done(task(1), user.specialist, daysAgo(21, 10), 180, 35, 'Rolių tikrinimas maršrutuose.'),
      done(task(1), user.specialist, daysAgo(20, 13), 120, 35, 'Testai ir klaidų apdorojimas.'),
      done(task(2), user.specialist, daysAgo(14, 9, 30), 150, 35, 'Užsakymų sąrašo puslapiavimas.'),
      done(task(2), user.specialist, daysAgo(12, 10), 90, 35, 'Užsakymų paieška pagal klientą.'),
      done(task(2), user.specialist, daysAgo(10, 11), 90, 35, 'Filtrai pagal būseną.'),
      done(task(2), user.specialist, daysAgo(6, 9), 120, 35, 'Užsakymo detalių langas.'),
      done(task(2), user.specialist, daysAgo(4, 14), 120, 35, 'Filtras pagal datą ir rikiavimas.'),
      done(task(4), user.specialist, daysAgo(8, 16), 60, 35, 'Pradinė analizė, laukiame atsakymo.'),

      // Kirpyklos svetainė, 30 EUR/h - projektas su peržiūros nuoroda
      done(task(5), user.specialist, daysAgo(18, 10), 180, 30, 'Pirmas maketo variantas.'),
      done(task(5), user.specialist, daysAgo(17, 9), 120, 30, 'Spalvos ir šriftai pagal užsakovės pageidavimą.'),
      done(task(6), user.specialist, daysAgo(6, 13), 150, 30, 'Formos laukai ir tikrinimas.'),
      done(task(6), user.specialist, daysAgo(2, 10), 90, 30, 'Laiko pasirinkimo kalendorius.'),

      // Logotipas ir stiliaus gairės, 40 EUR/h (gairių užduotis - 50)
      done(task(13), user.designer, daysAgo(72, 9), 180, 40, 'Konkurentų apžvalga ir eskizai.'),
      done(task(13), user.designer, daysAgo(71, 10), 240, 40, 'Krypties pasirinkimas su užsakovu.'),
      done(task(14), user.designer, daysAgo(68, 9), 240, 40, 'Trys logotipo variantai.'),
      done(task(14), user.designer, daysAgo(67, 9), 180, 40, 'Pataisymai pagal pastabas.'),
      done(task(14), user.designer, daysAgo(65, 11), 120, 40, 'Galutinis failų paruošimas.'),
      done(task(15), user.designer, daysAgo(63, 10), 180, 50, 'Gairių dokumento struktūra.'),
      done(task(15), user.designer, daysAgo(62, 10), 150, 50, 'Spaudos ir ekrano pavyzdžiai.'),

      // Sandėlio ataskaitos, 45 EUR/h
      done(task(18), user.dataEngineer, daysAgo(12, 9), 240, 45, 'Esamų ataskaitų inventorizacija.'),
      done(task(18), user.dataEngineer, daysAgo(11, 9), 180, 45, 'Duomenų kokybės patikros.'),
      done(task(18), user.dataEngineer, daysAgo(9, 14), 120, 45, 'Auditos išvadų surašymas.'),
      done(task(19), user.dataEngineer, daysAgo(5, 10), 150, 45, 'Savaitinės ataskaitos šablonas.'),
      done(task(19), user.dataEngineer, daysAgo(3, 11), 90, 45, 'Suvestinės pagal sandėlius.'),

      // Močiutės planšetė, 15 EUR/h
      done(task(22), user.junior, daysAgo(9, 10), 45, 15, 'Modelis rado šešis pirštus. Pasirodo, tai buvo dvi rankos.'),
      done(task(22), user.junior, daysAgo(8, 10), 60, 15, 'Pataisyta. Modelis nebeskaičiuoja bananų kaip pirštų.'),
      done(task(23), user.junior, daysAgo(7, 14), 90, 15, 'Perspėjimas veikia. Užima visą ekraną.'),
      done(task(24), user.junior, daysAgo(5, 11), 120, 15, 'Patikrinau 200 įrašų: 199 – DI, vienas – kaimynės pyragas.'),
      done(task(24), user.junior, daysAgo(3, 15), 30, 15, 'Gavau koldūnų. Darbas tęsiamas.'),

      // Lazerio taškelis, 2 EUR/h
      done(task(31), user.cat, daysAgo(4, 19), 15, 2, 'Taškelis pastebėtas. Apsimečiau, kad man neįdomu.'),
      done(task(31), user.cat, daysAgo(3, 19), 20, 2, 'Taškelis pabėgo ant lubų – ne mano kompetencija.'),
      done(task(32), user.cat, daysAgo(2, 19), 5, 2, 'Šokau. Nukritau. Apsimečiau, kad taip ir planavau.'),
      done(task(32), user.cat, daysAgo(2, 3), 240, 2, 'Miegojau ant klaviatūros. Įkeltas pakeitimas „ffffffffffff“.'),

      // Laboratorinis darbas, 1 EUR/h
      done(task(34), user.frontend, daysAgo(2, 21), 30, 1, 'az postgres flexible-server create: unrecognized arguments.'),
      done(task(34), user.frontend, daysAgo(2, 22), 45, 1, 'SkuNotAvailable. Keičiu regioną.'),
      done(task(34), user.frontend, daysAgo(2, 23), 60, 1, 'Kvota: 0. Keičiu regioną dar kartą.'),
      done(task(35), user.frontend, daysAgo(1, 1), 120, 1, 'Paaiškėjo, kad pamiršau įkelti kodą. Dabar veikia.'),
      done(task(36), user.frontend, daysAgo(1, 10), 90, 1, 'Paruošiau tris paaiškinimus. Visi skamba įtikinamai.'),

      // The sessions still running - deliberately not the demo specialist.
      running(task(19), user.dataEngineer, daysAgo(0, 9), 'Vykdoma: grafikų formatavimas.'),
      running(task(26), user.junior, daysAgo(0, 8), 'Močiutė skambina paklausti, ar šis skambutis irgi DI.'),
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Proposals - all four statuses appear                                    */
  /* ---------------------------------------------------------------------- */

  await prisma.proposal.createMany({
    data: [
      {
        id: proposal(1),
        projectId: project.shop,
        specialistId: user.specialist,
        price: 1600,
        hourlyRate: 35,
        estimatedDays: 20,
        message: 'Turiu panašios patirties su užsakymų sistemomis, galiu pradėti kitą savaitę.',
        status: 'ACCEPTED',
      },
      {
        id: proposal(2),
        projectId: project.shop,
        specialistId: user.frontend,
        price: 1900,
        estimatedDays: 25,
        message: 'Galėčiau imtis kliento pusės darbų.',
        status: 'REJECTED',
      },
      {
        id: proposal(3),
        projectId: project.school,
        specialistId: user.specialist,
        price: 1200,
        hourlyRate: 28,
        estimatedDays: 15,
        message: 'Siūlau pradėti nuo prieinamumo patikros - ji dažnai pakeičia maketo sprendimus.',
        status: 'PENDING',
      },
      {
        id: proposal(4),
        projectId: project.school,
        specialistId: user.designer,
        price: 1450,
        estimatedDays: 18,
        message: 'Kartu atnaujinčiau ir spalvų paletę.',
        status: 'PENDING',
      },
      {
        id: proposal(5),
        projectId: project.school,
        specialistId: user.frontend,
        price: 990,
        estimatedDays: 12,
        message: 'Atsiprašau, atsilaisvinsiu tik kitą mėnesį.',
        status: 'WITHDRAWN',
      },
      {
        id: proposal(6),
        projectId: project.brand,
        specialistId: user.designer,
        price: 950,
        hourlyRate: 40,
        estimatedDays: 14,
        message: 'Pridedu panašių darbų pavyzdžius.',
        status: 'ACCEPTED',
      },
      {
        id: proposal(7),
        projectId: project.migration,
        specialistId: user.dataEngineer,
        price: 2100,
        estimatedDays: 30,
        message: 'Reikėtų prieigos prie senos duomenų bazės kopijos.',
        status: 'REJECTED',
      },
      {
        id: proposal(8),
        projectId: project.tablet,
        specialistId: user.junior,
        price: 100,
        hourlyRate: 15,
        estimatedDays: 1,
        message: 'Padarysiu per vakarą: kodą parašys DI, jis ir patikrins.',
        status: 'ACCEPTED',
      },
      {
        id: proposal(9),
        projectId: project.dumplings,
        specialistId: user.cat,
        price: 3,
        estimatedDays: 1,
        message: 'Sutinku už tris sardines. Dronus gaudyti galiu nemokamai.',
        status: 'PENDING',
      },
      {
        id: proposal(10),
        projectId: project.dumplings,
        specialistId: user.dataEngineer,
        price: 4800,
        estimatedDays: 90,
        message: 'Mano įvertinimas – 4800 EUR. Spirgučių blokų grandinė – papildomai.',
        status: 'PENDING',
      },
      {
        id: proposal(11),
        projectId: project.dumplings,
        specialistId: user.frontend,
        price: 50,
        estimatedDays: 3,
        message: 'Ar „iki pirmadienio“ reiškia šį pirmadienį?',
        status: 'WITHDRAWN',
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Share links - every state, so 404 can be demonstrated                   */
  /* ---------------------------------------------------------------------- */

  const liveToken = randomBytes(32).toString('base64url');
  const expiredToken = randomBytes(32).toString('base64url');
  const revokedToken = randomBytes(32).toString('base64url');
  const shopToken = randomBytes(32).toString('base64url');
  const warehouseToken = randomBytes(32).toString('base64url');
  const oldSalonToken = randomBytes(32).toString('base64url');
  const labToken = randomBytes(32).toString('base64url');
  const hash = (token: string) => createHash('sha256').update(token).digest('hex');

  await prisma.shareLink.createMany({
    data: [
      {
        id: share(1),
        projectId: project.salon,
        tokenHash: hash(liveToken),
        expiresAt: daysAgo(-30, 12),
        lastViewedAt: daysAgo(1, 19),
      },
      {
        id: share(2),
        projectId: project.warehouse,
        tokenHash: hash(expiredToken),
        expiresAt: daysAgo(2, 12),
        lastViewedAt: daysAgo(5, 9),
      },
      {
        id: share(3),
        projectId: project.brand,
        tokenHash: hash(revokedToken),
        expiresAt: daysAgo(-10, 12),
        revokedAt: daysAgo(3, 15),
      },
      // Sent to the client of the shop, not opened yet.
      {
        id: share(4),
        projectId: project.shop,
        tokenHash: hash(shopToken),
        expiresAt: daysAgo(-14, 12),
      },
      // The warehouse owner got a fresh link after the old one expired.
      {
        id: share(5),
        projectId: project.warehouse,
        tokenHash: hash(warehouseToken),
        expiresAt: daysAgo(-28, 12),
        lastViewedAt: daysAgo(0, 8),
      },
      // The first salon link, replaced by share 1 and revoked.
      {
        id: share(6),
        projectId: project.salon,
        tokenHash: hash(oldSalonToken),
        expiresAt: daysAgo(-5, 12),
        lastViewedAt: daysAgo(15, 18),
        revokedAt: daysAgo(10, 9),
      },
      // For the committee: the lab work's progress, open to anyone with it.
      {
        id: share(7),
        projectId: project.lab,
        tokenHash: hash(labToken),
        expiresAt: daysAgo(-60, 12),
      },
    ],
  });

  // A session has no fixed id (the seed does not need one), so the one used
  // to demonstrate the full hierarchy is looked up.
  const hierarchySession = await prisma.workSession.findFirstOrThrow({
    where: { taskId: task(2) },
    orderBy: { startedAt: 'asc' },
    select: { id: true },
  });

  /* ---------------------------------------------------------------------- */
  /* Hand the identifiers over to the Postman collection                     */
  /* ---------------------------------------------------------------------- */

  const here = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(here, '../../../docs/postman/demo-data.json');
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const demoData = {
    generatedAt: new Date().toISOString(),
    password: DEMO_PASSWORD,
    users: {
      admin: { id: user.admin, email: 'admin@hourly.lt' },
      client: { id: user.client, email: 'uzsakovas@hourly.lt' },
      specialist: { id: user.specialist, email: 'specialistas@hourly.lt' },
      otherClient: { id: user.clientGreen, email: 'rasa@zalialanka.lt' },
      otherSpecialist: { id: user.frontend, email: 'tomas@frontend.lt' },
      busySpecialist: { id: user.dataEngineer, email: 'ieva@duomenys.lt' },
      blocked: { id: user.blocked, email: 'blokuotas@hourly.lt' },
    },
    projects: {
      inProgress: project.shop,
      direct: project.salon,
      published: project.school,
      draft: project.cafe,
      completed: project.brand,
      cancelled: project.migration,
    },
    tasks: {
      withSessions: task(2),
      withOwnRate: task(3),
      inDirectProject: task(6),
    },
    proposals: { pending: proposal(3), accepted: proposal(1) },
    // project -> task (5 sessions) -> session: for the three-level addresses.
    hierarchy: {
      projectId: project.shop,
      taskId: task(2),
      sessionId: hierarchySession.id,
      url: `/api/projects/${project.shop}/tasks/${task(2)}/sessions/${hierarchySession.id}`,
    },
    shareTokens: {
      live: liveToken,
      expired: expiredToken,
      revoked: revokedToken,
      liveShop: shopToken,
      liveWarehouse: warehouseToken,
      revokedSalon: oldSalonToken,
    },
  };

  writeFileSync(outputPath, `${JSON.stringify(demoData, null, 2)}\n`, 'utf8');

  /* ---------------------------------------------------------------------- */
  /* Report                                                                  */
  /* ---------------------------------------------------------------------- */

  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.workSession.count(),
    prisma.proposal.count(),
    prisma.shareLink.count(),
  ]);

  console.log('Seed data written:');
  console.table([
    { table: 'users', rows: counts[0] },
    { table: 'projects', rows: counts[1] },
    { table: 'tasks', rows: counts[2] },
    { table: 'work_sessions', rows: counts[3] },
    { table: 'proposals', rows: counts[4] },
    { table: 'share_links', rows: counts[5] },
  ]);
  console.log(`Password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`Live share link:    ${WEB_ORIGIN}/p/${liveToken}`);
  console.log(`Expired share link: ${WEB_ORIGIN}/p/${expiredToken}`);
  console.log(`Revoked share link: ${WEB_ORIGIN}/p/${revokedToken}`);
  console.log(`Lab work share link: ${WEB_ORIGIN}/p/${labToken}`);
  const repoRoot = path.resolve(here, '../../..');
  const relativeOutput = path.relative(repoRoot, outputPath).split(path.sep).join('/');
  console.log(`Identifiers for Postman: ${relativeOutput}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
