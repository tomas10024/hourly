# Darbų planas: 1 laboratorinis (su 2 ir 3 lab. prielaidomis)

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md).

Sprendimai, priimti prieš pradedant:

| Klausimas | Sprendimas |
|---|---|
| Autentifikacija | **Ne 1 lab.** Maršrutai atviri; veikiantis naudotojas perduodamas `X-Actor-Id` antrašte (vienintelė vieta, kurią 2 lab. pakeis JWT). |
| Ataskaitos formatas | JSON, o su `Accept: text/csv` – CSV su `Content-Disposition: attachment`. |
| Demonstracija | Postman kolekcija saugykloje + `npm run demo` (Newman). |
| Diegimas (3 lab.) | Azure, kaip aprašyta README 2 skyriuje. |

---

## 0. Būklė

**1 laboratorinio darbo dalis baigta.** Realizuoti visi 27 dalykiniai sąsajos
metodai (iš jų 15 pagrindinių CRUD), paruošti demonstraciniai duomenys, Postman
kolekcija ir dokumentacija.

| Etapas | Turinys | Būklė |
|---|---|---|
| A | Pamatai: validavimas, serializavimas, klaidų žemėlapis, naudotojo siūlė | atlikta |
| B | Projektai, užduotys, darbo sesijos (15 metodų) | atlikta |
| C | Pasiūlymai, peržiūros nuorodos, ataskaita (JSON + CSV) | atlikta |
| D | Prasmingi ir pakartojami demonstraciniai duomenys | atlikta |
| E | Postman kolekcija, `npm run demo`, CI integracija | atlikta |
| F | README: metodų lentelė, klaidų politika, demonstracija, `docs/openapi.json` | atlikta |

Toliau – 2 laboratorinis darbas (žr. 9 skyrių) ir 3 laboratorinis (10 skyrius).

Žemiau paliekamas pradinis planas – jis rodo, kaip darbas buvo suskaidytas ir
kodėl priimti vienokie ar kitokie sprendimai.

## 1. Etapas A – pamatai (be jų nerašysime nė vieno maršruto)

### A1. `src/lib/serialize.ts`

Prisma grąžina `Decimal` (objektas) ir `Date`, o `packages/shared` schemos laukia `number` ir ISO eilutės. Be konvertavimo atsakymai neatitiks savo pačių OpenAPI aprašo.

```
toProject(row)  -> Project
toTask(row)     -> Task
toSession(row)  -> WorkSession
toProposal(row) -> Proposal
toShare(row)    -> ShareLink
money(d)        -> number | null   // Decimal -> Number(d.toFixed(2))
iso(d)          -> string | null   // Date -> d.toISOString()
```

Prie kiekvienos funkcijos – vitest testas, kad rezultatą priima atitinkama Zod schema (`Project.parse(toProject(row))`). Tai automatiškai saugo, kad realizacija nenutoltų nuo specifikacijos.

### A2. `src/middleware/validate.ts`

```
validate({ params?, query?, body? })
```

Sėkmės atveju perrašo `req.validated = { params, query, body }` (tipizuotas `Request` išplėtimas `src/types/express.d.ts`). Nesėkmė – meta `ZodError`, kurį `errorHandler` jau paverčia į 422.

**Kodų politika (šitą reikės pagrįsti gynime):**

| Situacija | Kodas |
|---|---|
| Netaisyklingas JSON (`entity.parse.failed`) | 400 |
| Netaisyklingas `id` kelyje (ne UUID) | 400 |
| Netinkami `query` parametrai (`scope=xyz`, `perPage=999`) | 400 |
| Taisyklingas JSON, bet neatitinka schemos ar verslo taisyklės | 422 |
| Resursas nerastas | 404 |
| Konfliktas (antra neužbaigta sesija, antras priimtas pasiūlymas) | 409 |

Priežastis, kurią verta pasakyti gynime: 400 – užklausos sintaksė, 422 – semantika.

### A3. `errorHandler` papildymai (`middleware/error.ts`)

Dabar `body-parser` JSON klaida ir Prisma klaidos krenta į 500. Reikia:

- `err.type === 'entity.parse.failed'` → 400 `MALFORMED_JSON`;
- `PrismaClientKnownRequestError`: `P2025` → 404 `NOT_FOUND`, `P2002` → 409 `CONFLICT` (su `meta.target`, kad matytųsi, kuris dalinis indeksas suveikė), `P2003` → 422 `INVALID_REFERENCE`;
- `PrismaClientValidationError` → 400.

### A4. `src/lib/actor.ts` – vienintelė 2 lab. siūlė

```
actorId(req): string | null      // 1 lab.: X-Actor-Id antraštė
requireActor(req): string        // nėra -> HttpError(400, 'ACTOR_REQUIRED')
```

Visi maršrutai naudoja tik šias dvi funkcijas. 2 lab. jų vidus pakeičiamas į `req.user.id` iš JWT, o maršrutai lieka nepaliesti. OpenAPI 1 lab. `X-Actor-Id` aprašoma kaip antraštės parametras; `security: bearerAuth` iš metodų laikinai išimama (kitaip Swagger UI rodys tai, ko nėra).

### A5. Smulkmenos

- `packages/shared` nėra stebimas `npm run dev` metu – į šakninį `dev` pridėti `dev:shared` (`tsc --watch`), kitaip pakeitus schemą API mato seną `dist`.
- `src/lib/http.ts`: `created(res, location, body)` – nustato `201` ir `Location` antraštę; `noContent(res)` – `204`.

---

## 2. Etapas B – 15 pagrindinių metodų

Kiekvienam resursui – atskiras `src/routes/*.ts` su `Router`, prijungiamas `app.ts` po `/api`.

### B1. Projektai (`routes/projects.ts`)

| Metodas | Sėkmė | Elgsena |
|---|---|---|
| `GET /projects` | 200 | `ProjectListQuery`: `scope` (`marketplace` – tik `PUBLISHED`; `owned` – `clientId = actor`; `assigned` – `specialistId = actor`), `q` (paieška pavadinime ir aprašyme, `mode: 'insensitive'`), `status`, `page`, `perPage`. Atsakymas – `paginated(Project)`. `scope=owned\|assigned` be `X-Actor-Id` → 400. |
| `GET /projects/{id}` | 200 | Nerastas → 404. |
| `POST /projects` | 201 | `CreateProjectInput`. `origin=DIRECT` → privalomas `externalClientName`, `specialistId = actor`, būsena iš karto `IN_PROGRESS`. `origin=MARKETPLACE` → `clientId = actor`, būsena `DRAFT`. `Location: /api/projects/{id}`. |
| `PATCH /projects/{id}` | 200 | `UpdateProjectInput`. Būsenų perėjimai tikrinami baltuoju sąrašu (žr. žemiau); neleistinas perėjimas → 422. |
| `DELETE /projects/{id}` | 204 | Kaskadiškai šalina užduotis, sesijas, pasiūlymus, nuorodas (jau numatyta migracijoje). |

Leistini būsenų perėjimai:

```
DRAFT       -> PUBLISHED | CANCELLED
PUBLISHED   -> IN_PROGRESS (tik priimant pasiūlymą) | CANCELLED
IN_PROGRESS -> COMPLETED | CANCELLED
COMPLETED   -> (galutinė)
CANCELLED   -> (galutinė)
```

### B2. Užduotys (`routes/tasks.ts`)

| Metodas | Sėkmė | Elgsena |
|---|---|---|
| `GET /tasks?projectId=` | 200 | Rikiuojama pagal `position`. |
| `GET /tasks/{id}` | 200 | |
| `POST /tasks` | 201 | `projectId` neegzistuoja → 422 `INVALID_REFERENCE`. `position` nenurodyta → `max(position)+1`. |
| `PATCH /tasks/{id}` | 200 | Naudojama ir būsenos keitimui, ir patvirtinimui (`approvedAt`). |
| `DELETE /tasks/{id}` | 204 | |

### B3. Darbo sesijos (`routes/sessions.ts`)

| Metodas | Sėkmė | Elgsena |
|---|---|---|
| `GET /sessions?taskId=` | 200 | Rikiuojama pagal `startedAt desc`. |
| `GET /sessions/{id}` | 200 | |
| `POST /sessions` | 201 | Be `endedAt` – vykdoma sesija; su `endedAt` – rankinis įvedimas. Antra neužbaigta to paties naudotojo sesija → 409 (dalinis unikalus indeksas, `P2002`). |
| `PATCH /sessions/{id}` | 200 | Nurodžius `endedAt` – sesija užbaigiama. |
| `DELETE /sessions/{id}` | 204 | |

**Verslo taisyklės (`src/services/sessions.ts`):**

1. `durationMinutes = round((endedAt - startedAt) / 60000)`, skaičiuojama serveryje, klientu nepasitikima.
2. `appliedRate` fiksuojamas **užbaigiant**: `task.hourlyRate ?? project.hourlyRate ?? null`. Vėliau pakeitus įkainį, jau užfiksuotos sesijos nesikeičia – tai ir yra „skaidri apskaita“.
3. `endedAt <= startedAt` → 422 (jau yra `CreateWorkSessionInput.refine`, bet `PATCH` atveju tikrinama prieš DB, nes lyginama su esama `startedAt`).
4. Sesija gali būti kuriama tik projektui, kurio būsena `IN_PROGRESS` → kitu atveju 422.

### B4. Hierarchiniai metodai

- `GET /projects/{id}/tasks` – projekto nėra → 404 (ne tuščias sąrašas);
- `GET /tasks/{id}/sessions` – analogiškai;
- `GET /projects/{id}/proposals`.

---

## 3. Etapas C – likę 1.4 skyriuje numatyti metodai

### C1. Pasiūlymai (`routes/proposals.ts`)

- `POST /projects/{id}/proposals` → 201. Projektas ne `PUBLISHED` → 422. Pakartotinis to paties specialisto pasiūlymas → 409 (`@@unique([projectId, specialistId])`).
- `PATCH /proposals/{id}` → 200. `ACCEPTED` vykdomas **transakcijoje**: pasiūlymas → `ACCEPTED`, kiti to projekto `PENDING` → `REJECTED`, projektas → `IN_PROGRESS` ir `specialistId`. Antras priėmimas → 409 iš dalinio indekso `proposals_one_accepted_per_project`.
- `DELETE /proposals/{id}` → 204.

### C2. Peržiūros nuorodos (`routes/shares.ts`, `routes/public.ts`)

- `POST /projects/{id}/shares` → 201, `ShareLinkCreated` su `token` ir `url`. Žetonas – `randomBytes(32).toString('base64url')`, DB rašoma tik `sha256` maiša. **Žetonas grąžinamas vienintelį kartą.**
- `GET /projects/{id}/shares` → 200 (be žetonų).
- `DELETE /shares/{id}` → 204 (nustato `revokedAt`, įrašo netrina – audito pėdsakas).
- `GET /public/projects/{token}` → 200 / 404. Vienodas 404 nerastai, pasibaigusiai ir atšauktai nuorodai (kad nebūtų galima atskirti). Atnaujina `lastViewedAt`. `X-Robots-Tag` jau nustatoma `app.ts`.

### C3. Ataskaita (`routes/projects.ts` + `src/services/report.ts`)

`GET /projects/{id}/report`:

- `Accept: application/json` (numatyta) → `ProjectReport`, `200`;
- `Accept: text/csv` → CSV su `Content-Type: text/csv; charset=utf-8` ir `Content-Disposition: attachment; filename="ataskaita-<id>.csv"`;
- kitas `Accept` → `406 NOT_ACCEPTABLE`.

Skaičiavimas: sumuojamos tik **užbaigtos** sesijos (`endedAt != null`); eilutės suma = `totalMinutes / 60 * appliedRate`, apvalinama iki cento; sesijos be įkainio patenka į valandas, bet ne į sumą. Vykdoma sesija į ataskaitą neįtraukiama – tai paminima ataskaitos lauke.

---

## 4. Etapas D – duomenys demonstracijai

Reikalavimas: „Gynimo metu DB turi būti užpildyta prasmingais duomenimis.“ Dabartinio seed neužtenka. Išplėsti iki:

- 8 naudotojai (1 administratorius, 3 užsakovai, 4 specialistai), realistiški vardai ir `bio`;
- 7 projektai, apimantys **visas** būsenas (`DRAFT`, `PUBLISHED`, `IN_PROGRESS` ×2, `COMPLETED`, `CANCELLED`) ir abi kilmes;
- ~20 užduočių su skirtingomis būsenomis, dalis su savo įkainiu (kad matytųsi paveldėjimo perrašymas);
- ~30 darbo sesijų per kelias savaites + **viena vykdoma** sesija (kad būtų ką parodyti);
- pasiūlymai visose keturiose būsenose;
- trys peržiūros nuorodos: galiojanti, pasibaigusi, atšaukta – visos trys reikalingos 404 demonstracijai.

Seed turi būti **idempotentiškas** (išvalymas pradžioje `prisma.$transaction` viduje arba `upsert`), kad prieš gynimą būtų galima paleisti iš naujo. Sukurtus id ir galiojantį žetoną rašyti į `docs/postman/demo-data.json`, kad Postman aplinka galėtų juos pasiimti.

---

## 5. Etapas E – demonstracija (Postman + Newman)

`docs/postman/valandine.postman_collection.json` + `valandine.local.postman_environment.json`.

Kolekcijos struktūra – vienas nuoseklus scenarijus, kintamieji perduodami tarp užklausų (`pm.collectionVariables.set`):

```
01 Sveikatos patikra              GET  /health                     -> 200
02 Sukurti projektą               POST /projects                   -> 201 + Location
03 Projektų sąrašas               GET  /projects?scope=marketplace -> 200, items masyvas
04 Projekto duomenys              GET  /projects/{{projectId}}     -> 200
05 Redaguoti projektą             PATCH /projects/{{projectId}}    -> 200
06 Sukurti užduotį                POST /tasks                      -> 201
07 Projekto užduotys              GET  /projects/{{id}}/tasks      -> 200, hierarchija
08 Užduoties duomenys             GET  /tasks/{{taskId}}           -> 200
09 Keisti užduoties būseną        PATCH /tasks/{{taskId}}          -> 200
10 Pradėti sesiją                 POST /sessions                   -> 201, endedAt = null
11 Užbaigti sesiją                PATCH /sessions/{{sessionId}}    -> 200, durationMinutes > 0
12 Užduoties sesijos              GET  /tasks/{{taskId}}/sessions  -> 200
13 Sesijos duomenys               GET  /sessions/{{sessionId}}     -> 200
14 Sesijų sąrašas                 GET  /sessions?taskId=...        -> 200
15 Ataskaita (JSON)               GET  /projects/{{id}}/report     -> 200, application/json
16 Ataskaita (CSV)                GET  /projects/{{id}}/report     -> 200, text/csv
17 Peržiūros nuoroda              POST /projects/{{id}}/shares     -> 201
18 Vieša peržiūra                 GET  /public/projects/{{token}}  -> 200 + X-Robots-Tag
19 Atšaukti nuorodą               DELETE /shares/{{shareId}}       -> 204
20 Vieša peržiūra po atšaukimo    GET  /public/projects/{{token}}  -> 404
21 KLAIDA: nerastas projektas     GET  /projects/<nesamas uuid>    -> 404
22 KLAIDA: blogas payload         POST /projects {"title":"ab"}    -> 422
23 KLAIDA: netaisyklingas JSON    POST /projects (sugadintas)      -> 400
24 KLAIDA: blogas id formatas     GET  /projects/ne-uuid           -> 400
25 KLAIDA: dviguba sesija         POST /sessions (antra atvira)    -> 409
26 Šalinti sesiją                 DELETE /sessions/{{sessionId}}   -> 204
27 Šalinti užduotį                DELETE /tasks/{{taskId}}         -> 204
28 Šalinti projektą               DELETE /projects/{{projectId}}   -> 204
29 Patikra po šalinimo            GET  /projects/{{projectId}}     -> 404
```

Kiekviena užklausa turi `pm.test` bent: statuso kodą, `Content-Type`, esminį lauką. Pasiūlymų srautas (`POST /projects/{id}/proposals`, `PATCH`, `DELETE`, `GET`) – atskirame aplanke, kad pagrindinis scenarijus liktų trumpas.

```
npm run demo   -> newman run docs/postman/valandine.postman_collection.json -e ...
```

`newman` – `devDependency` šakninėje `package.json`. Paleidimas turi trukti iki ~15 s. Tą pačią komandą pridėti į CI po migracijų ir seed (tuomet kolekcija tampa ir integraciniu testu).

---

## 6. Etapas F – dokumentacija

1. **README 1.4 skyrių** papildyti pilna metodų lentele: metodas, paskirtis, sėkmės kodas, galimos klaidos.
2. Naują skyrių **„5. Sąsajos demonstracija“**: kaip paleisti kolekciją, ką rodo kiekviena grupė.
3. Naują skyrių **„6. Klaidų apdorojimas“**: 400 / 404 / 409 / 422 politika ir `ApiError` formatas.
4. `docs/openapi.json` – eksportuota specifikacija saugykloje (`npm run openapi:export`), kad ją būtų galima peržiūrėti be paleistos sistemos.
5. Atitikties lentelė (žr. 8 skyrių) – patogu gynime.

---

## 7. Darbų eiliškumas

| # | Darbas | Rezultatas |
|---|---|---|
| 1 | A1–A5 pamatai | `serialize`, `validate`, klaidų žemėlapis, `actor`, `http` pagalbinės |
| 2 | B1 projektai | 5 metodai + `scope` + puslapiavimas |
| 3 | B2 užduotys + `GET /projects/{id}/tasks` | 6 metodai |
| 4 | B3 sesijos + `GET /tasks/{id}/sessions` | 6 metodai, trukmės ir įkainio logika |
| 5 | C1 pasiūlymai | 4 metodai, priėmimo transakcija |
| 6 | C2 nuorodos + vieša peržiūra | 4 metodai |
| 7 | C3 ataskaita JSON + CSV | 1 metodas, 2 formatai |
| 8 | OpenAPI suderinimas | `security` išimta, `X-Actor-Id` aprašyta, kodai atitinka realizaciją |
| 9 | D seed | prasmingi duomenys |
| 10 | E Postman + `npm run demo` | demonstracija |
| 11 | F dokumentacija | README, `docs/openapi.json` |
| 12 | Vitest testai kritinėms taisyklėms | trukmė, įkainio paveldėjimas, pasiūlymo priėmimas, kodų politika |

Kiekvienas punktas – atskiras commit'as, kad CI istorija būtų skaitoma.

---

## 8. Reikalavimų atitikties lentelė (1 lab.)

| Reikalavimas | Kur tenkinamas |
|---|---|
| Visi numatyti API metodai realizuoti | Etapai B, C – 27 metodai, iš jų 15 pagrindinių CRUD |
| OpenAPI specifikacija kiekvienam metodui | `src/openapi.ts`, Swagger UI `/api/docs`, `docs/openapi.json` |
| Patogi paleidimo aplinka | `npm install` → `npm run db:up` → `db:migrate` → `db:seed` → `npm run dev` |
| Duomenų bazės sprendimas + prasmingi duomenys | PostgreSQL + Prisma, išplėstas `prisma/seed.ts` |
| Teisingas turinio tipas | `application/json`, `text/csv` ataskaitoje |
| 404 nerastam resursui | Postman 21, 20, 29 |
| 400 / 422 blogam payload | Postman 22 (422 – schema), 23 (400 – JSON), 24 (400 – id formatas) |
| 201 sukūrus | Postman 02, 06, 10, 17 + `Location` antraštė |
| 200 / 204 ištrynus | Postman 19, 26–28 (204, be turinio) |
| ~15 s demonstracija | `npm run demo` (Newman) |
| Kodas Git saugykloje, dokumentacija README | GitHub + `README.md`, `docs/planas.md` |

---

## 9. Ką palikti 2 laboratoriniam

Darbai, kurių **dabar nedarome**, bet dėl kurių 1 lab. kodas paruoštas:

- `POST /auth/register`, `/login`, `/refresh`, `/logout` + `GET /auth/me`;
- `middleware/auth.ts`: `requireAuth`, `requireRole('ADMIN')`; `src/lib/actor.ts` viduje `X-Actor-Id` keičiamas į `req.user.id` – **maršrutai nekeičiami**;
- rolė JWT naudingojoje apkrovoje (`sub`, `role`, `email`) – to aiškiai reikalauja užduotis;
- atnaujinimo žetonų rotacija ir šeimos panaikinimas (`RefreshToken` modelis jau yra);
- savininkiškumo patikros: projektą redaguoja tik jo užsakovas, sesiją – tik ją sukūręs specialistas;
- administratoriaus metodai: `GET /users`, `PATCH /users/{id}` (blokavimas), `DELETE /users/{id}`;
- OpenAPI grąžinamas `security: bearerAuth`, kuris dabar laikinai išimamas.

## 10. Ką palikti 3 laboratoriniam

- Naudotojo sąsajos wireframe'ai (`docs/wireframes/`) prieš rašant kodą;
- Next.js puslapiai: viešas titulinis, projektų aikštelė, projekto puslapis, darbo aplinka su laikmačiu, ataskaita, vieša peržiūra `/p/{token}`, administratoriaus sritis;
- reikalavimų sąrašas iš užduoties: `768px` lūžio taškas, hamburger meniu, modalinis langas, SVG ikonos, Google Fonts šriftas, perėjimai/animacijos, skirtingi Header/Content/Footer stiliai, įvairūs įvedimo elementų tipai;
- diegimas Azure: `Dockerfile` API daliai, Static Web Apps internetinei aplikacijai, PostgreSQL Flexible Server, GitHub Actions diegimo žingsniai, `npm run db:deploy` migracijoms.

**Dėl to verta pasirūpinti jau dabar:** API neturi priklausyti nuo vietinės failų sistemos, visi adresai ir paslaptys – tik per aplinkos kintamuosius (`env.ts` jau taip veikia), o CORS kilmė imama iš `WEB_ORIGIN`.
