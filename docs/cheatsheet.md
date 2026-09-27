# Kaip veikia „Hourly“ — kodo gidas

Trumpas žinynas: kuris failas ką daro ir kodėl. Skirtas skaityti atsidarius kodą
šalia. Ataskaita yra [README.md](../README.md), darbų planai — [planas.md](planas.md)
(1 lab.), [planas-2.md](planas-2.md) (2 lab.), [planas-pataisos.md](planas-pataisos.md)
(1–2 lab. pataisos) ir [planas-3.md](planas-3.md) (3 lab.). Gynimui – [10 skyrius](#10-gynimui).

---

## 1. Trys paketai

Saugykloje yra trys nepriklausomi paketai (npm workspaces):

```
apps/api         serverio pusė — Express + Prisma. Čia yra visa logika.
apps/web         kliento pusė — Next.js. Kol kas tik titulinis puslapis (3 lab.).
packages/shared  bendri duomenų aprašai, kuriuos naudoja abi pusės.
```

`packages/shared` yra „sutartis“ tarp kliento ir serverio: ten aprašyta, kaip
atrodo projektas, užduotis ar sesija. Serveris pagal tuos aprašus **tikrina**
gaunamus duomenis, klientas pagal juos **žino, ko tikėtis**, o iš jų pačių
**generuojama OpenAPI specifikacija**. Todėl dokumentacija negali prasilenkti su
realizacija: pakeitus schemą, iš karto pasikeičia ir validavimas, ir aprašas.

---

## 2. Kelionė: kas vyksta su viena užklausa

Sekime tikrą pavyzdį — specialistas paleidžia laikmatį:

```
POST /api/projects/b0000000-...-000000000001/tasks/c0000000-...-000000000002/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...   (specialisto prieigos žetonas)
{ "startedAt": "2026-09-20T09:00:00.000Z" }
```

| # | Kur | Kas vyksta |
|---|---|---|
| 1 | [server.ts](../apps/api/src/server.ts) | Programa klauso 4000 prievado |
| 2 | [app.ts](../apps/api/src/app.ts) | Bendri sluoksniai: `helmet` (saugumo antraštės), `cors`, `express.json()` (tekstas → objektas), `cookieParser` |
| 3 | [middleware/auth.ts](../apps/api/src/middleware/auth.ts) | `authenticate` patikrina žetono parašą ir galiojimą, ar paskyra neužblokuota ir ar prisijungimas (`sid`) nebaigtas, ir įrašo `req.auth = { userId, role, sessionId }` |
| 4 | [app.ts](../apps/api/src/app.ts) | Pagal adresą parenkamas maršrutizatorius — `…/tasks/:taskId/sessions` priklauso `sessionsRouter` |
| 5 | [routes/sessions.ts](../apps/api/src/routes/sessions.ts) | Maršrutas surenka duomenis ir kviečia taisykles |
| 5a | [lib/scope.ts](../apps/api/src/lib/scope.ts) | Užduotis ieškoma **projekto viduje**: kito projekto užduotis šiuo adresu → 404 |
| 6 | [services/sessions.ts](../apps/api/src/services/sessions.ts) | Tikrinamos dalykinės taisyklės ir teisės |
| 7 | [lib/prisma.ts](../apps/api/src/lib/prisma.ts) | Įrašymas į PostgreSQL |
| 8 | [lib/serialize.ts](../apps/api/src/lib/serialize.ts) | DB eilutė → atsakymo objektas |
| 9 | [lib/http.ts](../apps/api/src/lib/http.ts) | `201` + `Location` antraštė |

Jei kuriame nors žingsnyje kas nors negerai — metama klaida, ir ji **visada**
nukeliauja į vieną vietą: [middleware/error.ts](../apps/api/src/middleware/error.ts),
kuri paverčia ją vienodo formato JSON atsakymu su teisingu kodu.

Pats maršruto kodas atrodo taip (sutrumpintas tikras turinys):

```ts
sessionsRouter.post('/projects/:projectId/tasks/:taskId/sessions', async (req, res) => {
  const params = parseParams(TaskParams, req);          // adresas -> 400, jei ne UUID
  const actor = requireActor(req);                      // kas veikia -> 401, jei neprisijungęs
  const input = parseBody(CreateWorkSessionInput, req); // ką atsiuntė -> 422, jei netinka

  const task = await findTaskOr404(params);             // užduotis šiame projekte? -> 404
  assertCanViewProject(task.project, viewer(req));      // ar mato projektą -> 404
  assertProjectAcceptsWork(task.project);               // ar projektas vykdomas -> 422
  assertIsAssignedSpecialist(task.project, actor);      // ar jo darbas -> 403

  // ... laiko patikros, vienos vykdomos sesijos patikra -> 409

  const row = await prisma.workSession.create({ data: { /* ... */ } });
  created(res, `/api/projects/${task.projectId}/tasks/${task.id}/sessions/${row.id}`,
    toSession(row));                                    // 201 + Location
});
```

Atkreipkite dėmesį: **nėra nė vieno `try/catch`** ir nė vieno
`res.status(400).json(...)`. Taisyklės tiesiog meta klaidas, o Express 5 pats
perduoda jas klaidų apdorojimui.

Maršrutas žetono pats neliečia — jis tik klausia `requireActor(req)`, kas
veikia. 1 lab. ta pati funkcija skaitė `X-Actor-Id` antraštę; 2 lab. pakeistas
tik [lib/actor.ts](../apps/api/src/lib/actor.ts) vidus, o maršrutų kodas liko
toks pats.

---

## 3. Katalogų žemėlapis

### `apps/api/src/` — serverio pusė

| Kelias | Ką daro | Pavyzdys iš projekto |
|---|---|---|
| `server.ts` | Paleidžia serverį, tvarkingai jį sustabdo | `app.listen(env.PORT)` |
| `app.ts` | Surenka programą: sluoksniai, maršrutizatoriai, Swagger UI | `app.use('/api', tasksRouter)` |
| `env.ts` | Aplinkos kintamųjų tikrinimas paleidžiant | Nėra `DATABASE_URL` → programa nepasileidžia ir pasako, ko trūksta |
| `openapi.ts` | Sąsajos specifikacija visiems metodams | Iš jos gimsta `/api/docs` ir `docs/openapi.json` |
| `routes/` | **HTTP sluoksnis**: ką paimti iš užklausos, ką grąžinti | `auth.ts`, `users.ts`, `projects.ts`, `tasks.ts`, `sessions.ts`, `proposals.ts`, `shares.ts` |
| `services/` | **Dalykinės taisyklės**: kas leidžiama, kas ne | `access.ts` — kas ką mato ir gali; `sessions.ts` — trukmė, įkainis; `projects.ts` — būsenų perėjimai |
| `lib/` | **Įrankiai**, kuriuos naudoja visi maršrutai | `validate`, `scope`, `pagination`, `links`, `serialize`, `http`, `actor`, `tokens`, `rate-limit`, `passwords`, `prisma`, `csv` |
| `middleware/auth.ts` | Kas siunčia užklausą: žetono tikrinimas, `requireRole` | Blogas žetonas → 401, baigtas prisijungimas → 401 `SESSION_REVOKED`, užblokuota paskyra → 403 |
| `middleware/error.ts` | Vienintelė vieta, kur klaida virsta atsakymu; taip pat 405 | `P2025` → 404, sugadintas JSON → 400, `PUT` → 405 |
| `middleware/cache.ts` | `Cache-Control` kiekvienam atsakymui | `private, no-cache`; `/auth/*` – `no-store` |
| `tools/export-openapi.ts` | Įrašo specifikaciją į `docs/openapi.json` | `npm run openapi:export` |
| `tools/check-postman-coverage.ts` | Ar Postman kviečia visus OpenAPI metodus | `npm run postman:coverage` (CI) |

### `apps/api/prisma/` — duomenys

| Failas | Ką daro |
|---|---|
| `schema.prisma` | Duomenų modelis: lentelės, laukai, ryšiai |
| `migrations/` | SQL, kuris tą modelį sukuria duomenų bazėje. **Niekada netaisomas atgaline data** — kiekvienas pakeitimas yra nauja migracija |
| `seed.ts` | Demonstraciniai duomenys (`npm run db:seed`) |

### `packages/shared/src/` — sutartis

| Failas | Ką daro | Pavyzdys |
|---|---|---|
| `enums.ts` | Galimos reikšmės | `ProjectStatus = DRAFT \| PUBLISHED \| IN_PROGRESS \| COMPLETED \| CANCELLED` |
| `common.ts` | Bendri dalykai | `Money`, `ApiError`, puslapiavimas |
| `schemas.ts` | Kiekvieno objekto ir kiekvienos įvedimo formos aprašas | `Project`, `CreateProjectInput`, `UpdateTaskInput` |

### `docs/` ir konfigūracija

| Kelias | Ką daro |
|---|---|
| `docs/openapi.json` | Eksportuota specifikacija (CI tikrina, ar atitinka kodą) |
| `docs/postman/` | Demonstracijos kolekcija — `npm run demo` |
| `docker-compose.yml` | PostgreSQL konteineris (**5433** prievadas) |
| `.github/workflows/ci.yml` | Kas vykdoma po kiekvieno pakeitimo: lint, testai, migracijos, demonstracija |

---

## 4. Keturi sluoksniai, ir kodėl jie atskirti

### `routes/` — tik HTTP

Maršrutas neturi dalykinio mąstymo. Jis paima, ko reikia, kviečia taisykles,
kreipiasi į duomenų bazę ir grąžina atsakymą. Jei maršrute atsiranda ilgas `if`
apie tai, kas kam leidžiama — tas `if` turi keliauti į `services/`.

### `services/` — taisyklės be HTTP

Grynos funkcijos: gauna duomenis, arba praleidžia, arba meta klaidą. Jų
nedomina nei `req`, nei `res`, todėl jas galima ištestuoti be serverio ir be
duomenų bazės — visi 288 testai bėga per kelias sekundes.

```ts
// services/projects.ts — projektas negali šokinėti tarp bet kokių būsenų
export const ALLOWED_STATUS_TRANSITIONS = {
  DRAFT:       ['PUBLISHED', 'CANCELLED'],
  PUBLISHED:   ['CANCELLED'],          // -> IN_PROGRESS tik priimant pasiūlymą
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
};
```

| Failas | Svarbiausia taisyklė |
|---|---|
| `services/projects.ts` | Būsenų perėjimai, biudžeto rėžiai, kas gali valdyti projektą |
| `services/tasks.ts` | Kas sudaro užduočių sąrašą (`taskAuthoring`), kas tvirtina |
| `services/sessions.ts` | Trukmės skaičiavimas, įkainio paveldėjimas, kas gali žymėti laiką |
| `services/proposals.ts` | Pasiūlymų gyvavimo ciklas: kas priima, kas atsiima |
| `services/shares.ts` | Žetonų generavimas ir galiojimas |
| `services/report.ts` | Valandų ir sumų skaičiavimas |
| `services/access.ts` | Kas mato projektą (kitaip 404) ir kas gali jį keisti, šalinti, kurti (kitaip 403) |
| `services/auth.ts` | Atnaujinimo žetono įvertinimas: galioja, nežinomas, pasibaigęs ar pakartotas |
| `services/users.ts` | Administratorius neblokuoja savęs; naudotojo su darbo istorija šalinti negalima |

### `lib/` — įrankiai

| Failas | Atsako į klausimą | Ką grąžina blogu atveju |
|---|---|---|
| `validate.ts` | Ar atsiųsti duomenys tinkami? | `parseParams`/`parseQuery` → **400**, `parseBody` → **422**; NUL simbolis bet kur → 400/422 |
| `scope.ts` | Ar vaikas tikrai šio tėvo? (`/projects/A/tasks/B`) | **404**, jei B ne projekto A užduotis |
| `pagination.ts` | Kaip suskaidyti sąrašą puslapiais? | — (`pageArgs`, `pageOf`) |
| `links.ts` | Kokias `_links` nuorodas rodyti? | — (veiksmai tik tie, kuriuos maršrutas priimtų) |
| `rate-limit.ts` | Ar per daug bandymų? | **429** + `Retry-After` |
| `serialize.ts` | Kaip DB eilutė virsta atsakymu? | — (kartu apsaugo, kad neišeitų slapti laukai) |
| `http.ts` | Kaip atrodo sėkmė? | `created()` → 201 + `Location`, `noContent()` → 204 |
| `actor.ts` | Kas atlieka veiksmą? | **401**, jei neprisijungęs; **403**, jei netinka rolė |
| `tokens.ts` | Kaip pasirašyti ir patikrinti JWT? | **401** `INVALID_TOKEN` arba `TOKEN_EXPIRED` |
| `passwords.ts` | Kaip saugoti slaptažodį? | — (`bcrypt`, kaina 12) |
| `secure-token.ts` | Kaip sukurti atsitiktinį žetoną ir jo maišą? | — (atnaujinimo žetonai ir peržiūros nuorodos) |
| `refresh-cookie.ts` | Kaip nustatyti ir išvalyti atnaujinimo slapuką? | — |
| `prisma.ts` | Kaip pasiekti duomenų bazę? | — |
| `csv.ts` | Kaip suformuoti CSV failą? | — |

### `middleware/error.ts` — klaidų vertėjas

Viena funkcija, kuri atpažįsta klaidos tipą ir parenka kodą:

| Klaida | Kodas |
|---|---|
| `ZodError` (netinka schemai) | 422 `VALIDATION_ERROR` |
| `HttpError` (mūsų pačių mesta) | koks nurodytas |
| Sugadintas JSON | 400 `MALFORMED_JSON` |
| Prisma `P2025` (įrašo nėra) | 404 |
| Prisma `P2002` (unikalumo pažeidimas) | 409 |
| Prisma `P2003` (nėra susijusio įrašo) | 422 |
| Prisma `P2020` (skaičius netelpa į stulpelį) | 422 |
| Express klaida su 4xx statusu (pvz., neiškoduojamas adresas) | tas pats 4xx (`MALFORMED_URL`) |
| Visa kita | 500 (priežastis niekada neatskleidžiama) |

---

## 5. Duomenų modelis

```
Projektas ──< Užduotis ──< Darbo sesija
    │
    ├──< Pasiūlymas        (valdo aikštelės projekto gyvavimo ciklą)
    └──< Peržiūros nuoroda (leidžia skaityti be paskyros)
```

Vidurinis lygmuo — ne vien struktūra. **Įkainis** nurodomas projekte, bet
užduotis gali jį perrašyti, todėl sesijos vertė skaičiuojama pagal artimiausią
nurodytą įkainį:

```ts
// services/sessions.ts
resolveAppliedRate(taskRate, projectRate) => taskRate ?? projectRate
```

Ir svarbiausia detalė: įkainis įrašomas į sesiją **ją užbaigiant** ir vėliau
nebeperskaičiuojamas. Todėl pakeitus projekto įkainį jau atliktų darbų vertė
nepasikeičia.

### Du daliniai unikalūs indeksai

Duomenų bazėje (žr. migraciją) yra dvi taisyklės, kurių programa viena
užtikrinti negali:

| Indeksas | Ką draudžia |
|---|---|
| `work_sessions_one_open_per_specialist` | Turėti dvi neužbaigtas sesijas vienu metu |
| `proposals_one_accepted_per_project` | Priimti du pasiūlymus tam pačiam projektui |

Programa šias situacijas irgi tikrina — bet tik tam, kad grąžintų aiškų
pranešimą. **Tikrąją garantiją duoda duomenų bazė**, nes tik ji apsaugo, kai dvi
užklausos ateina tuo pačiu metu.

---

## 6. Trys taisyklės, kurių laikomasi visame kode

**1. Skaičiuojamų reikšmių klientas atsiųsti negali.** `durationMinutes` ir
`appliedRate` net nėra įvedimo schemoje — juos nustato serveris. Kitaip valandų
apskaita nebūtų verta pasitikėjimo.

**2. `undefined` ir `null` — skirtingi dalykai.** `PATCH` rašo tik tuos laukus,
kurie **yra** kūne:

```ts
if (input.deadline !== undefined) {
  data.deadline = input.deadline === null ? null : new Date(input.deadline);
}
```

Atsiuntus `{"status":"PUBLISHED"}` biudžetas nedingsta, o atsiuntus
`{"deadline":null}` terminas sąmoningai išvalomas.

**3. Klaidos metamos, o ne grąžinamos.** Bet kurioje vietoje galima
`throw new HttpError(404, 'NOT_FOUND', ...)`, ir atsakymas susiformuos pats.

---

## 7. „Noriu pakeisti X — kur eiti?“

| Noriu… | Failas |
|---|---|
| pridėti naują lauką objektui | `packages/shared/src/schemas.ts` + `prisma/schema.prisma` + nauja migracija + `lib/serialize.ts` |
| pakeisti, kas kam leidžiama | `services/access.ts` (projektai ir jų turinys), kiti `services/*.ts` |
| pridėti naują metodą | naujas maršrutas `routes/*.ts` + aprašas `openapi.ts` |
| pakeisti klaidos kodą | `middleware/error.ts` arba ta vieta, kur metamas `HttpError` |
| pakeisti demonstracinius duomenis | `prisma/seed.ts` |
| papildyti demonstraciją | `docs/postman/hourly.postman_collection.json` |
| pridėti aplinkos kintamąjį | `env.ts` + abu `.env.example` |

---

## 8. Komandos

| Komanda | Ką daro |
|---|---|
| `npm run db:up` | Pakelia PostgreSQL konteinerį |
| `npm run db:migrate` | Pritaiko migracijas |
| `npm run db:seed` | Įrašo demonstracinius duomenis (pakartojama) |
| `npm run dev` | Paleidžia viską: bendrus tipus, API ir internetinę aplikaciją |
| `npm run dev:api` | Tik API (`localhost:4000`) |
| `npm run demo` | Postman demonstracija per Newman (~18 s, reikia `db:seed`) |
| `npm run postman:coverage` | Ar kolekcija kviečia visus OpenAPI metodus |
| `npm run test` | 288 vienetiniai ir integraciniai testai |
| `npm run lint` | Statinė analizė |
| `npm run openapi:export` | Atnaujina `docs/openapi.json` |
| `npm run db:studio` | Duomenų peržiūra naršyklėje |

Adresai: `localhost:4000/api/health` (būsena), `localhost:4000/api/docs`
(Swagger UI), `localhost:3000` (internetinė aplikacija).

---

## 9. Kas dar bus

| Darbas | Kas keisis |
|---|---|
| 3 lab. — naudotojo sąsaja | `apps/web` — puslapiai, komponentai, stiliai. API jau paruoštas: prieigos žetonas laikomas atmintyje, o gavus 401 `TOKEN_EXPIRED` kviečiamas `/auth/refresh`; mygtukai rodomi pagal `_links` |

---

## 10. Gynimui

### Klausimas → kur atsakymas

| Klausimas | Trumpai | Kur |
|---|---|---|
| Kur aprašomi keliai? | Kiekvienas resursas – savo `Router`; visi prijungiami `app.ts` po `/api` | [routes/](../apps/api/src/routes), [app.ts](../apps/api/src/app.ts) |
| Kur vykdomos su užklausa susijusios operacijos? | Maršrutas: validuoja → randa (`lib/scope.ts`) → tikrina taisykles (`services/`) → rašo per Prisma → serializuoja | 2 skyrius čia |
| Kokie REST principai ir kur? | Klientas–serveris, stateless (JWT), cacheable (`Cache-Control`, `ETag` → 304), vienoda sąsaja (URI, metodai, kodai, `_links`), sluoksniuota sistema | README 1.5 |
| Kodėl PostgreSQL, kokios alternatyvos? | Reliacinė hierarchija, kaskados, transakcijos, `numeric` pinigams, **daliniai unikalūs indeksai** | README 3 skyrius |
| Kokia žetono struktūra? | `header.payload.signature`, base64url. Mūsų payload: `sub`, `role`, `sid`, `iat`, `exp`, `iss`, `aud` | README 5.1 |
| Kur sukuriamas žetonas? | `signAccessToken` ([tokens.ts:54](../apps/api/src/lib/tokens.ts:54)), kviečiamas iš `issueTokens` ([auth.ts:38](../apps/api/src/routes/auth.ts:38)) | |
| Ar pasirašomas, kuo, kur raktas? | Taip, `HS256` (HMAC-SHA256, [tokens.ts:29](../apps/api/src/lib/tokens.ts:29)); raktas `JWT_ACCESS_SECRET` iš `.env`, tikrinamas `env.ts` (gamyboje ≥ 32 simboliai) | |
| Kur tikrinamas? | `authenticate` ([middleware/auth.ts:53](../apps/api/src/middleware/auth.ts:53)) → `verifyAccessToken` ([tokens.ts:76](../apps/api/src/lib/tokens.ts:76)) | |
| Kodėl rolė žetone? | Serveris žino rolę be DB paieškos; klientas gali rodyti sąsają pagal rolę. Rolės pakeisti negalima – pasikeistų parašas | |
| Kaip galima / negalima nulaužti? | Negalima: pakeisti turinio (parašas), `alg: none` ar kitas algoritmas (prisegtas `HS256`), panaudoti po atsijungimo (`sid`). Galima: perrinkti **silpną** raktą neprisijungus – todėl ilgas atsitiktinis raktas; pavogti žetoną (XSS) – todėl jis atmintyje ir galioja 15 min. | `tokens.test.ts` |
| Kaip perduodamas? | Prieigos – `Authorization: Bearer`; atnaujinimo – slapukas `httpOnly`, `Secure` (gamyboje), `SameSite=Lax`, `Path=/api/auth` | [refresh-cookie.ts](../apps/api/src/lib/refresh-cookie.ts) |
| Antraštė ar slapukas? | Antraštė: nėra CSRF, veikia bet kuriam klientui, bet JS turi laikyti žetoną (XSS rizika). Slapukas `httpOnly`: JS nepasiekiamas, bet siunčiamas automatiškai (CSRF → `SameSite`, `Path`) | README 5.1 |
| Apsauga nuo injekcijų? | Prisma – parametrizuotos užklausos (vienintelis „raw“ – `SELECT 1`); Zod atmeta netinkamus tipus ir **išmeta nežinomus laukus** | `lib/validate.ts` |
| Apsauga nuo teisių eskalacijos? | Registracijoje `ADMIN` negalimas; `PATCH /auth/me` ignoruoja `role`; `requireRole`; nuosavybės patikros `services/access.ts`; svetimas – 404 | Postman „0. / PATCH /auth/me“, „3. Rolės ir teisės“ |
| Kitos grėsmės | Brute force → 429; XSS / clickjacking → `helmet` antraštės; CSRF → `SameSite`, CORS tik `WEB_ORIGIN`; slaptažodžiai → `bcrypt` | README 5.4 |

### Statuso kodų demonstracija (Postman)

| Kodas | Užklausa |
|---|---|
| 201 + `Location` | „1. / POST /projects“ |
| 204 | „1. / DELETE … atšaukti nuorodą“, „5. Valymas“ |
| 304 | „1. / Podėlis / Pakartotinis skaitymas“ |
| 400 | „2. / netaisyklingas id“, „2. / Ribiniai atvejai / NUL simbolis“ |
| 401 | „2. / be prieigos žetono“, „0. / Prieigos žetonas po atsijungimo“ (`SESSION_REVOKED`) |
| 403 | „3. / Specialistas kuria aikštelės projektą“, „4. / Užblokuotojo žetonas“ |
| 404 | „2. / nesamas projektas“, „2. / Apimtis / Svetimo projekto užduotis“, „3. / svetimas juodraštis“ |
| 405 | „2. / Apimtis / Nepalaikomas metodas“ |
| 406 | „2. / neprieinamas turinio tipas“ |
| 409 | „1. / antra vykdoma sesija“ |
| 422 | „2. / netinkamas turinys“, „1. / priimto šalinti negalima“ |
| 429 | „6. Bandymų ribojimas“ |

### Repeticija: naujas objektas su CRUD be LLM

Pavyzdys – **komentaras prie užduoties**
(`/projects/{projectId}/tasks/{taskId}/comments[/{commentId}]`). Pasimatuok laiką,
po to pakeitimus atmesk (`git stash` arba `git checkout .`).

1. `prisma/schema.prisma`: modelis `Comment` (`id`, `taskId`, `authorId`, `body`, `createdAt`, `updatedAt`), ryšys `Task.comments`, `onDelete: Cascade`.
2. `npm run db:migrate --workspace apps/api -- --name add-comments` – nauja migracija.
3. `packages/shared/src/schemas.ts`: `Comment`, `CreateCommentInput`, `UpdateCommentInput`, `CommentListQuery = PageQuery`; `npm run build --workspace packages/shared`.
4. `lib/serialize.ts`: `toComment`.
5. `lib/scope.ts`: `CommentParams = TaskParams.extend({ commentId })`, `findCommentOr404` (ieškoti `where: { id, taskId, task: { projectId } }`).
6. `routes/comments.ts`: `GET` sąrašas (`pageArgs`/`pageOf`), `GET` vienas, `POST` (`created` + `Location`), `PATCH`, `DELETE` (`noContent`). Teisės: skaityti – `assertCanInspectProject`, keisti / trinti – tik autorius (`403`).
7. `app.ts`: pridėti `commentsRouter` į `routers` masyvą (405 veiks savaime).
8. `openapi.ts`: aprašyti kelius; `npm run openapi:export`.
9. Postman: bent po užklausą kiekvienam metodui; `npm run postman:coverage` turi praeiti.
10. Patikrinti: `npm run typecheck`, `npm test`, `npm run demo`.
