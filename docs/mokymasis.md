# Hourly — mokymosi medžiaga ir gynimo klausimai

Šis dokumentas skirtas **suprasti** projektą, o ne jį aprašyti. Ataskaita yra
[README.md](../README.md), trumpas kodo žemėlapis — [cheatsheet.md](cheatsheet.md).
Čia rasite:

- **I dalis** — mokomoji medžiaga: kiekviena technologija ir sąvoka paaiškinta
  nuo nulio ir iš karto parodyta, kur ji yra mūsų kode;
- **II dalis** — klausimai ir atsakymai, sugrupuoti pagal gynimo temas, įskaitant
  „provokuojančius“ klausimus, kuriais dėstytojai mėgina suklaidinti;
- **III dalis** — ką parodyti gynimo metu ir savikontrolės sąrašas.

Patarimas: skaitykite atsidarę kodą šalia. Kiekviena nuoroda veda į tikrą failą.

---

# I dalis. Mokomoji medžiaga

## 1. Projektas per dvi minutes

Taip galima pradėti gynimą:

> „Hourly“ — laisvai samdomų specialistų darbų aikštelė su laiko apskaita.
> Užsakovas paskelbia **projektą**, specialistai teikia **pasiūlymus**, užsakovas
> priima vieną. Projektas suskaidomas į **užduotis**, o specialistas prie
> kiekvienos užduoties registruoja **darbo sesijas** (laikmatis). Sistema
> suskaičiuoja valandas ir sumą pagal įkainį, o užsakovas mato ataskaitą.
> Užsakovas be paskyros darbo eigą mato per **peržiūros nuorodą**.
>
> Hierarchija: **Projektas → Užduotis → Darbo sesija** (du vienas-su-daug
> ryšiai). API — Node.js + Express 5 + TypeScript, duomenų bazė — PostgreSQL
> per Prisma ORM, validavimas — Zod, autentifikacija — JWT prieigos žetonas +
> rotuojamas atnaujinimo žetonas `httpOnly` slapuke. Rolės: svečias, užsakovas,
> specialistas, administratorius.

Skaičiai, kuriuos verta žinoti:

| Kas | Kiek |
|---|---|
| Dokumentuotų operacijų (OpenAPI) | 41 = 38 (28 dalykiniai + 6 autentifikacijos + 4 naudotojų) + 3 tarnybiniai (`GET /api`, `/health`, `/health/ready`) |
| Pagrindinių CRUD metodų | 15 (3 objektai × 5: sąrašas, peržiūra, kūrimas, redagavimas, šalinimas) |
| Postman kolekcija | 140 užklausų, 300 patikrų, ~18 s |
| Vienetinių / integracinių testų | 288 |
| Demonstraciniai duomenys | 9 naudotojai, 7 projektai, 21 užduotis, 26 sesijos, 7 pasiūlymai, 6 peržiūros nuorodos |
| Prieigos žetono galiojimas | 15 min. |
| Atnaujinimo žetono galiojimas | 30 d. |

---

## 2. Technologijų žemėlapis

| Technologija | Kas tai yra | Ką daro „Hourly“ | Kur |
|---|---|---|---|
| **Node.js 22** | JavaScript vykdymo aplinka serveryje (V8 variklis + įvykių ciklas) | Vykdo API | [.nvmrc](../.nvmrc) |
| **TypeScript** | JavaScript su statiniais tipais; kompiliuojamas į JS | Visas kodas; klaidos pagaunamos prieš paleidimą | `tsconfig.json` |
| **npm workspaces** | Keli paketai vienoje saugykloje (monorepo) | `apps/api`, `apps/web`, `packages/shared` | [package.json](../package.json) |
| **Express 5** | Minimalus HTTP karkasas: maršrutai + tarpinės funkcijos (middleware) | Visi API maršrutai; 5 versija pati perduoda `async` klaidas į klaidų apdorojimą | [app.ts](../apps/api/src/app.ts) |
| **PostgreSQL 17** | Reliacinė DBVS | Visi duomenys; daliniai unikalūs indeksai | [docker-compose.yml](../docker-compose.yml) |
| **Docker Compose** | Konteinerių paleidimas pagal aprašą | Lokali PostgreSQL (5433 prievadas) | [docker-compose.yml](../docker-compose.yml) |
| **Prisma 7** | ORM: schema viename faile → tipizuotas klientas + migracijos | Visos DB užklausos; per `@prisma/adapter-pg` tvarkyklę | [schema.prisma](../apps/api/prisma/schema.prisma), [lib/prisma.ts](../apps/api/src/lib/prisma.ts) |
| **Zod 4** | Schemų validavimo biblioteka: aprašai duomenų formą, gauni patikrą ir TS tipą | Tikrina kiekvieną įvestį; iš tų pačių schemų generuojama OpenAPI | [packages/shared/src/schemas.ts](../packages/shared/src/schemas.ts), [lib/validate.ts](../apps/api/src/lib/validate.ts) |
| **zod-openapi + Swagger UI** | OpenAPI 3.1 dokumento generavimas ir naršyklinė peržiūra | `/api/docs`, [docs/openapi.json](openapi.json) | [openapi.ts](../apps/api/src/openapi.ts) |
| **jsonwebtoken** | JWT pasirašymas ir tikrinimas | Prieigos žetonas `HS256` | [lib/tokens.ts](../apps/api/src/lib/tokens.ts) |
| **bcryptjs** | Lėta slaptažodžių maišos funkcija su druska | Slaptažodžiai, kaina 12 | [lib/passwords.ts](../apps/api/src/lib/passwords.ts) |
| **node:crypto** | Node kriptografijos modulis | `randomBytes(32)` žetonams, `sha256` jų maišoms | [lib/secure-token.ts](../apps/api/src/lib/secure-token.ts) |
| **cookie-parser** | Išskaido `Cookie` antraštę į `req.cookies` | Skaito `hourly_refresh` slapuką | [app.ts](../apps/api/src/app.ts) |
| **cors** | Nustato CORS antraštes | Leidžia tik `WEB_ORIGIN` su slapukais | [app.ts](../apps/api/src/app.ts) |
| **helmet** | Rinkinys saugumo antraščių | `X-Frame-Options`, `X-Content-Type-Options: nosniff`, CSP, HSTS, pašalina `X-Powered-By` | [app.ts:25](../apps/api/src/app.ts:25) |
| **express-rate-limit** | Užklausų skaičiavimas per laiko langą | 429 prisijungimui, registracijai, atnaujinimui | [lib/rate-limit.ts](../apps/api/src/lib/rate-limit.ts) |
| **dotenv** | Įkelia `.env` failą į `process.env` | Paslaptys ir konfigūracija | [env.ts](../apps/api/src/env.ts) |
| **tsx** | Paleidžia TS be kompiliavimo, stebi pakeitimus | `npm run dev:api` | [apps/api/package.json](../apps/api/package.json) |
| **Vitest + supertest** | Testų karkasas; supertest siunčia HTTP užklausas į Express programą be tinklo | 288 testai | `*.test.ts` |
| **ESLint** | Statinė kodo analizė | `npm run lint` | `eslint.config.mjs` |
| **Postman + Newman** | Postman — užklausų rinkiniai; Newman — jų paleidimas komandine eilute | `npm run demo` | [docs/postman/](postman/) |
| **GitHub Actions** | CI: po kiekvieno `push` automatiškai vykdomi žingsniai | lint, testai, OpenAPI patikra, Postman aprėptis, demonstracija su tikra DB | [ci.yml](../.github/workflows/ci.yml) |
| **Next.js (React)** | Kliento karkasas su serverio maršrutais | 3 lab. sąsaja; dabar — tarpinis maršrutas `/api/[...path]` | [route.ts](../apps/web/src/app/api/%5B...path%5D/route.ts) |
| **Azure** | Debesų platforma | Static Web Apps (web), App Service (API), PostgreSQL Flexible Server | README 2 skyrius |

> **Pastaba sau:** `pino` ir `pino-http` yra `apps/api/package.json`
> priklausomybėse, bet kode nenaudojami. Jei paklaus — atvirai pasakyti, kad
> įdiegta ateičiai (struktūriniam žurnalui), bet dar neprijungta.

---

## 3. HTTP pagrindai (trumpai, bet būtina)

HTTP užklausą sudaro:

```
POST /api/projects/P/tasks HTTP/1.1          ← metodas + URI
Authorization: Bearer eyJhbGciOi...           ← antraštės
Content-Type: application/json
                                              ← tuščia eilutė
{ "title": "Prisijungimo forma" }             ← kūnas
```

Atsakymą — statuso kodas, antraštės ir kūnas:

```
HTTP/1.1 201 Created
Location: /api/projects/P/tasks/T
Cache-Control: private, no-cache
ETag: W/"1a2-..."

{ "id": "T", "title": "Prisijungimo forma", "_links": { ... } }
```

**Metodų savybės** (klausia beveik visada):

| Metodas | Paskirtis | Saugus (nekeičia būsenos) | Idempotentiškas (kartojant rezultatas tas pats) | Pas mus |
|---|---|---|---|---|
| `GET` | Skaityti | ✓ | ✓ | Visi skaitymai |
| `POST` | Kurti / veiksmas | ✗ | ✗ | Kūrimas; `/auth/*` veiksmai |
| `PUT` | Pakeisti visą resursą | ✗ | ✓ | **Nenaudojamas** → 405 |
| `PATCH` | Pakeisti dalį | ✗ | ne būtinai | Redagavimas ir būsenų perėjimai |
| `DELETE` | Šalinti | ✗ | ✓ | Šalinimas |

**Antraštės, kurias naudojame:** `Authorization` (žetonas), `Content-Type`,
`Accept` (ataskaita JSON ar CSV), `Location` (po 201), `Allow` (po 405),
`WWW-Authenticate` (po 401), `Retry-After` (po 429), `Cache-Control`, `ETag` /
`If-None-Match` (podėlis, 304), `Set-Cookie` / `Cookie` (atnaujinimo žetonas),
`X-Robots-Tag` (viešai peržiūrai).

---

## 4. Užklausos kelionė per programą

### 4.1. Tarpinių funkcijų grandinė

Express programa — tai **eilė funkcijų**. Kiekviena gauna `(req, res, next)` ir
arba atsako, arba perduoda toliau (`next()`), arba meta klaidą. **Tvarka
svarbi** — ji aprašyta [app.ts](../apps/api/src/app.ts):

```
užklausa
  │
  ├─ helmet()            saugumo antraštės
  ├─ cors()              kas gali kviesti iš naršyklės
  ├─ express.json()      tekstas → req.body (≤ 1 MB, kitaip 413)
  ├─ cookieParser()      Cookie → req.cookies
  ├─ cacheControl        Cache-Control kiekvienam atsakymui
  ├─ X-Robots-Tag        tik /api/public
  ├─ authenticate        žetonas → req.auth (arba null)
  ├─ 9 maršrutizatoriai  root, health, auth, projects, proposals, tasks, sessions, shares, users
  ├─ openapi.json, /docs
  ├─ methodNotAllowed    žinomas adresas, blogas metodas → 405
  ├─ notFound            nežinomas adresas → 404
  └─ errorHandler        BET KURI mesta klaida → vienodas JSON su kodu
```

Kodėl tokia tvarka:

- `authenticate` **prieš** maršrutus — kad kiekvienas maršrutas jau žinotų, kas
  kviečia.
- `methodNotAllowed` **po** maršrutų — pasiekiamas tik tada, kai nė vienas
  maršrutas neatsakė.
- `errorHandler` **paskutinis** — Express klaidų apdorojimo funkciją atpažįsta iš
  4 parametrų `(err, req, res, next)`, ir ji turi būti po visų kitų.

### 4.2. Vieno maršruto anatomija

Kiekvienas maršrutas daro tą patį, ta pačia tvarka. Pavyzdys — sesijos kūrimas
([routes/sessions.ts](../apps/api/src/routes/sessions.ts)):

```ts
const params = parseParams(TaskParams, req);          // 1. adresas       → 400
const actor  = requireActor(req);                     // 2. kas kviečia   → 401
const input  = parseBody(CreateWorkSessionInput, req);// 3. kūnas         → 422
const task   = await findTaskOr404(params);           // 4. ar yra        → 404
assertCanViewProject(task.project, viewer(req));      // 5. ar mato       → 404
assertProjectAcceptsWork(task.project);               // 6. ar būsena tinka → 422
assertIsAssignedSpecialist(task.project, actor);      // 7. ar gali       → 403
const row = await prisma.workSession.create({...});   // 8. rašymas (unikalumas → 409)
created(res, location, toSession(row));               // 9. 201 + Location
```

Įsiminkite šabloną: **validuoti → rasti → patikrinti teises ir taisykles →
rašyti → serializuoti → atsakyti.**

Maršrute nėra `try/catch` ir nėra `res.status(400)`. Klaidos **metamos**
(`throw new HttpError(...)`), o Express 5 pats perduoda jas į `errorHandler`.

### 4.3. Keturi sluoksniai

| Sluoksnis | Katalogas | Ką daro | Ko NEdaro |
|---|---|---|---|
| HTTP | `routes/` | Paima iš `req`, kviečia taisykles, kreipiasi į DB, grąžina atsakymą | Nesprendžia, kas leidžiama |
| Taisyklės | `services/` | Grynos funkcijos: praleidžia arba meta `HttpError` | Neliečia `req`, `res`, DB |
| Įrankiai | `lib/` | Validavimas, apimtis, puslapiavimas, nuorodos, žetonai | — |
| Skersiniai | `middleware/` | Autentifikacija, klaidos, podėlis | — |

Kodėl `services/` be DB ir HTTP? Nes tada jas galima testuoti akimirksniu —
užtenka paduoti objektą ir patikrinti, ar meta klaidą.

---

## 5. Duomenų bazė

### 5.1. Modelis

```
User ─┬─< Project (clientId, specialistId)     users nėra hierarchijoje
      ├─< Proposal
      ├─< WorkSession (specialistId)
      └─< RefreshToken

Project ──< Task ──< WorkSession                ← HIERARCHIJA (1:N, 1:N)
   ├──< Proposal
   └──< ShareLink
```

- **Pirminiai raktai — UUID** (`@default(uuid())`). Neatspėjami (skirtingai nei
  1, 2, 3), todėl sunkiau „vaikščioti“ po svetimus įrašus.
- **Išoriniai raktai su kaskadomis:** ištrynus projektą, ištrinamos jo
  užduotys, jų sesijos, pasiūlymai ir nuorodos (`onDelete: Cascade`). Ištrynus
  naudotoją, projekto `clientId` tampa `null` (`SetNull`).
- **Pinigai — `Decimal(10,2)`**, ne `float`: `0.1 + 0.2 ≠ 0.3` slankiojo kablelio
  aritmetikoje. Ataskaitoje sumos skaičiuojamos centais (sveikaisiais skaičiais)
  ir dalinamos tik pabaigoje ([services/report.ts](../apps/api/src/services/report.ts)).
- **Indeksai** pagreitina dažnas paieškas: `projects(status, origin)`,
  `tasks(projectId, position)`, `work_sessions(specialistId, startedAt)`…

### 5.2. Daliniai unikalūs indeksai — svarbiausias argumentas už PostgreSQL

[migration.sql:206](../apps/api/prisma/migrations/20260918000000_init/migration.sql:206):

```sql
-- Tik vienas priimtas pasiūlymas projektui
CREATE UNIQUE INDEX "proposals_one_accepted_per_project"
    ON "proposals" ("projectId") WHERE "status" = 'ACCEPTED';

-- Tik viena neužbaigta sesija specialistui
CREATE UNIQUE INDEX "work_sessions_one_open_per_specialist"
    ON "work_sessions" ("specialistId") WHERE "endedAt" IS NULL;
```

Unikalumas galioja **tik eilutėms, atitinkančioms `WHERE`**. Paprastas unikalus
indeksas neleistų turėti dviejų užbaigtų sesijų — o tai būtina.

Kodėl nepakanka tikrinimo programoje? **Lenktynių sąlyga (race condition):** dvi
užklausos tuo pačiu metu abi perskaito „vykdomos sesijos nėra“ ir abi įrašo.
Programos patikra skirta aiškiam pranešimui, o **garantiją duoda DB** — antroji
užklausa gauna Prisma klaidą `P2002`, kuri virsta **409**.

Prisma schemoje tokių indeksų aprašyti negalima, todėl jie parašyti SQL
migracijoje ranka.

### 5.3. Transakcijos

Transakcija — keli veiksmai, kurie įvyksta **visi arba nė vienas** (ACID).
Naudojame:

| Kur | Kas vyksta kartu |
|---|---|
| Pasiūlymo priėmimas ([proposals.ts:195](../apps/api/src/routes/proposals.ts:195)) | Pasiūlymas → `ACCEPTED`, kiti → `REJECTED`, projektas → `IN_PROGRESS` + specialistas |
| Žetono rotacija ([auth.ts:180](../apps/api/src/routes/auth.ts:180)) | Senas atnaujinimo žetonas panaikinamas, naujas įrašomas |
| Blokavimas ([users.ts:82](../apps/api/src/routes/users.ts:82)) | Visi žetonai panaikinami, `isBlocked = true` |
| Kiekvienas sąrašas | `findMany` + `count` — kad `total` atitiktų elementus |

### 5.4. ORM ir migracijos

**ORM** (Object-Relational Mapping) — rašai `prisma.task.findFirst({ where: { id, projectId } })`,
o Prisma sugeneruoja **parametrizuotą** SQL. Reikšmės niekada neįklijuojamos į
SQL tekstą, todėl SQL injekcija neįmanoma.

**Migracija** — SQL failas, keičiantis DB schemą. `schema.prisma` pakeitimas →
`prisma migrate dev` sugeneruoja naują migraciją. Senos migracijos niekada
netaisomos, nes jos jau pritaikytos kitose DB.

**Seed** — [prisma/seed.ts](../apps/api/prisma/seed.ts) užpildo DB realistiškais
lietuviškais duomenimis su fiksuotais ID, todėl paleidus iš naujo niekas
nepasikeičia.

---

## 6. REST

### 6.1. Kas yra REST

REST (Representational State Transfer) — **architektūrinis stilius**, ne
protokolas ir ne standartas. Roy Fieldingo disertacija (2000 m.) apibrėžia 6
apribojimus:

| Apribojimas | Esmė | Pas mus | Ką suteikia |
|---|---|---|---|
| **Klientas–serveris** | Sąsaja atskirta nuo duomenų saugojimo | `apps/api` ir `apps/web` — atskiri paketai | Nepriklausomas vystymas; tą patį API naudoja naršyklė ir Postman |
| **Stateless** | Kiekviena užklausa turi viską, ko reikia; serveris neprisimena kliento tarp užklausų | JWT `Authorization` antraštėje; nėra sesijų atmintyje | Bet kuris serverio egzempliorius aptarnauja bet kurią užklausą → horizontalus mastelis |
| **Cacheable** | Atsakymai pažymi, ar juos galima saugoti | `Cache-Control`, `ETag` → 304 | Mažiau duomenų per tinklą |
| **Uniform interface** | Vienodas būdas kalbėti su visais resursais | URI daiktavardžiai, HTTP metodai, statuso kodai, JSON, `_links` | Klientui nereikia žinoti serverio vidaus |
| **Layered system** | Klientas nežino, kiek sluoksnių tarp jo ir serverio | Next.js tarpinis maršrutas, Azure balansavimas; santykiniai `_links` | Galima pridėti tarpinius sluoksnius nekeičiant kliento |
| **Code on demand** (neprivalomas) | Serveris siunčia vykdomą kodą | Nenaudojamas | — |

**Uniform interface** turi 4 dalis: (1) resursai identifikuojami URI,
(2) manipuliuojama per reprezentacijas (JSON/CSV), (3) pranešimai aprašo save
(kodai, antraštės), (4) **HATEOAS** — hypermedia kaip programos būsenos variklis
(`_links`).

**Richardson brandos modelis:** 0 — vienas adresas, viskas POST (SOAP);
1 — resursai; 2 — HTTP metodai ir kodai; **3 — hypermedia**. Mūsų API yra 3 lygio.

### 6.2. URI taisyklės

| Gerai (pas mus) | Blogai |
|---|---|
| `POST /projects` | `POST /createProject`, `POST /projects/create` |
| `GET /projects/P/tasks/T/sessions/S` | `GET /getSession?id=S&task=T` |
| `PATCH /projects/P` su `{"status":"PUBLISHED"}` | `POST /projects/P/publish` |
| `GET /projects?scope=owned` | `GET /my-projects` |

Daiktavardžiai daugiskaita, veiksmas — HTTP metodu, būsenos perėjimas — `PATCH`
laukui `status`.

### 6.3. Apimties valdymas per URL (scoping)

[lib/scope.ts](../apps/api/src/lib/scope.ts) — kiekvienas ID ieškomas **savo tėvo
viduje**:

```ts
prisma.task.findFirst({ where: { id: taskId, projectId } })
prisma.workSession.findFirst({ where: { id: sessionId, taskId, task: { projectId } } })
```

Jei užduotis `T` priklauso projektui `B`, o prašoma `/projects/A/tasks/T` →
**404** „Task T does not exist in project A“. Ne 403 (niekas nedraudžiama —
tiesiog šiuo adresu nieko nėra), ne 422 (adresas taisyklingas).

Jei nerasta — dar kartą patikrinama, ar egzistuoja tėvas, kad pranešimas
įvardytų **pirmą** netinkantį lygį.

**Hierarchinis metodas per 3 objektus** (kriterijaus reikalavimas):
`GET /projects/{projectId}/tasks/{taskId}/sessions`.

### 6.4. Puslapiavimas, filtravimas

Visi sąrašai: `?page=2&perPage=20` (perPage 1–100, numatytasis 20):

```json
{ "items": [...], "page": 2, "perPage": 20, "total": 47, "totalPages": 3,
  "_links": { "self", "first", "prev", "next", "last" } }
```

Prisma: `skip = (page-1) * perPage`, `take = perPage`
([lib/pagination.ts](../apps/api/src/lib/pagination.ts)). Puslapis už pabaigos →
200 su tuščiu `items` (kolekcija egzistuoja).

Filtrai: `status`, `q` (paieška be didžiųjų/mažųjų raidžių skirtumo), `from`/`to`
(`from <= startedAt < to` — pusiau atviras intervalas, kad gretimos savaitės
nesidubliuotų), `running`, `active`, `role`, `isBlocked`.

### 6.5. Hypermedia (`_links`)

HAL stiliaus nuorodos kiekviename atsakyme — dviejų rūšių:

- **ryšiai** (`self`, `project`, `tasks`, `report`…) — kur rasti susijusius
  resursus;
- **veiksmai** (`publish`, `stop`, `accept`…) su HTTP metodu — ką **šis**
  naudotojas gali daryti **dabar**.

Gudrybė: veiksmas rodomas tik jei maršrutas jį priimtų. Tai sprendžiama
paleidžiant **tas pačias** `assert*` funkcijas funkcijoje `allows`
([lib/links.ts:66](../apps/api/src/lib/links.ts:66)) — jei nė viena nemeta
`HttpError`, veiksmas leidžiamas. Taisyklės neparašytos du kartus, todėl negali
išsiskirti.

Įėjimo taškas `GET /api` — klientui užtenka žinoti vieną adresą.

### 6.6. Resursas iš kelių esybių

`GET /projects/{id}/report` — projektas + užduotys + sesijos + suvestinė
(minutės, suma). Tas pats skaičiavimas ([services/report.ts](../apps/api/src/services/report.ts))
naudojamas ir viešoje peržiūroje `GET /public/projects/{token}`.

**Turinio derybos (content negotiation):** `Accept: application/json` → JSON,
`Accept: text/csv` → CSV failas, `Accept: application/xml` → **406**.

### 6.7. Podėliavimas

[middleware/cache.ts](../apps/api/src/middleware/cache.ts):

- `/auth/*`, `/public/*` → `Cache-Control: no-store` (žetonų niekur nesaugoti);
- visa kita → `private, no-cache` — `private`: tik naršyklė, ne bendras
  tarpinis podėlis (atsakymas priklauso nuo naudotojo); `no-cache`: galima
  saugoti, bet **prieš naudojant patikrinti**.

Express kiekvienam atsakymui prideda `ETag` (turinio „piršto atspaudą“).
Klientas siunčia `If-None-Match: <etag>` → jei nepasikeitė, **304** be kūno.

---

## 7. Statuso kodai — sprendimų medis

```
Ar adresas / parametrai taisyklingi? (UUID, enum, JSON sintaksė)
 └─ ne → 400
Ar yra žetonas, ir ar jis geras?
 ├─ reikia, bet nėra → 401 AUTH_REQUIRED
 ├─ blogas / pasibaigęs / atšauktas → 401 (INVALID_TOKEN / TOKEN_EXPIRED / SESSION_REVOKED)
 └─ paskyra užblokuota → 403 ACCOUNT_BLOCKED
Ar resursas egzistuoja IR naudotojas gali jį matyti?
 └─ ne → 404 (vienodai abiem atvejais!)
Ar naudotojas gali atlikti šį veiksmą (rolė, nuosavybė)?
 └─ ne → 403 FORBIDDEN
Ar kūno turinys atitinka taisykles? (ilgis, būsenos perėjimas, laikas)
 └─ ne → 422
Ar nekonfliktuoja su kitais duomenimis? (antra sesija, el. paštas užimtas)
 └─ taip → 409
Sėkmė → 200 / 201 + Location / 204
```

Svarbiausios poros:

| Pora | Skirtumas |
|---|---|
| **400 vs 422** | 400 — serveris net nesupranta užklausos (blogas JSON, `id` ne UUID). 422 — supranta, bet turinys prieštarauja taisyklėms. `parseParams`/`parseQuery` → 400, `parseBody` → 422 ([lib/validate.ts](../apps/api/src/lib/validate.ts)) |
| **401 vs 403** | 401 — „nežinau, kas tu“ (prisijunk). 403 — „žinau, kas tu, bet negalima“ (prisijungimas iš naujo nepadės) |
| **403 vs 404** | Jei naudotojas resurso **nemato** — 404, kad neatskleistume, jog jis egzistuoja. Jei mato, bet keisti negali — 403 |
| **409 vs 422** | 409 — konfliktas su **kitų** resursų būsena (unikalumas). 422 — pats turinys netinkamas |
| **404 vs 405** | 404 — adreso nėra. 405 — adresas yra, metodas ne (+ `Allow` antraštė) |

**Kodėl niekada 500?** [middleware/error.ts](../apps/api/src/middleware/error.ts)
atpažįsta visų žinomų šaltinių klaidas: Zod → 422, `HttpError` → jos kodas,
sugadintas JSON → 400, per didelis kūnas → 413, Prisma `P2025` → 404, `P2002` →
409, `P2003`/`P2000`/`P2020` → 422, Express 4xx (pvz., neiškoduojamas URL) → 4xx.
Be to, NUL simbolis (`\u0000`), kurio PostgreSQL `text` negali saugoti, atmetamas
dar prieš validavimą. Jei vis dėlto 500 — priežastis klientui **neatskleidžiama**.

---

## 8. Autentifikacija (2 lab.)

### 8.1. Sąvokos

- **Autentifikacija** — *kas tu esi?* (prisijungimas, žetono tikrinimas). Klaida → 401.
- **Autorizacija** — *ką tau leidžiama?* (rolės, nuosavybė). Klaida → 403.

### 8.2. JWT anatomija

JWT = trys base64url dalys, atskirtos taškais: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9      ← header:  {"alg":"HS256","typ":"JWT"}
.eyJyb2xlIjoiU1BFQ0lBTElTVCIsInNpZCI6...    ← payload: teiginiai (claims)
.Xk3v9...                                  ← signature
```

**Mūsų payload** ([lib/tokens.ts:54](../apps/api/src/lib/tokens.ts:54)):

| Teiginys | Reikšmė | Kam |
|---|---|---|
| `sub` | Naudotojo ID (UUID) | Kas tu |
| `role` | `CLIENT` / `SPECIALIST` / `ADMIN` | Ką gali — be DB užklausos |
| `sid` | Prisijungimo ID = atnaujinimo žetonų šeimos ID | Atsijungus žetonas atmetamas iš karto |
| `iat` | Išdavimo laikas (sekundės) | — |
| `exp` | Galiojimo pabaiga (`iat + 900`) | 15 min. |
| `iss` | `hourly-api` | Kas išdavė |
| `aud` | `hourly` | Kam skirtas |

**Base64url — ne šifravimas!** Bet kas gali nukopijuoti žetoną į jwt.io ir
perskaityti turinį. Todėl ten nėra el. pašto ar kitų asmens duomenų.

### 8.3. Pasirašymas ir tikrinimas

**HS256 = HMAC-SHA256.** Parašas skaičiuojamas taip:

```
signature = HMAC_SHA256( JWT_ACCESS_SECRET,  base64url(header) + "." + base64url(payload) )
```

Tikrinant serveris perskaičiuoja parašą tuo pačiu raktu ir palygina. Pakeitus
nors vieną payload simbolį (pvz., `role: "ADMIN"`), parašas nebesutaps, o
naujo parašo be rakto sukurti neįmanoma.

| Klausimas | Atsakymas |
|---|---|
| Kur sukuriamas? | `signAccessToken` — [tokens.ts:54](../apps/api/src/lib/tokens.ts:54), kviečiamas iš `issueTokens` — [routes/auth.ts:38](../apps/api/src/routes/auth.ts:38) |
| Kur tikrinamas? | `authenticate` — [middleware/auth.ts:53](../apps/api/src/middleware/auth.ts:53) → `verifyAccessToken` — [tokens.ts:76](../apps/api/src/lib/tokens.ts:76) |
| Kuo pasirašomas? | `HS256`, simetrinis raktas — [tokens.ts:29](../apps/api/src/lib/tokens.ts:29) |
| Kur raktas? | `JWT_ACCESS_SECRET` aplinkos kintamasis (`apps/api/.env`, neįkeltas į Git); tikrinamas [env.ts](../apps/api/src/env.ts): min. 16 simbolių, gamyboje ≥ 32. Azure — App Service nustatymuose |

`verifyAccessToken` tikrina: parašą, **tik `HS256`** (`algorithms: ['HS256']`),
`iss`, `aud`, `exp`, o po to Zod patikrina turinio formą (`sub` — UUID, `role` —
viena iš trijų, `sid` — UUID).

**HS256 vs RS256:** HS256 — vienas slaptas raktas ir pasirašo, ir tikrina.
Tinka, kai žetoną tikrina tik tas pats serveris. RS256 — privatus raktas
pasirašo, viešasis tikrina; reikalingas, kai žetoną tikrina **kitos** tarnybos,
kurios neturi galėti pasirašyti (pvz., OAuth tiekėjai, mikroservisai).

### 8.4. `authenticate` — kas vyksta kiekvienoje užklausoje

[middleware/auth.ts:53](../apps/api/src/middleware/auth.ts:53):

1. Nėra `Authorization` antraštės → `req.auth = null` (svečias). Viešieji
   metodai veiks, kiti grąžins 401 per `requireActor`.
2. `/auth/register|login|refresh|logout` — antraštė **ignoruojama**. Kitaip
   pasibaigęs prieigos žetonas blokuotų būtent `/auth/refresh`, kuris turi jį
   pakeisti.
3. Antraštė ne `Bearer <žetonas>` formos → 401 `INVALID_TOKEN`.
4. `verifyAccessToken` → 401 `TOKEN_EXPIRED` arba `INVALID_TOKEN`.
5. **Viena DB užklausa:** ar naudotojas egzistuoja, ar neužblokuotas, ar jo
   `sid` šeimoje dar yra galiojantis atnaujinimo žetonas.
   - nėra naudotojo → 401; užblokuotas → **403** `ACCOUNT_BLOCKED`;
     šeima atšaukta → 401 `SESSION_REVOKED`.
6. `req.auth = { userId, role, sessionId }`.

**Blogas žetonas nereiškia svečio.** Jei žetonas pateiktas, bet netinka — 401
net viešame metode. Kitaip klientas tyliai prarastų teises ir nesuprastų kodėl.

Kiekvienas 401 turi `WWW-Authenticate: Bearer realm="hourly"` (+
`error="invalid_token"`, jei žetonas buvo atmestas) — RFC 6750.

### 8.5. Atnaujinimo žetonas ir rotacija

|  | Prieigos žetonas | Atnaujinimo žetonas |
|---|---|---|
| Forma | JWT | 32 atsitiktiniai baitai base64url (43 simboliai), **ne JWT** |
| Kur keliauja | `Authorization: Bearer` | Slapukas `hourly_refresh` |
| Kliento pusėje | JS atmintyje (kintamajame) | Naršyklės slapukuose, JS nepasiekiamas |
| Serveryje | Nesaugomas | DB — tik `sha256` maiša |
| Galiojimas | 15 min. | 30 d. |

**Kodėl atnaujinimo žetonas ne JWT?** Jo turinio niekam nereikia skaityti —
serveris jį randa DB pagal maišą. Būtent dėl to jį galima **atšaukti**
(`revokedAt`).

**Rotacija** ([routes/auth.ts:125](../apps/api/src/routes/auth.ts:125)):
kiekvienas `POST /auth/refresh` panaikina pateiktą žetoną ir išduoda naują iš tos
pačios **šeimos** (`familyId`) — vienoje transakcijoje. Kiekvienas atnaujinimo
žetonas veikia **vieną kartą**.

**Pakartotinio panaudojimo aptikimas:** jei pateikiamas jau panaudotas žetonas,
jį turi dvi šalys (naudotojas ir vagis). Serveris nežino, kuri sąžininga, todėl
panaikina **visą šeimą** → abu išmesti, teisėtas naudotojas prisijungia iš naujo.
Sprendimą priima `classifyRefresh` ([services/auth.ts:36](../apps/api/src/services/auth.ts:36)):
`unknown` / `expired` / `reused` / `ok`.

**Lygiagretūs atnaujinimai:** panaikinimas sąlyginis (`where: { id, revokedAt: null }`);
jei `count !== 1`, kita užklausa jau laimėjo — tai laikoma pakartotiniu
panaudojimu. Du galiojantys įpėdiniai niekada neatsiranda.

| Įvykis | Kas panaikinama |
|---|---|
| `POST /auth/logout` | To prisijungimo šeima + slapukas išvalomas; prieigos žetonas nuo kitos užklausos → 401 `SESSION_REVOKED` |
| `PATCH /auth/me` su nauju slaptažodžiu | Visos **kitos** šeimos (dabartinis prisijungimas lieka) |
| Administratorius blokuoja | Visos naudotojo šeimos + `authenticate` grąžina 403 |
| Pakartotinis panaudojimas | Ta šeima |

**Kliento srautas** (README 5.1 pav.): užklausa → 401 `TOKEN_EXPIRED` →
`POST /auth/refresh` (slapukas eina automatiškai) → naujas `accessToken` →
užklausa kartojama. Naudotojas nieko nepastebi — „nereikia nuolat jungtis iš naujo“.

### 8.6. Slapukas

[lib/refresh-cookie.ts](../apps/api/src/lib/refresh-cookie.ts):

| Vėliavėlė | Reikšmė | Nuo ko saugo |
|---|---|---|
| `HttpOnly` | JS (`document.cookie`) jo neperskaito | XSS negali pavogti |
| `Secure` | Siunčiamas tik per HTTPS (gamyboje; lokaliai `http`, todėl išjungta — `COOKIE_SECURE`) | Pasiklausymas tinkle |
| `SameSite=Lax` | Nesiunčiamas su kitų svetainių inicijuotomis POST užklausomis | CSRF |
| `Path=/api/auth` | Siunčiamas tik į `/api/auth/*` | Ilgalaikė paslaptis keliauja kuo rečiau |
| `Expires` | Po 30 d. | — |

Azure diegime, kai web ir API skirtinguose domenuose, reikia `SameSite=None` +
`Secure` — [env.ts](../apps/api/src/env.ts) neleidžia `None` be `Secure`.

**Antraštė ar slapukas?**

| | `Authorization` antraštė | `httpOnly` slapukas |
|---|---|---|
| + | Nėra CSRF (naršyklė pati jos neprideda); veikia bet kokiam klientui (Postman, mobilus) | JS nepasiekiamas → XSS nepavogs |
| − | JS turi laikyti žetoną → XSS gali pavogti | Naršyklė siunčia automatiškai → CSRF rizika (sprendžiama `SameSite`, `Path`, CORS) |

Todėl derinys: **trumpas** prieigos žetonas antraštėje (pavogtas galioja ≤ 15 min.
ir miršta atsijungus) + **ilgas** atnaujinimo žetonas `httpOnly` slapuke.

### 8.7. Slaptažodžiai

- `bcrypt`, kaina 12 (~250 ms vienai maišai) — [lib/passwords.ts](../apps/api/src/lib/passwords.ts).
  Lėtumas sąmoningas: užpuolikas su nutekėjusia DB negali tikrinti milijonų
  spėjimų per sekundę. bcrypt pats prideda **druską**, todėl vienodi
  slaptažodžiai turi skirtingas maišas (rainbow lentelės neveikia).
- **Kodėl žetonams `sha256` be druskos, o slaptažodžiams `bcrypt`?** Žetonas turi
  256 bitus atsitiktinumo — perrinkti neįmanoma, druska nieko neprideda, o
  paieška turi būti viena indeksuota užklausa. Slaptažodis turi mažai entropijos,
  todėl reikia lėtos funkcijos.
- **Laiko ataka:** nežinomam el. paštui vis tiek lyginama su `DUMMY_HASH`
  ([passwords.ts:29](../apps/api/src/lib/passwords.ts:29)). Kitaip nežinomas
  adresas atsakytų ~250 ms greičiau ir atskleistų, kurios paskyros egzistuoja.
- Nežinomas el. paštas ir blogas slaptažodis → **tas pats** 401 `INVALID_CREDENTIALS`.
- El. paštas normalizuojamas (`trim().toLowerCase()`).

### 8.8. Bandymų ribojimas

[lib/rate-limit.ts](../apps/api/src/lib/rate-limit.ts):

| Metodas | Limitas | Raktas |
|---|---|---|
| `/auth/login` | 10 **nesėkmingų** per 15 min. | IP + el. paštas |
| `/auth/register` | 30 per valandą | IP |
| `/auth/refresh` | 30 nesėkmingų per 15 min. | IP |

Viršijus → **429** + `Retry-After: <sekundės>`. Skaitikliai atmintyje — tinka
vienam egzemplioriui; keliems reikėtų Redis.

---

## 9. Autorizacija

### 9.1. Rolės

| Rolė | Kaip gaunama | Ką daro |
|---|---|---|
| Svečias | Be žetono | Aikštelė, paskelbti projektai, viešoji peržiūra, registracija |
| `CLIENT` | Registracija | Kuria aikštelės projektus, priima/atmeta pasiūlymus |
| `SPECIALIST` | Registracija | Teikia pasiūlymus, kuria tiesioginius projektus, registruoja sesijas |
| `ADMIN` | **Tik seed / DB** — registracijoje neleidžiama | Naudotojų sąrašas, blokavimas, šalinimas, bet kurio projekto peržiūra ir šalinimas |

### 9.2. Du lygiai

1. **Pagal rolę** — `requireRole('ADMIN')` ([middleware/auth.ts:102](../apps/api/src/middleware/auth.ts:102)),
   pvz., `GET /users`. Arba `assertCanCreateProject`: aikštelės projektą kuria tik
   `CLIENT`, tiesioginį — tik `SPECIALIST`.
2. **Pagal ID / nuosavybę** — [services/access.ts](../apps/api/src/services/access.ts):
   - `assertCanViewProject` — paskelbtą mato visi; kitus — tik šalys
     (užsakovas, specialistas) ir administratorius. Kitaip **404**.
   - `assertCanManageProject` — keisti gali tik šalys. Administratorius —
     **ne** (moderuoti = šalinti, ne perrašyti svetimą darbą).
   - `assertCanDeleteProject` — tik kūrėjas arba administratorius.
   - `assertIsSessionAuthor` — sesiją keičia tik jos autorius (net ne užsakovas).
   - `assertIsProposalAuthor` — pasiūlymą atsiima tik jo autorius.

Tai tiesiogiai atitinka kriterijų „paprastas naudotojas neturi galėti ištrinti
arba redaguoti kito naudotojo komentaro“ — pas mus tai **sesija ir pasiūlymas**.

Visa teisių matrica — README 5.3; kiekviena eilutė turi testą
[access.test.ts](../apps/api/src/services/access.test.ts).

---

## 10. Saugumo grėsmės ir apsaugos

| Grėsmė | Kas tai | Apsauga | Kur |
|---|---|---|---|
| **SQL injekcija** | Įvestis tampa SQL dalimi (`' OR 1=1 --`) | Prisma parametrizuotos užklausos; vienintelis „raw“ SQL — `SELECT 1` sveikatos patikrai | `lib/prisma.ts`, `routes/health.ts` |
| **Tipų injekcija** | Vietoj teksto atsiunčiamas objektas (`{"$gt": ""}`) | Zod tikrina tipus | `lib/validate.ts` |
| **Mass assignment** | Atsiunčiami papildomi laukai (`"role":"ADMIN"`) | Zod `z.object` **išmeta nežinomus laukus**; `RegisterInput.role` — tik `CLIENT`/`SPECIALIST` | `packages/shared/src/schemas.ts` |
| **Teisių eskalacija** | Paprastas naudotojas gauna daugiau teisių | Registracija be ADMIN; `PATCH /auth/me` ignoruoja `role`; `requireRole`; rolė žetone pasirašyta | `routes/auth.ts`, `middleware/auth.ts` |
| **IDOR** | Pakeitęs ID URL pasiekia svetimą resursą | Matomumo ir nuosavybės patikros kiekviename metode; scoping per URL | `services/access.ts`, `lib/scope.ts` |
| **Suklastotas JWT** | Pakeistas payload arba `alg: none` | Parašo patikra, prisegtas `HS256` | `lib/tokens.ts` |
| **XSS** | Svetimas JS vykdomas puslapyje | Atnaujinimo žetonas `httpOnly`; `helmet` CSP; React pats išveda tekstą saugiai | `refresh-cookie.ts`, `app.ts` |
| **CSRF** | Kita svetainė priverčia naršyklę siųsti užklausą su slapuku | `SameSite=Lax`, `Path=/api/auth`, CORS tik `WEB_ORIGIN`; prieigos žetonas antraštėje (automatiškai nesiunčiamas) | `refresh-cookie.ts`, `app.ts` |
| **Clickjacking** | Puslapis įdedamas į nematomą `iframe` | `helmet`: `X-Frame-Options` | `app.ts` |
| **Brute force** | Slaptažodžio spėliojimas | 429 | `lib/rate-limit.ts` |
| **Naudotojų išvardijimas** | Sužinoti, kurie el. paštai registruoti | Vienodas 401 ir vienodas laikas (`DUMMY_HASH`); svetimas — 404 | `routes/auth.ts` |
| **Pavogtas žetonas** | — | Prieigos: 15 min. + `sid`; atnaujinimo: rotacija + šeimos panaikinimas | README 5.2 |
| **DB nutekėjimas** | Kažkas gauna DB kopiją | `bcrypt` slaptažodžiams, `sha256` žetonams | `passwords.ts`, `secure-token.ts` |
| **Informacijos nutekėjimas** | Klaidos pranešimas atskleidžia vidų | 500 be priežasties | `middleware/error.ts` |
| **DoS per didelį kūną** | Milžiniškas JSON | `express.json({ limit: '1mb' })` → 413 | `app.ts` |
| **Silpna paslaptis** | Trumpą raktą galima perrinkti | Gamyboje ≥ 32 simboliai, kitaip programa nepasileidžia | `env.ts` |

**CORS — dažnas nesusipratimas.** CORS **neapsaugo serverio**: jį taiko tik
naršyklė, o Postman ar `curl` jo nepaiso. CORS apsaugo **naudotoją** — neleidžia
kitai svetainei jo naršyklėje perskaityti mūsų API atsakymų.

---

## 11. Testavimas ir CI

| Lygis | Įrankis | Ką tikrina |
|---|---|---|
| Vienetiniai | Vitest | `services/*` taisyklės, žetonai (tarp jų suklastoti, pasibaigę), rotacija, klaidų politika |
| Integraciniai | Vitest + supertest | Express programa be tinklo: kodai, antraštės, atsakymai atitinka OpenAPI |
| Sistemos (E2E) | Postman / Newman | 140 užklausų prieš tikrą serverį ir DB; pilnas gyvavimo ciklas |
| Aprėptis | `postman:coverage` | Kiekviena OpenAPI operacija turi užklausą kolekcijoje |
| CI | GitHub Actions | Visa tai + migracijos + OpenAPI failas atitinka kodą |

---

## 12. Internetinė aplikacija ir tarpinis maršrutas

Naršyklė kalba ne su API, o su Next.js maršrutu `/api/[...path]`
([route.ts](../apps/web/src/app/api/%5B...path%5D/route.ts)), kuris persiunčia
užklausą į API ir grąžina atsakymą. Kodėl:

- slapukas tampa **tos pačios kilmės** (same-origin) → nereikia `SameSite=None`,
  mažiau CORS problemų;
- API adresas naršyklei nematomas.

Persiunčiamos tik išvardytos antraštės (`authorization`, `content-type`, `cookie`,
`accept` ir atgal `content-type`, `set-cookie`, `x-robots-tag`). API nepasiekiamas
→ 502.

3 lab. plane ([planas-3.md](planas-3.md)): prieigos žetonas laikomas React
atmintyje, gavus `TOKEN_EXPIRED` — tylus `/auth/refresh`, mygtukai rodomi pagal
`_links`.

---

## 13. Naujas objektas su CRUD (reikės parodyti be LLM)

Pilnas žingsnių sąrašas — [cheatsheet.md, 10 skyrius](cheatsheet.md#repeticija-naujas-objektas-su-crud-be-llm).
Trumpai, pvz., komentaras prie užduoties:

1. `schema.prisma` — modelis `Comment` + ryšys su `Task` (`onDelete: Cascade`).
2. `npm run db:migrate --workspace apps/api -- --name add-comments`.
3. `packages/shared/src/schemas.ts` — `Comment`, `CreateCommentInput`, `UpdateCommentInput`.
4. `lib/serialize.ts` — `toComment`.
5. `lib/scope.ts` — `CommentParams`, `findCommentOr404` (`where: { id, taskId, task: { projectId } }`).
6. `routes/comments.ts` — 5 maršrutai pagal šabloną iš 4.2 skyriaus.
7. `app.ts` — įtraukti į `routers` masyvą.
8. `openapi.ts` + `npm run openapi:export`; Postman užklausos.

**Pasitreniruokite bent kartą** su laikmačiu, tada `git stash`.

---

## 14. Silpnos vietos (geriau pasakyti pačiam, nei būti pagautam)

| Kas | Kodėl taip / ką daryčiau |
|---|---|
| Nėra 2FA | Sąmoningai nepasirinkta; būtų TOTP (pvz., `otplib`) po slaptažodžio |
| „Stateless“ ne visiškas | `authenticate` kiekvienai užklausai daro 1 DB paiešką — kaina už tikrą atsijungimą ir blokavimą iš karto. Būsena DB, ne proceso atmintyje, todėl mastelis išlieka |
| Bandymų ribojimas atmintyje | Keliems egzemplioriams reikėtų Redis; už tarpinio sluoksnio reikia teisingai nustatyti `trust proxy`, kitaip visi atrodys kaip vienas IP |
| HS256 — vienas raktas | Nutekėjus raktui galima klastoti bet kokį prieigos žetoną. Sprendimas — pakeisti raktą: visi seni prieigos žetonai tampa negaliojantys, o atnaujinimo žetonai nuo rakto nepriklauso, todėl naudotojai tiesiog gauna naujus prieigos žetonus ir nieko nepastebi |
| Nėra administratoriaus kūrimo per API | Sąmoningai: administratorius sukuriamas seed arba tiesiogiai DB |
| `pino` neprijungtas | Priklausomybė yra, žurnalų sistema dar nenaudojama |

---

# II dalis. Klausimai ir atsakymai

## A. Projektas ir architektūra

**A1. Apie ką jūsų projektas?**
Darbų aikštelė užsakovams ir specialistams su laiko apskaita. Užsakovas skelbia
projektą, specialistai teikia pasiūlymus, priimtas specialistas registruoja
darbo sesijas prie užduočių, sistema skaičiuoja valandas ir sumą.

**A2. Kokie trys taikomosios srities objektai ir kodėl jie hierarchiniai?**
Projektas → Užduotis → Darbo sesija. Projektas turi daug užduočių, užduotis —
daug sesijų (du 1:N ryšiai, `projectId` ir `taskId` išoriniai raktai su
kaskadomis). Naudotojų lentelė į grandinę neįeina. Vidurinis lygis prasmingas:
užduotis gali perrašyti projekto įkainį.

**A3. Kodėl ne „Naudotojas → Projektas → Užduotis“?**
Kriterijus draudžia naudotojų esybę hierarchijoje. Be to, projektas turi du
naudotojus (užsakovą ir specialistą), tai ne paprastas 1:N.

**A4. Kokie dar objektai yra ir kam jie?**
Pasiūlymas (valdo aikštelės projekto gyvavimo ciklą — sesijų negali būti, kol
pasiūlymas nepriimtas), peržiūros nuoroda (skaitymo prieiga be paskyros),
atnaujinimo žetonas (autentifikacijai), naudotojas.

**A5. Parodykite, kur aprašomi keliai.**
Kiekvienas resursas — savo `Router` faile `apps/api/src/routes/*.ts`
(pvz., `tasksRouter.get('/projects/:projectId/tasks', ...)`). Visi prijungiami
[app.ts](../apps/api/src/app.ts) cikle `for (const router of routers) app.use('/api', router)`.

**A6. Kur vykdomos su užklausa susijusios operacijos?**
Maršrute: validavimas (`lib/validate.ts`) → paieška su apimtimi (`lib/scope.ts`)
→ taisyklės ir teisės (`services/`) → rašymas per Prisma → serializavimas
(`lib/serialize.ts`) → atsakymas (`lib/http.ts`). Klaidos — `middleware/error.ts`.

**A7. Kas yra middleware?**
Funkcija `(req, res, next)`, vykdoma prieš maršrutą (arba po jo). Pas mus:
`helmet`, `cors`, `express.json`, `cookieParser`, `cacheControl`, `authenticate`,
`requireRole`, rate limiteriai, `methodNotAllowed`, `notFound`, `errorHandler`.

**A8. Kodėl atskirti `routes` ir `services`?**
`services` — grynos funkcijos be HTTP ir DB, todėl testuojamos akimirksniu ir
pakartotinai naudojamos (pvz., `lib/links.ts` jas kviečia nuspręsti, kokius
veiksmus rodyti). Maršrutai lieka ploni.

**A9. Kas yra `packages/shared`?**
Bendros Zod schemos ir TS tipai, naudojami ir API, ir web. Iš jų: validavimas
serveryje, tipai kliente, OpenAPI dokumentacija. Viena tiesos vieta.

**A10. Kodėl Express, o ne NestJS / Fastify?**
Paprastas, gerai žinomas, lankstus middleware mechanizmas; 5 versija palaiko
`async` klaidas. NestJS — daugiau struktūros, bet ir daugiau „magijos“
(dekoratoriai, DI), kurią reikėtų paaiškinti gynime. Fastify greitesnis, bet
čia našumas nėra butelio kaklelis.

**A11. Kodėl TypeScript?**
Tipų klaidos pagaunamos kompiliuojant; Prisma ir Zod generuoja tipus, todėl
`req.body` nebūna `any`; tie patys tipai dalijami su klientu.

## B. REST

**B1. Kas yra REST?**
Architektūrinis stilius su 6 apribojimais: klientas–serveris, stateless,
cacheable, uniform interface, layered system, (neprivaloma) code on demand.

**B2. Ar jūsų API stateless?**
Taip REST prasme: kiekviena užklausa neša prieigos žetoną, serveris neturi
sesijų proceso atmintyje, todėl bet kuris egzempliorius aptarnauja bet kurią
užklausą. Sąmoningai ne visiškai: `authenticate` DB tikrina, ar `sid` šeima
dar galioja ir ar naudotojas neužblokuotas — kad atsijungimas ir blokavimas
veiktų iš karto. Ta būsena DB, ne atmintyje. Vienintelė atminties būsena —
bandymų ribojimo skaitikliai.

**B3. Ką suteikia stateless?**
Horizontalų mastelį (galima pridėti serverių be „lipnių“ sesijų),
paprastesnį atsigavimą po gedimo, kiekviena užklausa suprantama atskirai.

**B4. Ką suteikia cacheable ir kaip realizuota?**
Mažesnį tinklo krūvį. `Cache-Control: private, no-cache` + `ETag`; su
`If-None-Match` nepasikeitęs resursas → 304 be kūno. `/auth/*` ir `/public/*` —
`no-store`.

**B5. Kas yra uniform interface?**
Resursai identifikuojami URI, veiksmai — standartiniai HTTP metodai,
reprezentacijos (JSON/CSV), savaime aprašantys pranešimai (kodai, antraštės) ir
HATEOAS (`_links`).

**B6. Kas yra HATEOAS / hypermedia ir kaip pas jus?**
Atsakymas nurodo, kur eiti toliau ir ką galima daryti. `_links` su ryšiais
(`self`, `project`, `tasks`) ir veiksmais (`publish`, `stop` su `method`).
Veiksmai priklauso nuo rolės ir būsenos ir skaičiuojami tomis pačiomis `assert*`
funkcijomis (`allows` [links.ts:66](../apps/api/src/lib/links.ts:66)).

**B7. Kodėl `PATCH`, o ne `PUT`?**
`PUT` pakeičia visą resursą — klientas turėtų siųsti visus laukus. `PATCH` keičia
tik atsiųstus. Pas mus `undefined` (lauko nėra) ≠ `null` (išvalyti). `PUT` grąžina 405.

**B8. Kodėl `publish` ne `POST /projects/{id}/publish`?**
Tai būsenos keitimas, o ne naujas resursas: `PATCH /projects/{id}` su
`{"status":"PUBLISHED"}`. URI lieka daiktavardžiai.

**B9. Parodykite hierarchinį metodą per 3 objektus.**
`GET /projects/{projectId}/tasks/{taskId}/sessions` (ir su `/{sessionId}`).

**B10. Kas nutinka, jei `/projects/A/tasks/{B projekto užduotis}`?**
404 „Task … does not exist in project A“ — ID ieškomas tėvo viduje
([scope.ts:48](../apps/api/src/lib/scope.ts:48)).

**B11. Kodėl ne 403 šiuo atveju?**
Niekas nedraudžiama — tokiu adresu resurso tiesiog nėra.

**B12. Kodėl `GET /projects?scope=owned`, o ne `/my-projects`?**
Resursas tas pats (projektai), keičiasi tik atrankos kriterijus — tai filtras.

**B13. Kaip realizuotas puslapiavimas?**
`page`, `perPage` → Prisma `skip`/`take`; `findMany` + `count` vienoje
transakcijoje; vokas `{items, page, perPage, total, totalPages, _links}`.

**B14. Kodėl puslapis už pabaigos — 200, ne 404?**
Kolekcija egzistuoja, tik tiek elementų neturi; `totalPages` rodo, kur pabaiga.

**B15. Kas yra resursas, sudarytas iš kelių esybių?**
`GET /projects/{id}/report` — projektas, užduotys, sesijos ir suvestinė.
`GET /public/projects/{token}` — tas pats viešai.

**B16. Kas yra content negotiation?**
Tas pats resursas skirtingais formatais pagal `Accept`. Ataskaita — JSON arba
CSV; nepalaikomas tipas → 406.

**B17. Ar DELETE idempotentiškas?**
Būsenos prasme — taip: antras kartas sistemos nekeičia. Atsakymas gali skirtis
(ištrintas projektas antrą kartą → 404), tai leidžiama.

**B18. Ar `POST` idempotentiškas?**
Ne — du `POST /projects` sukuria du projektus.

**B19. Kodėl 41 operacija, o README 1.4 rašo 38?**
38 — dalykiniai (28) + autentifikacijos (6) + naudotojų (4). Dar 3 tarnybiniai
(`GET /api`, `/health`, `/health/ready`) = 41 OpenAPI.

## C. Statuso kodai

**C1. Kuo skiriasi 400 ir 422?**
400 — užklausos sintaksė bloga (netaisyklingas JSON, `id` ne UUID, `scope=xyz`).
422 — užklausa suprasta, bet turinys prieštarauja taisyklėms (per trumpas
pavadinimas, neleistinas būsenos perėjimas). `parseParams`/`parseQuery` → 400,
`parseBody` → 422.

**C2. Kuo skiriasi 401 ir 403?**
401 — nežinome, kas tu (nėra / blogas / pasibaigęs žetonas). 403 — žinome, bet
neleidžiama (rolė, nuosavybė, užblokuotas).

**C3. Kodėl svetimas juodraštis → 404, ne 403?**
403 atskleistų, kad projektas su tokiu ID egzistuoja. 404 neatskleidžia nieko.

**C4. Kada 409?**
Konfliktas su esama būsena: antra vykdoma sesija, antras pasiūlymas tam pačiam
projektui, užimtas el. paštas, naudotojas su darbo istorija šalinamas.

**C5. Kada 201 ir kas būna su juo?**
Resursas sukurtas; `Location` antraštė su jo adresu, kūne — pats resursas
(`id`, `createdAt`, kurių klientas nežinojo). [lib/http.ts](../apps/api/src/lib/http.ts).

**C6. Kodėl 204 šalinant?**
Nėra ką grąžinti; 204 atsakymas kūno turėti negali.

**C7. Kada 405?**
Adresas žinomas, metodas ne (pvz., `PUT /projects/{id}`); `Allow` antraštė
išvardija leidžiamus metodus, sudaroma iš pačių maršrutų.

**C8. Kaip užtikrinate, kad niekada negrąžinsite 500?**
Visos klaidos keliauja į `errorHandler`, kuris atpažįsta Zod, `HttpError`,
body-parser, Prisma (`P2025`, `P2002`, `P2003`, `P2000`, `P2020`) ir Express 4xx
klaidas. NUL simbolis atmetamas `validate.ts`. Ribiniai atvejai (neiškoduojamas
URL `%E0%A4%A`, per didelis skaičius, `null` kūnas) padengti testais ir Postman.

**C9. Pademonstruokite 500.**
Negalime — tai tikslas. Galima parodyti, kad net keistos užklausos grąžina 4xx
(Postman „2. / Ribiniai atvejai (niekada 500)“).

**C10. Kodėl 413?**
Kūnas didesnis nei 1 MB (`express.json({ limit: '1mb' })`).

**C11. Kodėl 429 ir `Retry-After`?**
Viršytas bandymų limitas; antraštė pasako, po kiek sekundžių bandyti vėl.

**C12. Kokie autorizacijos kodai?**
401 (`AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `SESSION_REVOKED`,
`INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSED`),
403 (`FORBIDDEN`, `ACCOUNT_BLOCKED`), 429.

**C13. Kaip atrodo klaidos atsakymas?**
`{ "error": { "code": "…", "message": "…", "details": … } }` — `code` programai,
`message` žmogui, `details` — kuris laukas.

## D. Duomenų bazė

**D1. Kodėl PostgreSQL?**
Duomenys reliaciniai (hierarchija, išoriniai raktai, kaskados), reikia
transakcijų (pasiūlymo priėmimas keičia 3 lenteles), tikslaus `numeric` pinigams
ir **dalinių unikalių indeksų**. Atvira, veikia Docker, Azure turi valdomą paslaugą.

**D2. Alternatyvos?**
MySQL/MariaDB — nėra dalinių indeksų (reikėtų trigerių / generuojamų stulpelių).
MongoDB — dokumentinė, ryšius ir transakcijas tektų prižiūrėti programoje.
SQLite — vienas failas, ribotas lygiagretus rašymas, netinka keliems
egzemplioriams. MS SQL — turi filtruotus indeksus, bet licencijuojama.

**D3. Kas yra dalinis unikalus indeksas?**
Unikalumas tik eilutėms, atitinkančioms `WHERE`. `work_sessions(specialistId) WHERE endedAt IS NULL`
— viena vykdoma sesija; `proposals(projectId) WHERE status = 'ACCEPTED'` — vienas priimtas pasiūlymas.

**D4. Kodėl ne tik programos patikra?**
Lenktynių sąlyga: dvi lygiagrečios užklausos abi praeina patikrą. Tik DB
garantuoja atomiškai. Programos patikra — aiškiam pranešimui.

**D5. Kas yra ORM ir kodėl Prisma?**
Objektų ir lentelių atvaizdavimas. Prisma: schema viename faile, tipizuotas
klientas, migracijos, parametrizuotos užklausos.

**D6. Kas yra migracija?**
Versijuotas SQL failas, keičiantis DB struktūrą. `prisma migrate dev` kuria,
`prisma migrate deploy` taiko gamyboje/CI.

**D7. Kodėl UUID, ne auto-increment?**
Neatspėjami, generuojami be DB, neatskleidžia įrašų skaičiaus.

**D8. Kas nutinka ištrynus projektą?**
Kaskada: užduotys, sesijos, pasiūlymai, peržiūros nuorodos ištrinamos DB lygiu.

**D9. Kodėl negalima ištrinti naudotojo su darbo istorija?**
Kaskada ištrintų ir kitos šalies įrašus (sesijas, projektus). Toks → 409
`USER_HAS_WORK_HISTORY`, sprendimas — blokavimas.

**D10. Kodėl `durationMinutes` ir `appliedRate` saugomi, o ne skaičiuojami?**
Kad suvestinės būtų greitos ir kad pakeitus įkainį jau atliktų darbų vertė
nepasikeistų. Klientas jų atsiųsti negali — nustato serveris.

**D11. Kaip paveldimas įkainis?**
`taskRate ?? projectRate` ([sessions.ts:55](../apps/api/src/services/sessions.ts:55)),
įrašomas užbaigiant sesiją.

**D12. Ar DB užpildyta prasmingais duomenimis?**
Taip: 7 projektai, 21 užduotis, 26 sesijos, 7 pasiūlymai, 6 nuorodos, 9
naudotojai — realistiški lietuviški duomenys, visos būsenos. Seed pakartojamas.

## E. JWT ir žetonai

**E1. Kokia JWT struktūra?**
`header.payload.signature`, kiekviena dalis base64url. Header — algoritmas ir
tipas, payload — teiginiai, signature — HMAC-SHA256 parašas.

**E2. Kokie teiginiai jūsų žetone?**
`sub` (naudotojo ID), `role`, `sid` (prisijungimo / šeimos ID), `iat`, `exp`,
`iss` = `hourly-api`, `aud` = `hourly`.

**E3. Kodėl į žetoną dedama rolė?**
Serveris žino rolę be DB užklausos; klientas gali pritaikyti sąsają. Pakeisti
negalima — pasikeistų parašas.

**E4. Kodėl nėra el. pašto?**
JWT tik užkoduotas, ne užšifruotas — bet kas gali perskaityti.

**E5. Parodykite, kur sukuriamas žetonas.**
[tokens.ts:54](../apps/api/src/lib/tokens.ts:54) `signAccessToken` →
`jwt.sign(claims, env.JWT_ACCESS_SECRET, { algorithm: 'HS256', expiresIn, subject, issuer, audience })`.
Kviečiamas iš `issueTokens` [auth.ts:38](../apps/api/src/routes/auth.ts:38)
po registracijos, prisijungimo ir atnaujinimo.

**E6. Ar žetonas pasirašomas? Kuo? Kur raktas?**
Taip, `HS256` (HMAC-SHA256), simetrinis raktas `JWT_ACCESS_SECRET` iš `.env`
(Git'e nėra), tikrinamas `env.ts` paleidžiant.

**E7. Kaip galima nulaužti žetoną?**
Negalima: pakeisti turinio (parašas), naudoti `alg: none` ar kitą algoritmą
(prisegtas `HS256`), naudoti po atsijungimo (`sid`), po blokavimo (DB patikra).
Galima teoriškai: perrinkti **silpną** raktą offline (todėl ilgas atsitiktinis
raktas); **pavogti** žetoną (XSS) — todėl galioja 15 min. ir miršta atsijungus;
nutekėjus raktui — klastoti bet ką (todėl raktas tik aplinkos kintamajame).

**E8. Kas yra `alg: none` ataka?**
Užpuolikas nustato header `"alg":"none"` ir pašalina parašą. Blogai
sukonfigūruota biblioteka priima. Pas mus `algorithms: ['HS256']` tokio
nepriima (testas `tokens.test.ts`).

**E9. Kas yra algoritmų painiojimo ataka?**
Jei serveris naudoja RS256, užpuolikas pasirašo HS256 naudodamas **viešąjį**
raktą kaip HMAC paslaptį. Prisegtas algoritmas to neleidžia.

**E10. Kaip perduodamas žetonas?**
Prieigos — `Authorization: Bearer <jwt>`. Atnaujinimo — slapukas
`hourly_refresh` (`HttpOnly`, `Secure` gamyboje, `SameSite=Lax`, `Path=/api/auth`).

**E11. Parodykite, kad uždėti `Secure` ir `HttpOnly`.**
[refresh-cookie.ts](../apps/api/src/lib/refresh-cookie.ts) `baseOptions()`;
Postman — `Set-Cookie` antraštė po prisijungimo. Lokaliai `Secure` išjungtas,
nes `http://localhost`; gamyboje (`NODE_ENV=production`) — įjungtas automatiškai.

**E12. Kodėl atnaujinimo žetonas slapuke, o ne `localStorage`?**
`localStorage` pasiekiamas bet kuriam JS — XSS jį pavogtų. `httpOnly` slapukas
JS nepasiekiamas.

**E13. Kodėl prieigos žetonas ne slapuke?**
Tada visoms užklausoms reikėtų CSRF apsaugos; antraštė automatiškai
nesiunčiama, todėl CSRF jai negresia. Pavogimo rizika ribojama 15 min.

**E14. Kokia atnaujinimo strategija?**
Refresh token rotacija su šeimomis ir pakartotinio panaudojimo aptikimu. Access
15 min., refresh 30 d.; kiekvienas refresh vienkartinis.

**E15. Kas nutinka, jei atnaujinimo žetoną pavogė?**
Kai vagis ir naudotojas abu pabando jį panaudoti, antrasis gauna 401
`REFRESH_TOKEN_REUSED`, o visa šeima panaikinama — vagis netenka ir savo naujo
žetono.

**E16. Kaip veikia logout? Ar tikrai panaikina žetonus?**
`POST /auth/logout` pagal slapuką randa šeimą ir pažymi visus jos žetonus
`revokedAt`, išvalo slapuką. Prieigos žetonas — nors jo parašas galioja — kitoje
užklausoje gauna 401 `SESSION_REVOKED`, nes `authenticate` nebeturi galiojančio
žetono jo `sid` šeimoje. Logout idempotentiškas — visada 204.

**E17. Kodėl logout nereikalauja prieigos žetono?**
Kad būtų galima atsijungti ir jam pasibaigus. Atsijungiama pagal slapuką.

**E18. Kodėl atnaujinimo žetonas DB saugomas kaip maiša?**
Nutekėjus DB, žetonų iš maišų atkurti neįmanoma — kaip su slaptažodžiais.

**E19. Kodėl `sha256`, ne `bcrypt` žetonams?**
256 bitai atsitiktinumo — perrinkti neįmanoma; paieška turi būti greita ir
viena (`WHERE tokenHash = …`). `bcrypt` su druska neleistų ieškoti pagal maišą.

**E20. Kas yra `sid` ir kam jo reikia?**
Prisijungimo (atnaujinimo žetonų šeimos) ID. Leidžia atšaukti ir prieigos
žetoną — be jo atsijungęs naudotojas dar iki 15 min. galėtų naudotis API.

**E21. Ką daro klientas gavęs 401 `TOKEN_EXPIRED` ir `SESSION_REVOKED`?**
`TOKEN_EXPIRED` — kviečia `/auth/refresh` ir kartoja užklausą.
`SESSION_REVOKED` — nukreipia į prisijungimą.

**E22. Ar realizuota 2FA?**
Ne, sąmoningai. Būtų TOTP po slaptažodžio patikros.

## F. Autorizacija ir saugumas

**F1. Kokios rolės?**
Svečias, `CLIENT`, `SPECIALIST`, `ADMIN` (≥ 3, kaip reikalauja kriterijus).

**F2. Kaip tikrinama rolė?**
`requireRole('ADMIN')` middleware ([auth.ts:102](../apps/api/src/middleware/auth.ts:102))
arba `assertCanCreateProject(origin, role)`. Anonimui → 401, netinkamai rolei → 403.

**F3. Kaip tikrinama nuosavybė?**
[services/access.ts](../apps/api/src/services/access.ts) ir `services/*`:
`isParty`, `assertCanManageProject`, `assertIsSessionAuthor`,
`assertIsProposalAuthor`. Visada pirma matomumas (404), paskui leidimas (403).

**F4. Ar specialistas gali redaguoti kito specialisto sesiją?**
Ne — 403 (`assertIsSessionAuthor`), jei projektą mato; 404, jei ne.

**F5. Ar užsakovas gali redaguoti specialisto sesiją savo projekte?**
Ne — sesija priklauso jos autoriui. Užsakovas gali tik skaityti.

**F6. Ar administratorius gali redaguoti svetimą projektą?**
Ne. Gali matyti viską ir šalinti, bet ne perrašyti — moderavimas ≠ darbo keitimas.

**F7. Ar galima užsiregistruoti administratoriumi?**
Ne — `RegisterInput.role` tik `CLIENT` | `SPECIALIST`, kitaip 422.

**F8. O jei `PATCH /auth/me` su `{"role":"ADMIN"}`?**
Laukas ignoruojamas: `UpdateMeInput` jo neturi, o Zod `z.object` nežinomus
laukus išmeta. Postman „0. / PATCH /auth/me“ tai rodo.

**F9. O jei pakeisiu `role` JWT payload'e?**
Parašas nebesutaps → 401 `INVALID_TOKEN`.

**F10. Kaip apsisaugota nuo SQL injekcijų?**
Prisma naudoja parametrizuotas užklausas; ranka rašyto SQL su naudotojo įvestimi
nėra. Zod papildomai tikrina tipus.

**F11. Kas yra IDOR ir kaip apsisaugota?**
Insecure Direct Object Reference — pakeitęs ID pasiekiu svetimą. Kiekviename
metode matomumo ir nuosavybės patikros + scoping per URL; UUID neatspėjami.

**F12. Kaip apsisaugota nuo XSS?**
API grąžina tik JSON (ne HTML); atnaujinimo žetonas `httpOnly`; `helmet`
nustato CSP ir `nosniff`; React išveda tekstą saugiai.

**F13. Kaip apsisaugota nuo CSRF?**
Prieigos žetonas antraštėje (naršyklė jo pati neprideda); slapukas
`SameSite=Lax`, `Path=/api/auth`; CORS tik `WEB_ORIGIN`.

**F14. Ar CORS apsaugo API?**
Ne serverį — tik naršyklės naudotoją. Postman / `curl` CORS nepaiso. Apsauga —
autentifikacija ir autorizacija.

**F15. Kas vyksta užblokuotam naudotojui?**
Blokavimas panaikina visus jo atnaujinimo žetonus; `authenticate` kiekvienoje
užklausoje tikrina `isBlocked` → 403 `ACCOUNT_BLOCKED` iš karto, ne po 15 min.
Prisijungti irgi negali (403 po teisingo slaptažodžio).

**F16. Kodėl blokuotam 403, o ne 401?**
Žinome, kas jis — prisijungimas iš naujo nepadės.

**F17. Kaip apsisaugota nuo slaptažodžių spėliojimo?**
10 nesėkmingų bandymų per 15 min. tam pačiam el. paštui iš to paties IP → 429;
`bcrypt` kaina 12 lėtina offline ataką.

**F18. Kodėl limitas pagal IP + el. paštą?**
Kad vienas užpuolikas bendrame tinkle neužblokuotų visų; skaičiuojamos tik
nesėkmės, todėl dažnai prisijungiantis naudotojas nenukenčia.

**F19. Kaip neleidžiama sužinoti, ar el. paštas registruotas?**
Vienodas 401 ir vienodas atsakymo laikas (`DUMMY_HASH`). Registracija gali
grąžinti 409 `EMAIL_TAKEN` — tai kompromisas dėl naudotojo patogumo, apribotas
registracijos limitu.

**F20. Kaip saugomi slaptažodžiai?**
`bcrypt`, kaina 12, su druska. Keičiant — reikia dabartinio slaptažodžio, o kiti
prisijungimai atšaukiami.

**F21. Kas yra `helmet`?**
Middleware, nustatantis saugumo antraštes (CSP, `X-Frame-Options`,
`X-Content-Type-Options`, HSTS, `Referrer-Policy`) ir pašalinantis `X-Powered-By`.

**F22. Kaip veikia peržiūros nuoroda ir ar ji saugi?**
Gebėjimo žetonas (capability token): 256 bitų atsitiktinis, DB tik `sha256`
maiša, ribotas galiojimas, tik skaitymas, atšaukiamas. Neegzistuojanti,
pasibaigusi ir atšaukta — vienodas 404. `X-Robots-Tag: noindex`, nes žetonas URL'e.

## G. Testavimas, įrankiai, LLM

**G1. Kaip testuojate visus endpoint'us?**
Postman kolekcija (140 užklausų, 300 patikrų), `npm run demo`; CI tikrina, kad
kiekviena iš 41 OpenAPI operacijų turi užklausą. Swagger UI `/api/docs`.

**G2. Kas yra Newman?**
Postman kolekcijų paleidimas komandine eilute — naudojamas `npm run demo` ir CI.

**G3. Kas yra supertest?**
Siunčia HTTP užklausas tiesiai į Express programą be tikro prievado — greiti
integraciniai testai.

**G4. Kaip dokumentacija neatsilieka nuo kodo?**
OpenAPI generuojama iš tų pačių Zod schemų; CI eksportuoja ir `git diff --exit-code`.

**G5. Kaip naudojote LLM?**
Claude Code kaip agentą. Kiekvienam etapui — planas (`docs/planas*.md`), kurį
peržiūrėdavau ir priimdavau sprendimus pats (pvz., 2FA nedaryti, šalinti
plokščius adresus). LLM atliko auditą pagal kriterijus ir siuntė ribines
užklausas (rado 500 atvejus). Mažais etapais, po kiekvieno — testai, lint, demo;
commit'us dariau pats.

**G6. Kaip valdėte LLM?**
Nuolatinės taisyklės projekto atmintyje (kodas angliškai, ataskaita lietuviškai,
commit'ų nedaro), sprendimai užrašomi planuose, rezultatas tikrinamas testais,
CI ir Postman — LLM teiginiai netikrinami aklai.

## H. „Provokuojantys“ klausimai

**H1. „Pakeisiu `/projects/{id}` į `/projects/labas` — ką gausiu?“**
400 `INVALID_PATH_PARAM` — ne UUID, toks adresas negali egzistuoti.

**H2. „Atsiųsiu `{"title": 123}`“**
422 `VALIDATION_ERROR` su `details` — kuris laukas.

**H3. „Atsiųsiu `{ blogas json`“**
400 `MALFORMED_JSON`.

**H4. „Kursiu sesiją projektui, kuris dar `PUBLISHED`“**
422 `PROJECT_NOT_IN_PROGRESS` (jei specialistas mato projektą); tik priimtas
specialistas gali registruoti laiką.

**H5. „Paleisiu antrą laikmatį“**
409 `SESSION_ALREADY_RUNNING` (ir DB indeksas, jei lenktynės).

**H6. „Pakeisiu projekto būseną iš `PUBLISHED` į `IN_PROGRESS` per PATCH“**
422 `INVALID_STATUS_TRANSITION` — `IN_PROGRESS` pasiekiamas tik priimant
pasiūlymą, kad projektas neliktų be specialisto ([projects.ts:20](../apps/api/src/services/projects.ts:20)).

**H7. „Sesijos pabaiga ankstesnė nei pradžia“**
422 `INVALID_TIME_RANGE`. Ateities laikas → 422 `TIMESTAMP_IN_FUTURE` (5 min.
tolerancija).

**H8. „Atsiųsiu `durationMinutes: 999`“**
Laukas nėra įvesties schemoje — ignoruojamas, trukmę skaičiuoja serveris.

**H9. „Du užsakovo langai tuo pačiu metu priima skirtingus pasiūlymus“**
Transakcija + dalinis indeksas `proposals_one_accepted_per_project`: antrasis
gauna 409 arba 422 `PROPOSAL_NOT_PENDING`.

**H10. „Pasiūlysiu antrą kartą tam pačiam projektui“**
409 `PROPOSAL_ALREADY_SUBMITTED` (unikalus `projectId + specialistId`).

**H11. „Ištrinsiu priimtą pasiūlymą“**
422 `PROPOSAL_ACCEPTED` — jis yra projekto vykdymo pagrindas.

**H12. „Siųsiu užklausą su pasibaigusiu žetonu į `/auth/refresh`“**
Veiks — `/auth/*` antraštės nežiūri.

**H13. „Siųsiu `Authorization: Bearer blogas` į viešą `GET /projects`“**
401 `INVALID_TOKEN` — blogas žetonas nėra svečias.

**H14. „Ką duos `PUT /projects/{id}`?“**
405 `METHOD_NOT_ALLOWED` su `Allow` antrašte, išvardijančia `GET`, `HEAD`, `PATCH`, `DELETE`.

**H15. „O `GET /nesamas`?“**
404 `NOT_FOUND`.

**H16. „Ataskaitą su `Accept: application/xml`“**
406 `NOT_ACCEPTABLE`.

**H17. „Kas, jei nutekės `JWT_ACCESS_SECRET`?“**
Galima suklastoti bet kurį prieigos žetoną. Sprendimas — pakeisti raktą: visi
seni prieigos žetonai tampa negaliojantys, o naudotojai per atnaujinimo žetoną
(jis nuo šio rakto nepriklauso) gauna naujus. Be to, suklastotam žetonui dar
reikia galiojančios `sid` šeimos DB.

**H18. „Kodėl nenaudojate sesijų (express-session) vietoj JWT?“**
Kriterijus reikalauja JWT/OAuth; be to, JWT savarankiškas (rolė be DB), tinka
ne tik naršyklei. Mūsų `sid` patikra iš esmės suteikia sesijų privalumą
(atšaukiamumą) išlaikant JWT.

**H19. „Jei kiekvienai užklausai vis tiek einate į DB — kam JWT?“**
Parašas įrodo tapatybę ir rolę be slaptažodžio; DB paieška — tik pagal indeksą
galiojimui patikrinti, ne naudotojui autentifikuoti. Tai sąmoningas
kompromisas: tikras atsijungimas ir blokavimas iš karto.

**H20. „Pridėkite naują objektą su CRUD dabar“**
Žr. I dalies 13 skyrių — žingsniai atmintinai.

---

# III dalis. Gynimui

## Ką paleisti prieš gynimą

```bash
npm run db:up
```

```bash
npm run db:seed
```

```bash
npm run dev:api
```

Tada Postman importuoti [kolekciją](postman/hourly.postman_collection.json) ir
[aplinką](postman/hourly.local.postman_environment.json) arba paleisti:

```bash
npm run demo
```

Demonstracinės paskyros — visos su slaptažodžiu `slaptazodis123`:
`admin@hourly.lt`, `uzsakovas@hourly.lt`, `specialistas@hourly.lt`,
`blokuotas@hourly.lt` (403) ir kt. (README 4 skyrius).

## Kodų demonstracija

| Kodas | Postman užklausa |
|---|---|
| 201 + `Location` | „1. / POST /projects“ |
| 204 | „1. / DELETE … atšaukti nuorodą“, „5. Valymas“ |
| 304 | „1. / Podėlis / Pakartotinis skaitymas“ |
| 400 | „2. / netaisyklingas id“, „2. / Ribiniai atvejai / NUL simbolis“ |
| 401 | „2. / be prieigos žetono“, „0. / Prieigos žetonas po atsijungimo“ |
| 403 | „3. / Specialistas kuria aikštelės projektą“, „4. / Užblokuotojo žetonas“ |
| 404 | „2. / nesamas projektas“, „2. / Apimtis / Svetimo projekto užduotis“, „3. / svetimas juodraštis“ |
| 405 | „2. / Apimtis / Nepalaikomas metodas“ |
| 406 | „2. / neprieinamas turinio tipas“ |
| 409 | „1. / antra vykdoma sesija“ |
| 422 | „2. / netinkamas turinys“, „1. / priimto šalinti negalima“ |
| 429 | „6. Bandymų ribojimas“ |

## Kodo vietos, kurias turite rasti per 10 sekundžių

| Ką | Kur |
|---|---|
| Maršrutų prijungimas | [app.ts](../apps/api/src/app.ts) |
| Žetono sukūrimas | [tokens.ts:54](../apps/api/src/lib/tokens.ts:54) |
| Žetono tikrinimas | [middleware/auth.ts:53](../apps/api/src/middleware/auth.ts:53), [tokens.ts:76](../apps/api/src/lib/tokens.ts:76) |
| Algoritmas | [tokens.ts:29](../apps/api/src/lib/tokens.ts:29) |
| Paslaptis ir jos tikrinimas | [env.ts](../apps/api/src/env.ts), `apps/api/.env` |
| Slapuko vėliavėlės | [refresh-cookie.ts](../apps/api/src/lib/refresh-cookie.ts) |
| Login / register / refresh / logout | [routes/auth.ts](../apps/api/src/routes/auth.ts) (71, 101, 125, 207 eil.) |
| Rotacijos sprendimas | [services/auth.ts:36](../apps/api/src/services/auth.ts:36) |
| Rolės patikra | [middleware/auth.ts:102](../apps/api/src/middleware/auth.ts:102), [actor.ts:59](../apps/api/src/lib/actor.ts:59) |
| Nuosavybės patikros | [services/access.ts](../apps/api/src/services/access.ts) |
| Apimtis per URL | [lib/scope.ts](../apps/api/src/lib/scope.ts) |
| 400 vs 422 | [lib/validate.ts](../apps/api/src/lib/validate.ts) |
| Klaidų vertėjas | [middleware/error.ts:208](../apps/api/src/middleware/error.ts:208) |
| 405 | [middleware/error.ts:68](../apps/api/src/middleware/error.ts:68) |
| Hypermedia | [lib/links.ts](../apps/api/src/lib/links.ts) |
| Puslapiavimas | [lib/pagination.ts](../apps/api/src/lib/pagination.ts) |
| Bandymų ribojimas | [lib/rate-limit.ts](../apps/api/src/lib/rate-limit.ts) |
| Slaptažodžiai | [lib/passwords.ts](../apps/api/src/lib/passwords.ts) |
| Daliniai indeksai | [migration.sql:206](../apps/api/prisma/migrations/20260918000000_init/migration.sql:206) |
| Pasiūlymo priėmimo transakcija | [routes/proposals.ts:195](../apps/api/src/routes/proposals.ts:195) |
| Būsenų perėjimai | [services/projects.ts:20](../apps/api/src/services/projects.ts:20) |
| Duomenų schema | [schema.prisma](../apps/api/prisma/schema.prisma) |

## Savikontrolė

Pažymėkite, kai galite paaiškinti **savo žodžiais, be lapelio**:

- [ ] 6 REST apribojimai ir kaip kiekvienas realizuotas (arba ne)
- [ ] Kodėl mūsų API „beveik“ stateless ir kodėl tai sąmoningas sprendimas
- [ ] 400 vs 422, 401 vs 403, 403 vs 404, 409 vs 422
- [ ] Užklausos kelias nuo `app.ts` iki atsakymo
- [ ] JWT struktūra, mūsų teiginiai, HMAC parašo principas
- [ ] Kaip `alg: none` ataka veikia ir kodėl pas mus neveikia
- [ ] Refresh rotacija, šeimos, pakartotinio panaudojimo aptikimas
- [ ] Kaip logout panaikina **ir** prieigos žetoną (`sid`)
- [ ] Slapuko vėliavėlės ir antraštė vs slapukas
- [ ] bcrypt vs sha256 — kodėl skirtingai
- [ ] Rolės vs nuosavybė; kur tikrinama kiekviena
- [ ] Daliniai unikalūs indeksai ir lenktynių sąlyga
- [ ] Kodėl PostgreSQL ir 3 alternatyvos
- [ ] CORS ką saugo, o ko ne
- [ ] Pridėti naują objektą su CRUD (išbandyta su laikmačiu)
- [ ] Kaip naudotas ir valdytas LLM
