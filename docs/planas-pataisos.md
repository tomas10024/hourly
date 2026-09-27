# Darbų planas: 1–2 lab. spragos prieš 3 laboratorinį

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md),
ankstesni planai – [planas.md](planas.md), [planas-2.md](planas-2.md), kitas –
[planas-3.md](planas-3.md).

**Tikslas:** prieš pradedant naudotojo sąsają uždaryti visas spragas pagal
**oficialius** 1 ir 2 lab. vertinimo kriterijus, kad 3 lab. klientas iš karto būtų
statomas ant galutinės API formos (URL, sąrašų vokai, `_links`).

**Kaip tikrinta (2026-09-27):** kodo peržiūra (`routes/*`, `middleware/*`,
`lib/*`, `schema.prisma`, `seed.ts`), Postman kolekcijos analizė (91 užklausa),
`npm test` (19 failų, 233 testai – visi praeina) ir ribinių atvejų užklausos
paleistam lokaliam API.

---

## 0. Suvestinė

Žymėjimas: ✓ – tenkinama, ◐ – iš dalies, ✗ – netenkinama.

### 1 laboratorinis

| Kriterijus (balai) | Būsena | Kas negerai |
|---|---|---|
| 3 objektai, CRUD + LIST (3) | ✓ | Project, Task, WorkSession – visi turi 5 metodus, laukų daug |
| ↳ puslapiavimas | ◐ | Tik `GET /projects` ir `GET /users`. Užduočių, sesijų, pasiūlymų, nuorodų sąrašai – plikas masyvas |
| ↳ filtravimas | ✓ | `scope`, `q`, `status`, `projectId`, `taskId`; verta praplėsti (C etapas) |
| ↳ hypermedia | **✗** | `_links` nėra niekur |
| ↳ resursas iš ≥ 2 esybių | ✓ | `GET /projects/{id}/report` (projektas + užduotys + sesijos) |
| Hierarchinis ryšys (1) | ✓ | Project → Task → WorkSession, vienas-su-daug, be naudotojų |
| Testavimo aplinka (1) | ◐ | Nėra `GET /proposals`, `DELETE /proposals/{id}`, `PATCH /auth/me`, `GET /health/ready` |
| ≥ 5 įrašai lentelėse (1) | ◐ | `share_links` – tik 3 |
| Teisingi kodai, **niekada 500** (2) | **✗** | Rasti 4 būdai gauti 500 (A etapas) |
| REST semantika ir apimtis (2) | **✗** | Nėra nė vieno 3 lygių URL (`/projects/{id}/tasks/{id}/sessions`); užduotys ir sesijos kuriamos per `POST /tasks`, `POST /sessions` su tėvo ID kūne – apimtis per URL nevaldoma |

**Rizika:** iki ~5 iš 10 balų (hypermedia + puslapiavimas → dalis iš 3, 500 → iki 2,
hierarchinis URL → iki 2, Postman ir seed – po dalį).

### 2 laboratorinis

| Kriterijus (balai) | Būsena | Pastabos |
|---|---|---|
| JWT, rolė ir ID žetone (3) | ✓ | `sub`, `role`, `iss`, `aud`, HS256 prisegtas (`lib/tokens.ts`) |
| Atnaujinimo strategija (2) | ✓ | Prieiga 15 min, refresh 30 d., rotacija, šeimos panaikinimas pakartojus |
| register / login / logout (2) | ◐ | Logout panaikina refresh šeimą, bet **prieigos žetonas galioja dar iki 15 min**. Kriterijus: „turi panaikinti naudotojo žetonus“. 2FA (+1) – nėra |
| ≥ 3 rolės, nuosavybės patikros (3) | ✓ | CLIENT, SPECIALIST, ADMIN (+ svečias); `services/access.ts` |
| Gynimas: grėsmės | ◐ | Nėra bandymų ribojimo (`/auth/login` galima „brute-force“); NUL baitas kelia 500 |

### Ataskaita

README 8 skyrius sulygintas su **kitu** kriterijų sąrašu (OpenAPI, „demonstracija iki
15 s“ ir pan.) – oficialių kriterijų (hypermedia, puslapiavimas, hierarchinis URL,
„niekada 500“) jame nėra. README nėra DB alternatyvų, REST principų ir LLM naudojimo
aprašymo, kurių klausiama gynime.

---

## 1. Etapas A – jokių 500 (didžiausia rizika)

**Būsena:** A1–A5 atlikta (2026-09-27; A4 – kartu su B); A6 – kartu su F.

### Rasti atvejai (atkartota lokaliai)

| # | Užklausa | Dabar | Turi būti | Priežastis |
|---|---|---|---|---|
| 1 | `GET /projects?q=%00` | 500 | 400 | PostgreSQL `text` negali turėti `0x00` |
| 2 | `POST /projects` su `"title": "a\u0000b"` (ir bet kuris kitas tekstinis laukas) | 500 | 422 | Tas pats |
| 3 | `GET /projects/%E0%A4%A`, `GET /public/projects/%E0%A4%A` | 500 | 400 | Express meta `URIError` su `status: 400`, bet `errorHandler` į `err.status` nežiūri |
| 4 | `POST /projects` su `budgetMin: 99999999999999` arba `hourlyRate: 1e15`; `PATCH /projects/{id}` su `budgetMax: 1e13` | 500 | 422 | `Money` neturi viršutinės ribos, o stulpelis `Decimal(10,2)` |
| 5 | `POST /tasks` su `position: 2147483648` | *nepatikrinta, tikėtina 500* | 422 | `position` – `Int` (int32), schemoje ribos nėra |

Papildomai: `dev` režime 500 atsakyme grįžta visas Prisma pranešimas su lokaliu failo
keliu. Gynimas vyks lokaliai – dėstytojas tai pamatys.

### Pataisos

- **A1. Ribos schemose** (`packages/shared/src/common.ts`, `schemas.ts`): `Money` → `.max(99_999_999.99)`, `position` → `.max(100_000)` (arba int32 riba), peržiūrėti visus `z.number()` be `.max()`.
- **A2. NUL baitas – vienoje vietoje** (`lib/validate.ts`): `parseBody`, `parseQuery`, `parseParams` prieš Zod rekursyviai tikrina eilutes; rastas `\u0000` → 422 (kūnas) / 400 (query, path) su lauko keliu `details`. Taip nereikia liesti kiekvienos schemos.
- **A3. `errorHandler` apsauginis tinklas** (`middleware/error.ts`):
  - klaida su `status`/`statusCode` 400–499 ir `expose: true` (Express, `http-errors`) → tas statusas, kodas `MALFORMED_REQUEST`;
  - Prisma `P2020` (reikšmė už ribų) → 422;
  - 500 atsakyme **visada** bendras pranešimas; detalės – tik `console.error`.
- **A4. 405 vietoj 404** (`PUT /projects/{id}` dabar 404). Kadangi B etape maršrutai vis tiek perrašomi, deklaruoti per `router.route(path).get().patch().delete().all(methodNotAllowed)` → 405 su `Allow` antrašte. Daroma kartu su B.
- **A5. Testai:** `error.test.ts` – kiekvienam atvejui; `app.test.ts` – integraciniai 1–5.
- **A6. Postman aplankas „Ribiniai atvejai“** – visos lentelės užklausos (F etapas). Gynime „dėstytojai mėgins iššaukti neteisingą elgesį“ – geriau parodyti patiems.

---

## 2. Etapas B – hierarchiniai URL ir apimtis

**Būsena:** atlikta (2026-09-27), įskaitant pasiūlymus, nuorodas ir 405. Papildomai: `GET /projects/{projectId}/proposals/{proposalId}`, sesijos atsakyme – `projectId`. Postman: nauji URL ir aplankas „Apimtis per URL ir metodai“.

### Tikslinė schema

| Metodas | URL | Pastaba |
|---|---|---|
| GET, POST | `/projects/{projectId}/tasks` | POST – naujas (vietoj `POST /tasks`) |
| GET, PATCH, DELETE | `/projects/{projectId}/tasks/{taskId}` | vietoj `/tasks/{id}` |
| GET, POST | `/projects/{projectId}/tasks/{taskId}/sessions` | **privalomas 3 lygių metodas** |
| GET, PATCH, DELETE | `/projects/{projectId}/tasks/{taskId}/sessions/{sessionId}` | vietoj `/sessions/{id}` |
| GET | `/tasks` | Lieka: „mano užduotys“ per visus projektus (vaizdas, ne kanoninis adresas) |
| GET | `/sessions` | Lieka: „mano darbo žurnalas“; kiekvienas elementas turi `_links.self` į kanoninį adresą |

**Šalinami:** `POST /tasks`, `GET/PATCH/DELETE /tasks/{id}`, `GET /tasks/{id}/sessions`,
`POST /sessions`, `GET/PATCH/DELETE /sessions/{id}`. Vienas resursas – vienas
kanoninis URL; mažiau paviršiaus testuoti ir ginti.

### Apimties taisyklė

- Užklausos: `task.findFirst({ where: { id: taskId, projectId } })`,
  `workSession.findFirst({ where: { id: sessionId, taskId, task: { projectId } } })`.
- Tvarka: projektas nerastas → 404; užduotis ne šio projekto → 404; sesija ne šios
  užduoties → 404; tik tada teisių patikros (`access.ts`). **404, ne 403/422** – tokiu
  adresu resurso tiesiog nėra; gynime paaiškinti.
- Pagalbinės funkcijos: `findProjectOr404`, `findTaskInProjectOr404`,
  `findSessionInTaskOr404` (vienoje vietoje, pvz. `services/scope.ts`).
- `CreateTaskInput` be `projectId`, `CreateWorkSessionInput` be `taskId` – tėvas ateina iš URL.
- `Location` antraštės – į įdėtinius adresus.

### Nuoseklumas (daroma kartu su B)

`PATCH/DELETE /proposals/{id}` → `/projects/{id}/proposals/{proposalId}`,
`DELETE /shares/{id}` → `/projects/{id}/shares/{shareId}`. `GET /proposals`
(„mano pasiūlymai“) lieka. Daroma tuo pačiu metu – kitaip gynime teks aiškinti,
kodėl vieni vaikai įdėti, o kiti ne.

**Paliečiami failai:** `routes/tasks.ts`, `routes/sessions.ts` (+ `proposals.ts`,
`shares.ts`), `@hourly/shared` schemos, `openapi.ts`, `docs/openapi.json`
(`npm run openapi:export`, CI tikrina neatitikimą), testai, Postman, README 1.4.

---

## 3. Etapas C – puslapiavimas ir filtrai visiems sąrašams

**Būsena:** atlikta (2026-09-27). Vietoj bendro `paginate()` – du maži pagalbininkai `pageArgs` / `pageOf` (`lib/pagination.ts`), nes Prisma modelių tipai bendrai funkcijai nepatogūs. Papildomai: `ShareListQuery.active`. Visos sąrašų užklausų schemos – `@hourly/shared`.

- **C1.** `lib/pagination.ts`: `paginate({ model, where, orderBy, page, perPage })` per `$transaction([findMany, count])` (kaip dabar `projects.ts`). Vokas papildomas `totalPages`.
- **C2.** `paginated()` vokas visiems sąrašams: `GET /tasks`, `/projects/{id}/tasks`, `/sessions`, `/projects/{id}/tasks/{id}/sessions`, `/proposals`, `/projects/{id}/proposals`, `/projects/{id}/shares`.
- **C3. Filtrai:**

| Sąrašas | Nauji parametrai |
|---|---|
| užduotys | `status`, `q` |
| sesijos | `from`, `to` (`startedAt` intervalas), `running=true\|false`; `GET /sessions` – dar `projectId` |
| projektai | (yra `scope`, `q`, `status`) + `origin` |
| pasiūlymai | (yra `status`) |

- **C4.** Puslapis už ribų → 200 su tuščiu `items` (dabartinis elgesys) – aprašyti README.

---

## 4. Etapas D – hypermedia (HATEOAS)

**Būsena:** atlikta (2026-09-27). Veiksmų nuorodos sprendžiamos paleidžiant maršrutų `assert*` taisykles (`allows` `lib/links.ts`). Nuorodos turi ir `GET /api`, `/auth/me`, naudotojai ir ataskaita (JSON). Peržiūros nuoroda neturi `self` (jos negalima perskaityti atskirai), bet sukūrimo atsakyme turi `public`. Postman: aplankas „1. Darbo eiga / Hypermedia“.

**Formatas** – HAL stiliaus `_links`, santykiniai adresai (veiks už Azure / Next tarpinio
maršruto):

```json
{
  "id": "…", "title": "API integracija", "status": "IN_PROGRESS",
  "_links": {
    "self":     { "href": "/api/projects/P/tasks/T" },
    "project":  { "href": "/api/projects/P" },
    "sessions": { "href": "/api/projects/P/tasks/T/sessions" },
    "update":   { "href": "/api/projects/P/tasks/T", "method": "PATCH" },
    "delete":   { "href": "/api/projects/P/tasks/T", "method": "DELETE" }
  }
}
```

- **D1.** `lib/links.ts`: `projectLinks`, `taskLinks`, `sessionLinks`, `proposalLinks`, `pageLinks(req, page, perPage, total)` → `self`, `first`, `prev`, `next`, `last` (su tais pačiais filtrais).
- **D2. Būsenos priklausomos nuorodos** – tikroji HATEOAS prasmė: veiksmų nuorodos (`update`, `delete`, `submit-proposal`, `accept`, `stop`) rodomos tik jei `access.ts` predikatai leidžia ir būsena tinka. Taisyklės nesidubliuoja – naudojamos tos pačios funkcijos.
- **D3. Įėjimo taškas** `GET /api` → nuorodos į `projects`, `tasks`, `sessions`, `proposals`, `auth`, `docs`.
- **D4.** `serialize.ts` lieka grynas; maršrutai daro `{ ...toTask(row), _links: taskLinks(row, auth) }`. Sesijų užklausos turi įtraukti `task.projectId` (`include`).
- **D5.** `@hourly/shared`: `Links` schema ir `_links` visose atsakymų schemose → OpenAPI.
- **D6.** Postman: bent vienas testas eina per `_links.next.href` ir `_links.sessions.href`, o ne per surinktą URL – demonstruoja HATEOAS klientą.

---

## 5. Etapas E – duomenys

**Būsena:** atlikta (2026-09-27). `share_links` 3 → 6, parduotuvės projektas – 5 užduotys, `task(2)` – 5 sesijos; `demo-data.json` turi `hierarchy` (projektas / užduotis / sesija ir jos URL).

- **E1.** `share_links` 3 → ≥ 6 (keli galiojantys skirtinguose projektuose + pasibaigusi + atšaukta).
- **E2.** Patikrinti, kad yra projektas su ≥ 5 užduotimis ir užduotis su ≥ 5 sesijomis – kad 3 lygių `GET` ir puslapiavimas (`perPage=2`) atrodytų prasmingai.
- **E3.** `docs/postman/demo-data.json` – eksportuoti trejetus `projectId / taskId / sessionId` įdėtiniams URL.
- `refresh_tokens` po seed tuščia – ne hierarchijos lentelė, bet gynime paminėti, kad pildoma prisijungus.

---

## 6. Etapas F – Postman

- **F1.** Trūkstami metodai: `GET /proposals`, `DELETE /proposals/{id}`, `PATCH /auth/me`, `GET /health/ready`.
- **F2.** Perrašyti į įdėtinius URL (B).
- **F3. Nauji aplankai:**
  - *Hierarchija ir apimtis* – teisingas 3 lygių `GET`; svetimo projekto užduotis → 404; svetimos užduoties sesija → 404;
  - *Puslapiavimas ir filtrai*;
  - *Hypermedia* (D6);
  - *Ribiniai atvejai* (A6);
  - *Atsijungimas* – logout → senas prieigos žetonas → 401 (G1);
  - *Masinis priskyrimas* – `PATCH /auth/me {"role":"ADMIN"}` rolės nekeičia; `register` su `ADMIN` → 422;
  - *Bandymų ribojimas* – 429 (G2), paskutinis kolekcijoje.
- **F4. Aprėpties patikra CI:** mažas skriptas lygina `docs/openapi.json` kelius su kolekcija; trūksta metodo → CI krenta. Garantuoja kriterijaus „visi prieigos taškai“ tenkinimą ir ateityje.

---

## 7. Etapas G – 2 lab. sustiprinimas

**Būsena:** G1, G2 atlikta (2026-09-27). G1: `sid` JWT; rotacija – vienoje transakcijoje, kad lygiagrečios užklausos negautų klaidingo `SESSION_REVOKED`; slaptažodžio keitimas dabartinį prisijungimą atpažįsta pagal `sid`, ne pagal slapuką. G2: prisijungimui skaičiuojamos tik nesėkmės pagal IP + el. paštą (10 / 15 min.), todėl demo galima kartoti. Postman 401 / 429 užklausos – F etape.

- **G1. Logout iškart panaikina prieigos žetoną.** Į JWT įdėti `sid` = refresh šeimos `familyId`. `authenticate` jau kiekvienai užklausai skaito naudotoją (dėl `isBlocked`) – toje pačioje užklausoje patikrinti, kad šeimoje yra nepanaikintas, nepasibaigęs žetonas; kitaip 401 `SESSION_REVOKED`. Rotacija `sid` nekeičia; pakartojimo aptikimas panaikina šeimą → ir prieigos žetonai nustoja galioti. Testai + README 5.2.
- **G2. Bandymų ribojimas:** `express-rate-limit` `/auth/login`, `/auth/register`, `/auth/refresh` → 429 su `Retry-After`. Ribos per `env.ts` (CI – aukštos). `trust proxy` jau nustatytas.
- **G3. 2FA – nedarome** (neprivaloma, +1 balas; sprendimas 2026-09-27). Gynime paminėti kaip galimą plėtinį (TOTP).
- **G4. `Secure` slapuko demonstracija:** lokaliai `http` → `COOKIE_SECURE=false`; gynime rodyti Azure (HTTPS) versiją arba DevTools su `COOKIE_SECURE=true` ant `localhost`. Paruošti atsakymą, kodėl prieiga – antraštėje, o refresh – `httpOnly` slapuke.

---

## 8. Etapas H – ataskaita ir gynimas

- **H1. README 8 skyrius** – perrašyti pagal oficialius kriterijus (su balais), kiekvienam – kur realizuota ir kuri Postman užklausa parodo. Dabartines eilutes palikti kaip „papildomai“.
- **H2. README 1.4** – nauji URL, metodų skaičius, poskyriai „Hierarchija ir apimtis“, „Puslapiavimas ir filtrai“, „Hypermedia“.
- **H3. Naujas skyrius „REST principai“:** kliento-serverio, *stateless* (JWT; sąžiningai – refresh žetonas yra serverio būsena ir kodėl tai priimtina), *cacheable* (Express `ETag` → 304; pridėti `Cache-Control: no-store` auth atsakymams ir `private` autentifikuotiems GET – mažas middleware), vienoda sąsaja (resursai, metodai, reprezentacijos, HATEOAS), sluoksniuota sistema (Next tarpinis maršrutas, Azure), *code on demand* – nenaudojama.
- **H4. DB pasirinkimas:** PostgreSQL vs MySQL / MongoDB / SQLite – ryšinė hierarchija su FK kaskadomis, daliniai unikalūs indeksai (viena vykdoma sesija, vienas priimtas pasiūlymas), `Decimal` pinigams, transakcijos. **Ryšį su bakalauriniu įrašyk pats.**
- **H5. LLM naudojimas:** kaip buvo naudojamas Claude Code (planai `docs/`, peržiūra, commit'us darai pats). Gynime LLM negalima – tai turi būti tavo žodžiai.
- **H6. `docs/cheatsheet.md`:** žemėlapis „kur kas“ (`app.ts` → `routes/*` → `services/*` → `access.ts` → Prisma), žetono kūrimas (`signAccessToken`, `lib/tokens.ts`), pasirašymas (HS256, `JWT_ACCESS_SECRET` iš `.env`), statuso kodų demonstracijos scenarijus.
- **H7. Repeticija be LLM:** pridėti naują objektą su CRUD (pvz. `Comment` prie užduoties: Prisma modelis + migracija → shared schema → maršrutas → OpenAPI → Postman), pasimatuoti laiką, po to atmesti. Žingsnių sąrašą įrašyti į cheatsheet.

---

## 9. Poveikis [planas-3.md](planas-3.md)

- „37 metodai“ ir E2 lentelė (`POST /tasks`, `/tasks/{id}/sessions`, `/sessions/{id}`) – perrašyti į įdėtinius URL ir perskaičiuoti.
- Užklausų kabliai (B4) – visi sąrašai grąžina `paginated` voką.
- `_links` gali valdyti UI: veiksmo mygtukas rodomas tik jei yra nuoroda – klientas nekartoja teisių logikos.
- `apiFetch`: nauji kodai `SESSION_REVOKED` (→ `/login`) ir 429.
- Laikmatis: veikianti sesija – `GET /sessions?running=true`, stabdymas per jos `_links.stop`.

---

## 10. Eiliškumas

Po kiekvieno žingsnio: `npm test`, `npm run lint`, `npm run typecheck`,
`npm run openapi:export`, `npm run demo`.

| # | Etapas | Apimtis | Commit'as |
|---|---|---|---|
| 1 | A | ~2 val. | *Return 4xx for malformed input instead of 500* |
| 2 | B | ~5 val. | *Scope tasks and sessions under project URLs* |
| 3 | C | ~2–3 val. | *Paginate and filter every list endpoint* |
| 4 | D | ~3–4 val. | *Add hypermedia links to API responses* |
| 5 | E | ~1 val. | *Expand seed share links and nested demo data* |
| 6 | G1, G2 | ~2 val. | *Revoke access tokens on logout and rate-limit auth* |
| 7 | F | ~3 val. | *Cover every endpoint in the Postman collection* |
| 8 | H | ~3 val. | *Map report to official lab criteria* |

B eina prieš C ir D, nes nuorodos ir puslapiavimas statomi ant galutinių URL.
Commit'us darai tu – aš paruošiu pakeitimus ir pasiūlysiu pranešimą.

---

## 11. Priimti sprendimai (2026-09-27)

| Klausimas | Sprendimas |
|---|---|
| Plokščius `/tasks/{id}`, `/sessions/{id}` šalinti ar palikti šalia įdėtinių? | Šalinti; lieka tik `GET /tasks`, `GET /sessions` kaip „mano“ vaizdai |
| Įdėti ir `proposals` / `shares` veiksmus? | Taip, dėl nuoseklumo |
| Daryti 2FA (+1)? | **Ne** – neprivaloma |
| 405 vietoj 404 nepalaikomam metodui? | Taip, kartu su B |
