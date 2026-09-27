# Kaip veikia „Hourly“ — kodo gidas

Trumpas žinynas: kuris failas ką daro ir kodėl. Skirtas skaityti atsidarius kodą
šalia. Ataskaita yra [README.md](../README.md), darbų planai — [planas.md](planas.md)
(1 lab.) ir [planas-2.md](planas-2.md) (2 lab.).

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
| 3 | [middleware/auth.ts](../apps/api/src/middleware/auth.ts) | `authenticate` patikrina žetono parašą ir galiojimą, patikrina, ar paskyra neužblokuota, ir įrašo `req.auth = { userId, role }` |
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
| `lib/` | **Įrankiai**, kuriuos naudoja visi maršrutai | `validate`, `serialize`, `http`, `actor`, `tokens`, `passwords`, `prisma`, `csv` |
| `middleware/auth.ts` | Kas siunčia užklausą: žetono tikrinimas, `requireRole` | Blogas žetonas → 401, užblokuota paskyra → 403 |
| `middleware/error.ts` | Vienintelė vieta, kur klaida virsta atsakymu | `P2025` → 404, sugadintas JSON → 400 |
| `tools/export-openapi.ts` | Įrašo specifikaciją į `docs/openapi.json` | `npm run openapi:export` |

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
duomenų bazės — visi 276 testai bėga per kelias sekundes.

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
| `validate.ts` | Ar atsiųsti duomenys tinkami? | `parseParams`/`parseQuery` → **400**, `parseBody` → **422** |
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
| Visa kita | 500 (gamyboje priežastis neatskleidžiama) |

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
| `npm run demo` | Postman demonstracija per Newman (~11 s, reikia `db:seed`) |
| `npm run test` | 233 vienetiniai testai |
| `npm run lint` | Statinė analizė |
| `npm run openapi:export` | Atnaujina `docs/openapi.json` |
| `npm run db:studio` | Duomenų peržiūra naršyklėje |

Adresai: `localhost:4000/api/health` (būsena), `localhost:4000/api/docs`
(Swagger UI), `localhost:3000` (internetinė aplikacija).

---

## 9. Kas dar bus

| Darbas | Kas keisis |
|---|---|
| 3 lab. — naudotojo sąsaja | `apps/web` — puslapiai, komponentai, stiliai. API jau paruoštas: prieigos žetonas laikomas atmintyje, o gavus 401 `TOKEN_EXPIRED` kviečiamas `/auth/refresh` |
