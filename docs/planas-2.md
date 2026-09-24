# Darbų planas: 2 laboratorinis (autentifikacija ir autorizacija)

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md),
1 lab. planas – [planas.md](planas.md).

**Tikslas:** `X-Actor-Id` antraštę pakeisti tikra JWT autentifikacija, įvesti
rolių ir savininkiškumo patikras kiekvienam metodui, realizuoti administratoriaus
funkcijas ir visa tai parodyti per ~15 s demonstraciją.

Sprendimai, priimti prieš pradedant:

| Klausimas | Sprendimas | Kodėl |
|---|---|---|
| Prieigos žetonas | JWT, `HS256`, galioja **15 min**, grąžinamas JSON kūne, siunčiamas `Authorization: Bearer` | Trumpas galiojimas riboja nutekėjusio žetono žalą; `Bearer` – standartas (RFC 6750) |
| JWT turinys | `sub` (naudotojo id), `role`, `iat`, `exp`, `iss`, `aud` | Rolė žetone – aiškus užduoties reikalavimas; el. pašto nededame (nereikia, o JWT tik užkoduotas, ne šifruotas) |
| Atnaujinimo žetonas | **Neskaidrus** atsitiktinis 32 baitų žetonas, `httpOnly` slapuke, DB – tik `sha256` maiša, galioja 30 d. | Jo nereikia skaityti klientui, todėl JWT nereikalingas; nutekėjus DB, žetonų atkurti neįmanoma (tas pats principas kaip peržiūros nuorodose) |
| Rotacija | Kiekvienas `/auth/refresh` panaikina seną žetoną ir išduoda naują toje pačioje šeimoje (`familyId`) | Pavogtas žetonas tampa vienkartinis |
| Pakartotinis panaudojimas | Jau panaikintas žetonas → panaikinama **visa šeima** → 401 | Jei žetoną panaudojo ir vagis, ir savininkas – vienas iš jų nesąžiningas, todėl atjungiami abu |
| Atsijungimas | Panaikina šeimą, išvalo slapuką. Prieigos žetonas galioja iki savo `exp` (≤ 15 min) | Sąmoningas kompromisas – be juodojo sąrašo JWT išlieka be būsenos |
| Užblokuotas / ištrintas naudotojas | `authenticate` kiekvienai užklausai daro vieną PK paiešką (`id, isBlocked`) | Blokavimas veikia **iš karto**, o ištrinto naudotojo žetonas negali sukurti įrašų su neegzistuojančiu `clientId` |
| Rolės šaltinis | Rolė imama iš JWT; DB paieška – tik atšaukimo patikrai | Rolė nekeičiama jokiu metodu, todėl pasenusios rolės problemos nėra |
| Rolės | Svečias (be žetono), `CLIENT`, `SPECIALIST`, `ADMIN` | 4 rolės ≥ 3 reikalaujamų; `ADMIN` registracijos metu pasirinkti negalima |
| Nematomas resursas | **404**, ne 403 (pvz., svetimas `DRAFT` projektas) | Neatskleidžiama, kad resursas egzistuoja |
| Matomas, bet neleidžiamas veiksmas | **403** | Naudotojas mato resursą, bet neturi teisės jo keisti |
| `JWT_REFRESH_SECRET` | Pašalinamas iš `env.ts` | Neskaidriam žetonui paslapties nereikia; nenaudojama paslaptis tik klaidina |

> **Prielaida dėl užduoties reikalavimų.** Planas remiasi įprastais 2 lab.
> reikalavimais: žetonais grįsta autentifikacija (JWT/OAuth2), bent 3 rolės,
> rolė žetone, atnaujinimo žetonų strategija, metodų apsauga pagal roles ir
> savininkystę, 401/403 atsakymai, demonstracija. Jei oficialus sąrašas kitoks –
> pataisome 10 skyriaus lentelę prieš pradedant.

---

## 0. Išeities taškas

**Jau paruošta 1 lab. metu:**

- `User.passwordHash`, `User.isBlocked`, `Role` enum, `RefreshToken` modelis su `tokenHash`, `familyId`, `revokedAt`;
- `bcryptjs`, `jsonwebtoken`, `cookie-parser`; CORS su `credentials: true`;
- `env.ts`: `JWT_ACCESS_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`;
- `packages/shared`: `RegisterInput` (be `ADMIN`), `LoginInput`, `AuthResponse`, `CurrentUser`, `PublicUser`;
- OpenAPI: `bearerAuth` schema ir `/auth/*` aprašai;
- `src/lib/actor.ts` – vienintelė siūlė, per kurią 27 vietose paimamas naudotojas;
- `services/*` – savininkiškumo patikros (`assertCanManage`, `assertIsSessionAuthor` ir t. t.), jau grąžinančios 403;
- seed: 8 naudotojai su `bcrypt` maiša (`slaptazodis123`, kaina 12).

**Spragos, kurias rasti kode ir reikia užtaisyti:**

| # | Spraga | Kur | Pasekmė |
|---|---|---|---|
| 1 | Skaitymo metodai **visai netikrina teisių** | `GET /projects/:id`, `/projects/:id/tasks`, `/tasks/:id`, `/tasks/:id/sessions`, `/sessions/:id` | Bet kas mato svetimus `DRAFT` projektus ir darbo sesijas (IDOR) |
| 2 | Nėra rolių patikrų | `POST /projects`, `POST /projects/:id/proposals`, `POST /sessions` | Užsakovas gali teikti pasiūlymą, specialistas – kurti aikštelės projektą |
| 3 | `DELETE /projects/:id` leidžia abiem šalims | `routes/projects.ts:257` (`assertCanManage`) | Specialistas gali ištrinti užsakovo projektą |
| 4 | `ADMIN` rolė niekur nenaudojama | visur | Administratoriaus funkcijų (1.2 skyrius) nėra |
| 5 | Nėra naudotojų metodų | – | Nėra `GET /users`, profilio, blokavimo |

---

## 1. Etapas A – žetonų ir slaptažodžių pamatai

### A1. `src/lib/passwords.ts`

```
hashPassword(plain)            -> Promise<string>   // bcrypt, kaina 12
verifyPassword(plain, hash)    -> Promise<boolean>
DUMMY_HASH                                          // lyginimui, kai naudotojo nėra
```

Kai el. paštas nerastas, vis tiek kviečiamas `verifyPassword(input, DUMMY_HASH)` –
atsakymo laikas nepriklauso nuo to, ar paskyra egzistuoja (apsauga nuo naudotojų
išvardijimo pagal laiką).

### A2. `src/lib/tokens.ts`

```
signAccessToken({ id, role })  -> string
verifyAccessToken(token)       -> { sub, role }       // meta HttpError 401
newRefreshToken()              -> { token, hash }    // randomBytes(32) base64url + sha256
hashToken(token)               -> string             // bendras su services/shares.ts
```

`verifyAccessToken`:

- `algorithms: ['HS256']` – aiškiai prisegtas algoritmas (apsauga nuo `alg: none` ir algoritmo keitimo atakų);
- tikrinami `iss = 'hourly-api'`, `aud = 'hourly'`;
- `TokenExpiredError` → 401 `TOKEN_EXPIRED`, bet kas kita → 401 `INVALID_TOKEN`;
- payload tikrinamas Zod schema (`sub: uuid`, `role: Role`) – pasirašytas, bet netikėto formato žetonas vis tiek atmetamas.

### A3. `env.ts`

- pašalinti `JWT_REFRESH_SECRET` (taip pat iš `.env.example`, CI, README);
- `production` režime `JWT_ACCESS_SECRET` ≥ 32 simbolių (`superRefine`);
- nauji: `REFRESH_COOKIE_SAMESITE` (`lax` numatyta; 3 lab. Azure prireiks `none`), `COOKIE_SECURE` (numatyta `isProduction`).

### A4. Klaidų žemėlapio papildymai (`middleware/error.ts`)

| Kodas | `code` | Kada |
|---|---|---|
| 401 | `AUTH_REQUIRED` | Metodui reikia prisijungimo, žetono nėra |
| 401 | `INVALID_TOKEN` | Blogas parašas, formatas, `iss`/`aud`, naudotojas ištrintas |
| 401 | `TOKEN_EXPIRED` | Pasibaigęs `exp` – klientui ženklas kviesti `/auth/refresh` |
| 401 | `INVALID_CREDENTIALS` | Blogas el. paštas arba slaptažodis (vienodas pranešimas abiem atvejais) |
| 401 | `INVALID_REFRESH_TOKEN` | Atnaujinimo žetono nėra, jis nežinomas arba pasibaigęs |
| 401 | `REFRESH_TOKEN_REUSED` | Panaudotas jau panaikintas žetonas – šeima panaikinta |
| 403 | `FORBIDDEN` | Rolė arba savininkystė neleidžia |
| 403 | `ACCOUNT_BLOCKED` | Naudotojas užblokuotas |
| 409 | `EMAIL_TAKEN` | Registracija su užimtu el. paštu |

Visi 401 atsakymai turi `WWW-Authenticate: Bearer error="invalid_token"` (arba be
`error`, kai žetono tiesiog nėra) – to reikalauja RFC 6750. `HttpError` papildomas
neprivalomu `headers` lauku.

---

## 2. Etapas B – `/auth` metodai (`routes/auth.ts`, `services/auth.ts`)

| Metodas | Sėkmė | Elgsena |
|---|---|---|
| `POST /auth/register` | 201 | `RegisterInput`; el. paštas `trim().toLowerCase()`; užimtas → 409 `EMAIL_TAKEN`; iš karto prijungia (grąžina `AuthResponse` + slapuką); `Location: /api/users/{id}` |
| `POST /auth/login` | 200 | `LoginInput`; blogi duomenys → 401; teisingas slaptažodis, bet užblokuotas → 403 `ACCOUNT_BLOCKED` (tik po slaptažodžio patikros, kad blokavimo fakto nesužinotų svetimas) |
| `POST /auth/refresh` | 200 | Žetonas **tik iš slapuko**; rotacija (žr. žemiau); grąžina naują `AuthResponse` + naują slapuką |
| `POST /auth/logout` | 204 | Žetonas iš slapuko; panaikina šeimą; `clearCookie`. Bearer **nereikalingas** – atsijungti galima ir su pasibaigusiu prieigos žetonu. Be slapuko → vis tiek 204 (idempotentiška) |
| `GET /auth/me` | 200 | `CurrentUser` |
| `PATCH /auth/me` | 200 | `UpdateMeInput`: `displayName`, `bio`; slaptažodžio keitimas tik su `currentPassword` (blogas → 422 `INVALID_PASSWORD`), po jo panaikinamos **visos kitos** šeimos |

**Slapukas:**

```
name:     hourly_refresh
httpOnly: true           // JavaScript jo neperskaito -> XSS jo nepavogs
secure:   COOKIE_SECURE  // dev per http: false
sameSite: REFRESH_COOKIE_SAMESITE
path:     /api/auth      // nesiunčiamas su kitomis užklausomis
maxAge:   REFRESH_TOKEN_TTL_DAYS
```

**Rotacijos algoritmas (`services/auth.ts`, viena transakcija):**

```
row = findUnique({ tokenHash: sha256(cookie) })
nėra                    -> 401 INVALID_REFRESH_TOKEN
row.revokedAt != null   -> updateMany({ familyId, revokedAt: null }, revokedAt = now)
                           -> 401 REFRESH_TOKEN_REUSED
row.expiresAt <= now    -> 401 INVALID_REFRESH_TOKEN
user.isBlocked          -> 403 ACCOUNT_BLOCKED
updateMany({ id, revokedAt: null }, revokedAt = now)   // count != 1 -> lenktynės -> REUSED
create({ familyId: row.familyId, ... })                // naujas žetonas toje pačioje šeimoje
```

Sąlyginis `updateMany` su `count` patikra užtikrina, kad du lygiagretūs
`/refresh` su tuo pačiu žetonu negautų dviejų galiojančių žetonų.

Sprendimo logika iškeliama į grynąją funkciją
`classifyRefresh(row, now): 'ok' | 'unknown' | 'expired' | 'reused'`, kad ją būtų
galima testuoti be DB.

**Nauji shared tipai:** `UpdateMeInput`, `UserListQuery`, `AdminUpdateUserInput`,
`paginated(CurrentUser)`.

---

## 3. Etapas C – `authenticate` ir siūlės pakeitimas

### C1. `src/middleware/auth.ts`

```
authenticate      // globalus, prijungiamas app.ts prieš maršrutizatorius
requireRole(...r) // maršruto lygio middleware, pvz. requireRole('ADMIN')
```

`authenticate`:

1. `Authorization` antraštės nėra → `req.auth = null`, tęsiama (vieši metodai veikia);
2. yra, bet ne `Bearer <token>` arba žetonas netinkamas → **401** (netinkamas žetonas yra klaida, o ne anonimiškumas – taip nepastebimai „nenukrenti“ į svečio teises);
3. `prisma.user.findUnique({ where: { id: sub }, select: { id, isBlocked } })` – nėra → 401 `INVALID_TOKEN`, užblokuotas → 403 `ACCOUNT_BLOCKED`;
4. `req.auth = { userId: sub, role }` (tipas – `src/types/express.d.ts`).

### C2. `src/lib/actor.ts` – kaip ir žadėta 1 lab.

```ts
export function actorId(req) { return req.auth?.userId ?? null; }
export function requireActor(req) { /* nėra -> HttpError(401, 'AUTH_REQUIRED') */ }
export function actorRole(req): Role | null
export function requireRoleOf(req, ...roles): string   // 401 arba 403, grąžina id
```

`ACTOR_HEADER` ir `X-Actor-Id` logika šalinama. **27 maršrutų vietos lieka
nepakitusios** – tai ir yra 1 lab. siūlės įrodymas gynime.

### C3. `app.ts`

`app.use('/api', authenticate)` po `cookieParser()`, prieš maršrutizatorius.
`/api/health*`, `/api/public/*`, `/api/docs` veikia ir be žetono (antraštės nėra →
`req.auth = null`).

---

## 4. Etapas D – autorizacijos auditas ir rolių matrica

Principas: **skaitymo teisė** ir **rašymo teisė** – atskiros funkcijos
`services/access.ts`, kurias naudoja visi maršrutai. Nematomas resursas → 404,
matomas be teisės keisti → 403.

```
canViewProject(project, auth)   // PUBLISHED -> visi; kitaip šalys arba ADMIN
assertCanView(project, auth)    // false -> 404 NOT_FOUND
assertCanManage(project, actor) // jau yra: šalys -> kitaip 403
assertCanDeleteProject(project, auth)  // MARKETPLACE -> užsakovas; DIRECT -> specialistas; ADMIN -> visada
assertCanInspect(project, auth) // sesijos ir ataskaita: šalys arba ADMIN (ginčų sprendimas)
```

### D1. Rolių matrica

Ž: S – svečias, U – užsakovas (`CLIENT`), Sp – specialistas, A – administratorius.
„savo“ – tik projekto šalis arba resurso autorius.

| Metodas | S | U | Sp | A | Pastaba |
|---|---|---|---|---|---|
| `POST /auth/register`, `/login`, `/refresh`, `/logout` | ✓ | ✓ | ✓ | ✓ | refresh/logout – pagal slapuką |
| `GET/PATCH /auth/me` | ✗ 401 | ✓ | ✓ | ✓ | |
| `GET /users` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ | |
| `GET /users/{id}` | ✗ 401 | ✓ | ✓ | ✓ | viešas profilis (`PublicUser`) |
| `PATCH /users/{id}` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ | blokavimas; savęs – 422 |
| `DELETE /users/{id}` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ | savęs – 422 |
| `GET /projects?scope=marketplace` | ✓ | ✓ | ✓ | ✓ | |
| `GET /projects?scope=owned\|assigned` | ✗ 401 | ✓ | ✓ | ✓ | |
| `GET /projects?scope=all` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ | **naujas** – visi projektai |
| `GET /projects/{id}`, `/projects/{id}/tasks`, `/tasks/{id}` | PUBLISHED | savo / PUBLISHED | savo / PUBLISHED | ✓ | kitaip **404** (spraga 1) |
| `POST /projects` (`MARKETPLACE`) | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | spraga 2 |
| `POST /projects` (`DIRECT`) | ✗ 401 | ✗ 403 | ✓ | ✗ 403 | spraga 2 |
| `PATCH /projects/{id}` | ✗ 401 | savo | savo | ✗ 403 | |
| `DELETE /projects/{id}` | ✗ 401 | savo MARKETPLACE | savo DIRECT | ✓ | spraga 3; moderavimas |
| `GET /projects/{id}/report` | ✗ 401 | savo | savo | ✓ | |
| `GET /tasks` | ✗ 401 | ✓ | ✓ | ✓ | tik savo projektų |
| `POST/PATCH/DELETE /tasks` | ✗ 401 | savo | savo | ✗ 403 | + esamas `taskAuthoring` režimas |
| `GET /sessions` | ✗ 401 | ✓ | ✓ | ✓ | savo žurnalas |
| `GET /sessions/{id}`, `/tasks/{id}/sessions` | ✗ 401 | savo | savo | ✓ | kitaip 404 (spraga 1) |
| `POST /sessions` | ✗ 401 | ✗ 403 | savo | ✗ 403 | spraga 2 |
| `PATCH/DELETE /sessions/{id}` | ✗ 401 | ✗ 403 | autorius | ✗ 403 | |
| `GET /proposals` | ✗ 401 | ✓ | ✓ | ✓ | savo pateikti |
| `GET /projects/{id}/proposals` | ✗ 401 | savo projekto | tik savo | ✓ | |
| `POST /projects/{id}/proposals` | ✗ 401 | ✗ 403 | ✓ | ✗ 403 | spraga 2 |
| `PATCH /proposals/{id}` | ✗ 401 | priimti/atmesti | atšaukti savo | ✗ 403 | |
| `DELETE /proposals/{id}` | ✗ 401 | ✗ 403 | savo | ✗ 403 | |
| `GET/POST /projects/{id}/shares`, `DELETE /shares/{id}` | ✗ 401 | savo | savo | ✗ 403 | |
| `GET /public/projects/{token}` | ✓ | ✓ | ✓ | ✓ | žetonas = teisė |
| `GET /health`, `/health/ready` | ✓ | ✓ | ✓ | ✓ | |

Administratorius **nekeičia** svetimų projektų, užduočių ir sesijų – tik mato
(ginčams) ir šalina (moderavimui). Taip jo teisės atitinka 1.2 skyriaus sąrašą ir
nėra „dievo režimo“.

### D2. Darbų seka

1. `services/access.ts` + testai (lentelės principu – kiekviena matricos eilutė – testas);
2. spraga 1: į 5 skaitymo maršrutus įdėti `assertCanView` / `assertCanInspect`;
3. spraga 2: rolių patikros kūrimo metoduose;
4. spraga 3: `assertCanDeleteProject`;
5. `scope=all` projektų sąraše.

---

## 5. Etapas E – naudotojai ir administratorius (`routes/users.ts`)

| Metodas | Sėkmė | Elgsena |
|---|---|---|
| `GET /users` | 200 | `UserListQuery`: `q` (vardas, el. paštas), `role`, `isBlocked`, `page`, `perPage` → `paginated(CurrentUser)` |
| `GET /users/{id}` | 200 | `PublicUser` (be el. pašto); nerastas → 404 |
| `PATCH /users/{id}` | 200 | `AdminUpdateUserInput`: `isBlocked`. Užblokavus – panaikinamos visos naudotojo atnaujinimo šeimos. Blokuoti save → 422 `CANNOT_MODIFY_SELF` |
| `DELETE /users/{id}` | 204 | Save → 422. Naudotojas yra `IN_PROGRESS` projekto šalis arba turi darbo sesijų → **409** `USER_HAS_WORK_HISTORY` (kitaip kaskada ištrintų sesijas iš užsakovo ataskaitos) – tokiu atveju siūloma blokuoti |

`serialize.ts`: `toCurrentUser`, `toPublicUser` + schema testai (kaip A1 1 lab.).
`passwordHash` į jokį atsakymą nepatenka – užtikrina tai, kad serializuojama
tik per šias funkcijas.

---

## 6. Etapas F – OpenAPI (`openapi.ts`)

- pašalinti `actorHeader`, `optionalActorHeader`;
- kiekvienam apsaugotam metodui `security: bearer`; `marketplace` sąrašui ir `GET /projects/{id}` – `security: [{}, { bearerAuth: [] }]` (neprivalomas);
- naujas `securitySchemes.refreshCookie` (`apiKey`, `in: cookie`, `name: hourly_refresh`) – `/auth/refresh` ir `/auth/logout`;
- kiekvieno metodo atsakymuose – tik realiai galimi 401 / 403 (pagal D1 matricą);
- `/auth/*` aprašai pataisomi pagal B (logout be bearer, 204; register 201 + `Location`);
- nauji `/users*` aprašai;
- `info.description` – trumpas „Kaip autentifikuotis“ tekstas; Swagger UI **Authorize** mygtukas turi veikti;
- `npm run openapi:export` → `docs/openapi.json` (CI jau tikrina neatitikimą).

---

## 7. Etapas G – demonstraciniai duomenys

- papildyti seed devintu naudotoju `blokuotas@hourly.lt` (`isBlocked: true`) – 403 `ACCOUNT_BLOCKED` demonstracijai;
- seed išvalo `refresh_tokens` (idempotentiškumas);
- į `docs/postman/demo-data.json` įrašyti demonstracinių paskyrų el. paštus ir slaptažodį, kad kolekcija prisijungtų pati;
- README „Demonstracinės paskyros“ lentelę papildyti blokuotu naudotoju.

---

## 8. Etapas H – Postman / Newman demonstracija

Kolekcijos lygmenyje – `auth: bearer {{token}}`; kiekvienas aplankas nustato savo
`token` (`clientToken`, `specialistToken`, `adminToken`) prieš užklausą
(`pm.collectionVariables.set('token', ...)`). Visur, kur buvo `X-Actor-Id`, lieka
tik žetonas.

```
00 Autentifikacija
  A01 Registracija (unikalus el. paštas su {{$timestamp}})    -> 201, accessToken, Set-Cookie httpOnly
  A02 Registracija tuo pačiu el. paštu                         -> 409 EMAIL_TAKEN
  A03 Registracija su role ADMIN                               -> 422
  A04 Prisijungimas blogu slaptažodžiu                         -> 401 INVALID_CREDENTIALS
  A05 Prisijungimas: užsakovas / specialistas / admin          -> 200 (trys žetonai)
  A06 GET /auth/me                                             -> 200, role
  A07 JWT turinys (dekoduojamas testo skripte)                 -> sub, role, exp - iat = 900
  A08 Atnaujinimas                                             -> 200, naujas žetonas, naujas slapukas
  A09 Pakartotinai senas atnaujinimo žetonas                   -> 401 REFRESH_TOKEN_REUSED
  A10 Naujasis žetonas po šeimos panaikinimo                   -> 401 (šeima panaikinta)
  A11 Atsijungimas                                             -> 204, slapukas išvalytas
  A12 Užblokuoto naudotojo prisijungimas                       -> 403 ACCOUNT_BLOCKED
01 Pagrindinis scenarijus   (esami 29 žingsniai, tik su žetonais)
02 Pasiūlymai               (esamas aplankas)
03 Autorizacijos klaidos
  Z01 POST /projects be žetono                                 -> 401 + WWW-Authenticate
  Z02 Suklastotas žetonas (pakeistas payload)                  -> 401 INVALID_TOKEN
  Z03 Specialistas kuria MARKETPLACE projektą                  -> 403
  Z04 Užsakovas teikia pasiūlymą                               -> 403
  Z05 Svetimas specialistas redaguoja projektą                 -> 403
  Z06 Svetimas DRAFT projektas                                 -> 404
  Z07 Užsakovas -> GET /users                                  -> 403
04 Administratorius
  M01 GET /users                                               -> 200
  M02 Užblokuoti naudotoją                                     -> 200, isBlocked
  M03 Užblokuoto naudotojo žetonas                             -> 403 ACCOUNT_BLOCKED (iš karto)
  M04 Atblokuoti                                               -> 200
  M05 Visi projektai (scope=all)                               -> 200
  M06 Svetimo projekto sesijos (ginčas)                        -> 200
  M07 Pašalinti netinkamą projektą                             -> 204
```

Pasibaigusio žetono (`TOKEN_EXPIRED`) Newman'e nedemonstruojame (reikėtų laukti
15 min arba žinoti CI paslaptį) – jis padengiamas vitest testu, o gynime galima
parodyti su `ACCESS_TOKEN_TTL=10s`.

**Rizika:** A09 reikia siųsti **seną** slapuką. Planas – A08 testo skripte
išsaugoti seną reikšmę (`pm.cookies.get('hourly_refresh')`) ir A09 siųsti ją
rankine `Cookie` antrašte. Patikrinti, kad Newman slapukų saugykla nesiunčia
`secure` slapuko per `http` (todėl dev/CI `COOKIE_SECURE=false`).

Visa kolekcija turi išlikti ~15 s ribose (dabar 44 užklausos per ~4 s).

---

## 9. Etapas I – testai

| Failas | Ką tikrina |
|---|---|
| `lib/tokens.test.ts` | pasirašymas/patikra; `exp` praeityje → `TOKEN_EXPIRED`; `alg: none` → atmetama; kitas raktas → `INVALID_TOKEN`; blogas `aud`; payload be `role` → atmetama |
| `lib/passwords.test.ts` | maiša ≠ slaptažodis; teisingas/klaidingas palyginimas |
| `services/auth.test.ts` | `classifyRefresh` – visi 4 atvejai |
| `services/access.test.ts` | D1 matrica – lentelės principu (`it.each`) |
| `lib/serialize.test.ts` | `toCurrentUser`, `toPublicUser` atitinka schemas, nėra `passwordHash` |
| `app.test.ts` (supertest, be DB) | apsaugotas metodas be žetono → 401 + `WWW-Authenticate`; netinkamas žetonas viešame metode → 401; `/health` veikia be žetono |

Integraciniu testu su tikra DB lieka Newman kolekcija CI.

---

## 10. Etapas J – dokumentacija

1. README naujas skyrius **„Autentifikacija ir autorizacija“**:
   - žetonų srauto sekų diagrama (Mermaid): prisijungimas → užklausa → 401 `TOKEN_EXPIRED` → `/refresh` → pakartojimas;
   - rotacijos ir pakartotinio panaudojimo aptikimo schema;
   - žetonų lentelė: kur saugomas, kiek galioja, ką turi, kaip atšaukiamas;
   - D1 rolių matrica;
   - saugumo priemonių sąrašas (žr. 11 skyrių) – patogu gynime.
2. 1.4 skyriaus metodų lentelėse – stulpelis **„Rolės“**; pašalinti 1 lab. pastabą apie `X-Actor-Id`.
3. 5 skyrius (klaidos) – 401/403 kodai iš A4.
4. 6 skyrius (demonstracija) – naujos grupės.
5. 7 skyrius – 2 lab. atitikties lentelė (žr. 12 skyrių).
6. `docs/cheatsheet.md` – užklausos kelionė papildoma `authenticate` žingsniu.
7. `planas.md` 9 skyrius – nuoroda į šį planą.

---

## 11. Saugumo priemonės (gynimo atmintinė)

| Grėsmė | Priemonė |
|---|---|
| Slaptažodžių nutekėjimas iš DB | `bcrypt`, kaina 12 |
| Atnaujinimo žetonų nutekėjimas iš DB | Saugoma tik `sha256` maiša |
| XSS pavagia atnaujinimo žetoną | `httpOnly` slapukas |
| CSRF per slapuką | `SameSite`, `path=/api/auth`, CORS tik iš `WEB_ORIGIN`; `/refresh` atsakymo svetima kilmė perskaityti negali |
| Pavogtas atnaujinimo žetonas | Rotacija + šeimos panaikinimas pakartotinai panaudojus |
| Pavogtas prieigos žetonas | Galioja tik 15 min |
| `alg: none` / algoritmo keitimas | `algorithms: ['HS256']` |
| Naudotojų išvardijimas | Vienodas 401 pranešimas; `DUMMY_HASH` lyginimas; svetimi resursai – 404 |
| Užblokuotas naudotojas su galiojančiu žetonu | `authenticate` DB patikra – blokavimas veikia iš karto |
| Teisių eskalavimas registruojantis | `RegisterInput.role` – tik `CLIENT` / `SPECIALIST` |
| IDOR | `services/access.ts` kiekviename metode, D1 matrica testuose |
| *(neprivaloma)* Slaptažodžių spėliojimas | `express-rate-limit` `/auth/login` (pvz., 10/min iš IP) → 429 |

---

## 12. Darbų eiliškumas

| # | Darbas | Rezultatas | Commit'as |
|---|---|---|---|
| 1 | A1–A4 | `passwords`, `tokens`, `env`, 401/403 klaidos + testai | *Add token and password primitives* |
| 2 | B | `/auth/*` 6 metodai, rotacija, slapukas | *Add authentication endpoints with refresh rotation* |
| 3 | C | `authenticate`, `actor.ts` pakeitimas, `requireRole` | *Replace actor header with JWT authentication* |
| 4 | D | `access.ts`, spragos 1–3, `scope=all` | *Enforce role and ownership checks on every endpoint* |
| 5 | E | `/users*` 4 metodai | *Add user profile and admin moderation endpoints* |
| 6 | F | OpenAPI + `docs/openapi.json` | *Document bearer and cookie security in OpenAPI* |
| 7 | G | seed + `demo-data.json` | *Seed a blocked account for auth demo* |
| 8 | H | Postman kolekcija | *Drive demo collection with JWT and add auth scenarios* |
| 9 | J | README, cheatsheet | *Document authentication and authorization* |

Testai rašomi kartu su kiekvienu etapu, ne pabaigoje. Po 3 punkto esama Newman
kolekcija **laikinai neveiks** (ji siunčia `X-Actor-Id`) – CI bus raudonas iki 8
punkto. Jei to nenori, 3 ir 8 punktus galima sujungti į vieną commit'ą.

Commit'us darai tu – aš tik paruošiu pakeitimus ir pasiūlysiu pranešimą.

---

## 13. Reikalavimų atitikties lentelė (2 lab.)

| Reikalavimas | Kur tenkinamas |
|---|---|
| Žetonais grįsta autentifikacija | JWT `HS256`, `Authorization: Bearer` (etapai A, C) |
| Bent 3 rolės | Svečias, `CLIENT`, `SPECIALIST`, `ADMIN` |
| Rolė JWT žetone | `role` naudingojoje apkrovoje; Postman A07 |
| Atnaujinimo strategija | Neskaidrus žetonas `httpOnly` slapuke, rotacija, šeimos panaikinimas (B; Postman A08–A10) |
| Atsijungimas | `POST /auth/logout` panaikina šeimą (Postman A11) |
| Metodų apsauga pagal roles | D1 matrica, `requireRole`, `access.ts` (Postman Z03, Z04, Z07) |
| Savininkiškumo patikros | `assertCanManage`, `assertIsSessionAuthor`, … (Postman Z05, Z06) |
| 401 neautentifikuotam | Postman Z01, Z02 + `WWW-Authenticate` |
| 403 neturinčiam teisių | Postman Z03–Z05, Z07, A12, M03 |
| Administratoriaus funkcijos | `/users*`, `scope=all`, projekto šalinimas (Postman M01–M07) |
| Saugus slaptažodžių saugojimas | `bcrypt` (11 skyrius) |
| OpenAPI su saugumu | `bearerAuth`, `refreshCookie`, 401/403 kiekvienam metodui |
| ~15 s demonstracija | `npm run demo` |

---

## 14. Ką palikti 3 laboratoriniam

- Next.js klientas: prieigos žetonas **tik atmintyje** (ne `localStorage`), gavus 401 `TOKEN_EXPIRED` – vienas `/auth/refresh` ir užklausos pakartojimas; puslapio perkrovimo metu sesija atkuriama per `/auth/refresh`;
- Azure diegime API ir klientas skirtinguose domenuose → `REFRESH_COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` (dėl to šie nustatymai jau dabar keliami į `env.ts`);
- administratoriaus sritis naudos `GET /users`, `PATCH /users/{id}`, `scope=all`.
