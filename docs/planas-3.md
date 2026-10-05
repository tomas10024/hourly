# Darbų planas: 3 laboratorinis (naudotojo sąsaja ir diegimas)

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md),
ankstesni planai – [planas.md](planas.md), [planas-2.md](planas-2.md),
[planas-pataisos.md](planas-pataisos.md).

**Tikslas:** Next.js klientas, kuriuo galima panaudoti **visus 41** API
metodus, kuris tenkina oficialius 3 lab. kriterijus (10 balų), yra įdiegtas
Azure (ir API, ir klientas) ir kurį galima apginti.

**Versija 3 (2026-10-05).** Pridėta: vizualinė kryptis „Resend × Watch Dogs“
(5 skyrius), ataskaitos (inžinerinio projekto) kriterijai (1 ir 11 skyriai),
vieta UI „skill'ams“. API po 2 versijos nesikeitė – vis dar 41 operacija.

**Versija 2 (2026-09-27).** Planas perrašytas po 1–2 lab. pataisų ir gavus
oficialius 3 lab. kriterijus. Kas pasikeitė – 0 skyriuje.

---

## 0. Kas pasikeitė nuo pirmos plano versijos

### API (pataisų pasekmės klientui)

| Pokytis | Ką tai reiškia klientui |
|---|---|
| Įdėtiniai URL: `/projects/{p}/tasks/{t}/sessions/{s}`, `/projects/{p}/proposals/{id}`, `/projects/{p}/shares/{id}` | Užklausų kabliai statomi ant naujų adresų; plokščių `/tasks/{id}`, `/sessions/{id}` nebėra |
| 41 operacija (buvo 37) | Nauji: `GET /api`, `GET /health/ready`, `GET …/proposals/{id}`, `POST /projects/{p}/tasks` |
| Visi sąrašai – vokas `{ items, page, perPage, total, totalPages, _links }` + filtrai | Viena `Pagination` komponentė, filtrai URL parametruose |
| `_links` su veiksmais pagal rolę ir būseną | **Mygtukai rodomi pagal nuorodas** – klientas nekartoja teisių logikos; veiksmas vykdomas per `follow(link)` |
| Sesija turi `projectId` | Laikmatį galima sustabdyti iš „mano žurnalo“ be papildomos užklausos (`_links.stop`) |
| 401 `SESSION_REVOKED` | Kitas kodas nei `TOKEN_EXPIRED`: ne atnaujinti, o išmesti į `/login` |
| 429 su `Retry-After` | Prisijungimo formoje – pranešimas „bandykite po N min.“ |
| `Cache-Control: private, no-cache` + `ETag` | Tarpinis maršrutas turi persiųsti `If-None-Match` / `ETag`; naršyklė pati gaus 304 |
| Bandymų ribojimas pagal IP | **Už Next tarpinio maršruto ir Azure visi naudotojai atrodys kaip vienas IP** – reikia `X-Forwarded-For` ir `TRUST_PROXY` (B6) |

### Oficialūs kriterijai prieš seną planą

| Kriterijus | Senas planas | Dabar |
|---|---|---|
| Paveiksliukai, kurių dydis kinta su langu | Sąmoningai **atsisakyta** („be iliustracijų“) | **Reikia** – F etapas |
| Modaliniai langai kūrimo / redagavimo / šalinimo formoms | Dalis formų – atskiri puslapiai (`/app/projects/new`) | Visos 3 objektų kūrimo ir redagavimo formos bei visi šalinimai – modaluose |
| Ikonėlės meniu punktuose | Tik „SVG ikonos“ bendrai | Kiekvienas meniu punktas (šoninė juosta, hamburger, naudotojo meniu) – su ikona |
| Header ir footer | Programos makete footer'io nebuvo | Plona poraštė ir programos makete |
| Grįžtamasis ryšys be `alert` | `Toast` buvo, bet ne kaip reikalavimas | Aiški politika (G2) |
| Sąsaja naudoja **visus** metodus | 37 metodų lentelė | 41 operacijos lentelė (E5) |
| Duomenys JSON, ne HTML | – | Visi duomenys gaunami naršyklėje per JSON API (sprendimas žemiau) |
| Publikavimas: backend ir frontend po balą | Buvo | Diegiama **anksti** (H etapas eina po B, ne pabaigoje) |

Ankstesnės užduoties reikalavimai (wireframe'ai, `768px` lūžio taškas, Google
Fonts, įvairūs įvedimo elementai, skirtingi Header / Content / Footer stiliai)
lieka – jie neprieštarauja oficialiems kriterijams.

---

## 1. Kriterijai → sprendimas

| Kriterijus (balai) | Kaip tenkinsime | Etapas |
|---|---|---|
| **Sąsaja leidžia panaudoti visus API metodus (2)** | | |
| ↳ CRUD 3 objektams per sąsają | Projektas, užduotis, darbo sesija: sąrašas, peržiūra, kūrimas, redagavimas, šalinimas | E |
| ↳ registracija, prisijungimas, žetonų atnaujinimas | `AuthProvider`; tylus `/auth/refresh` perkrovus puslapį ir gavus `TOKEN_EXPIRED` | B |
| ↳ ≥ 4 skirtingi įvedimo elementai | `text`, `email`, `password`, `textarea`, `number`, `date`, `datetime-local`, `search`, `select`, `radio` kortelės, `checkbox`, jungiklis (switch) | C, E |
| ↳ duomenys JSON, ne HTML | API grąžina tik JSON (ir CSV ataskaitą); klientas duomenis gauna naršyklėje per `fetch` → JSON | B |
| ↳ visi metodai | 41 operacija → langas (E5 lentelė); `npm run ui:coverage` (J) | E, J |
| **Paveiksliukai, SVG ikonos, header / footer, modalai (2)** | | |
| ↳ paveiksliukai, kurių dydis kinta | `next/image` su `fill` + `sizes`, konteineris su `aspect-ratio` | F |
| ↳ ikonėlės meniu | `lucide-react` (įterptinis SVG) visuose meniu | C, D |
| ↳ modalai formoms | `Dialog` (natūralus `<dialog>`): kūrimas, redagavimas, šalinimo patvirtinimas | C, E |
| ↳ header ir footer | Keturi maketai su skirtingais header / footer | D |
| **Animacijos (1)** | Krovimo skeletai ir sukutis, `hover` perėjimai, modalo / stalčiaus / pranešimo animacijos – visos `@keyframes` viename faile | G |
| **Vientisa sąsaja ir CSS (2)** | | |
| ↳ vientisa paletė ir stilistika | Dizaino žetonai (CSS kintamieji) `globals.css` `@theme` | C |
| ↳ logiškas išdėstymas | Wireframe'ai prieš kodą; vienodas puslapio karkasas (antraštė → veiksmai → turinys) | A, D |
| ↳ nestandartinis šriftas | Instrument Serif, Inter, Geist Mono per `next/font/google` (`latin-ext` – lietuviškos raidės) | C |
| ↳ grįžtamasis ryšys be `alert` | Pranešimai (toast), klaidos prie laukų, mygtukų būsenos, patvirtinimo modalai; `alert()` / `confirm()` draudžiami lint taisykle | G |
| **Responsive (1)** | Lūžio taškas `md` = `48rem` (768px), apibrėžtas **vienoje vietoje** `@theme`; hamburger + stalčius mobiliajame | C, D |
| **Publikavimas (2)** | API ir klientas – Azure App Service, DB – PostgreSQL Flexible Server; CI/CD iš GitHub | H |

### Inžinerinis projektas (ataskaita, 10 balų)

| Kriterijus (balai) | Dabar | Ką daryti | Etapas |
|---|---|---|---|
| **Struktūra, formatavimas, turinys, be DI šlamšto (3)** | README turi savo struktūrą (paleidimas, auth, klaidos…), ne dėstytojo šabloną | README pertvarkyti pagal šabloną (I1); dabartinius 4–7 skyrius perkelti į priedus arba `docs/`. Tekstą peržiūri ir sutrumpina **tu** – ilgi „LLM stiliaus“ pastraipų blokai yra tiesioginė rizika | I |
| **Diegimo diagrama, UML, ne PlantUML (2)** | `docs/deployment-diagram.jpg` rodo Static Web Apps | Perpiešti UML įrankiu (Cameo – jį turi; arba draw.io / StarUML): mazgai `<<device>>` naršyklė, `<<executionEnvironment>>` App Service ×2, PostgreSQL Flexible Server; artefaktai; ryšiai su protokolais (HTTPS, TLS) | H, I |
| **Sąsajos ekranvaizdžiai ir ≥ 3 wireframe'ai „su Figma ar kitu įrankiu“ (2)** | Nėra | 10 wireframe'ų (A) – SVG piešiu aš; „Figma ar kitas įrankis“ dalies **sąmoningai nepaisome** (sprendimas 2026-10-05) + ekranvaizdžiai šalia | A, I |
| **OpenAPI su pavyzdžiais ir galimais rezultatais, skaitomu formatu (2)** | 41 operacija; užklausos pavyzdžiai – tik 6, atsakymų pavyzdžiai – 32; tik `docs/openapi.json` | Pavyzdžiai **kiekvienai** operacijai (užklausa + kiekvienas statusas); šablonas reikalauja **atskiro `api-spec.yaml`**; `npm run openapi:md` → `docs/api.md` (GitHub jį atvaizduoja) + Swagger UI įdiegtame API | I |
| **Išvados – sunumeruotos, „kas iš to“ (1)** | Nėra | Aš paruošiu faktų sąrašą (skaičiai, sprendimai, kas pasiteisino / ne), **išvadas rašai tu** | I |

### Gynimo klausimai → kur atsakymas

| Klausimas | Kur parodyti |
|---|---|
| Kodėl Next.js, alternatyvos | 2 sk. „Karkasas“, README |
| Karkaso architektūra, kur būsena | App Router maketai; `lib/auth.tsx`, `lib/queries/*`, URL parametrai |
| Kaip įtraukti šriftai | `src/app/fonts.ts` → `layout.tsx` → `globals.css` `@theme` |
| CSS animacija, kur kodas | `src/styles/animations.css` (ir glitch, 5 sk.) |
| Lūžio taškas, pakeisti | `@theme --breakpoint-md` |
| Kodėl SVG, šaltinis | `lucide-react` (npm), `components/ui/logo.tsx`, `public/illustrations/*.svg` |

---

## 2. Sprendimai

| Klausimas | Sprendimas | Kodėl |
|---|---|---|
| Karkasas | **Next.js 16** (App Router, React 19) – jau projekte | Vienas TypeScript projektas su API ir `@hourly/shared`; maketai, maršrutai, `next/font`, `next/image` iš dėžės; tarpinis maršrutas leidžia `httpOnly` slapuką laikyti toje pačioje kilmėje. Alternatyvos gynimui – 11 skyriuje |
| Kur gaunami duomenys | **Naršyklėje** (Client Components + TanStack Query) iš JSON API | Kriterijus „JSON, ne HTML“; prieigos žetonas yra tik naršyklės atmintyje, tad serveris jo ir neturi. Server Components – tik statiniam karkasui ir tituliniam puslapiui |
| Būsena | Serverio duomenys – TanStack Query podėlis; sesija – `AuthProvider` (React Context); filtrai ir puslapis – URL parametrai; formos – vietinė būsena | Kiekviena būsena ten, kur jai vieta; URL būsena išlieka perkrovus ir dalinantis nuoroda |
| Vizualinis stilius | **Resend × Watch Dogs**: Resend – karkasas (juoda, erdvė, tipografikos hierarchija, ploni rėmeliai); Watch Dogs 2 (DedSec) ir 1 (ctOS) – akcentai (neoninės spalvos, glitch, pikselinės etiketės, HUD rėmeliai, terminalo tekstas). Plačiau – 5 skyrius | Resend vienas atrodo „kaip kiekvienas SaaS“; Watch Dogs suteikia charakterį, o Resend neleidžia jam virsti triukšmu |
| Ko nekopijuojame | Resend logotipo, pavadinimo, iliustracijų, licencijuotų šriftų; Ubisoft / Watch Dogs logotipų, DedSec kaukės ir kaukolės, žaidimo ekrano nuotraukų, šriftų, garsų | Prekės ženklai ir autorių teisės. Imama tik estetika: spalvos, formos, judesys |
| Paveiksliukai | **Mūsų pačių programos ekrano nuotraukos** (WebP) tituliniame, funkcijų ir prisijungimo puslapiuose; tuščių būsenų ir 404 iliustracijos – SVG | Autentiški, be licencijų klausimų; *patvirtinti – 12 sk.* |
| Ikonos | `lucide-react` | Įterptinis SVG, `currentColor`, vienodas stilius |
| Šriftai | `next/font/google`: Instrument Serif (antraštės), Inter (tekstas), Geist Mono (skaičiai, laikmatis, terminalas), **Tiny5** (pikselinės etiketės; Silkscreen atmestas – C etapas) | Parsisiunčiami kompiliuojant ir tiekiami iš savo domeno – be užklausų į Google, be „šokinėjimo“ |
| Stiliai | Tailwind CSS v4 + CSS kintamieji; animacijos – `src/styles/animations.css` | Viena vieta žetonams, lūžio taškui ir animacijoms – lengva parodyti ir pakeisti gynime |
| Komponentai | Savi `src/components/ui/*`, be shadcn / Radix | Mažiau priklausomybių; `<dialog>` duoda `Esc`, fokusą ir `::backdrop` |
| Formos | Natūralūs `<form>` + Zod schemos iš `@hourly/shared`; 422 `details` → klaida prie lauko | Tos pačios taisyklės kliente ir serveryje |
| Veiksmai | Pagal `_links`: mygtukas rodomas tik jei yra nuoroda, vykdomas per `follow(link, body)` | HATEOAS klientas; nėra antros teisių kopijos |
| Maršrutų apsauga | `src/proxy.ts` (Next 16 pavadinimas): `/app/**` be `hourly_refresh` slapuko → `/login?next=…` | Greitas nukreipimas; tikra patikra – API |
| Diegimas | Azure App Service (Linux, Node 22) – du app'ai viename plane; PostgreSQL Flexible Server | Studento kreditas; Static Web Apps rezervuoja `/api` – konfliktas su tarpiniu maršrutu |
| Kada diegti | **Anksti** – po B etapo „vaikščiojantis skeletas“ | Diegimo problemos (slapukai, IP, migracijos) paaiškėja, kol dar yra laiko |

---

## 3. Etapas A – wireframe'ai (prieš kodą)

**Būsena:** atlikta (2026-10-05). 10 SVG failų `docs/wireframes/01–10-*.svg`,
kiekviename – 1280px ir 390px kadrai bei pastabos (API metodai, įvedimo
elementai, elgsena < 768px). Generuojami `python docs/wireframes/generate.py` –
pakeitus ką nors langų sąraše, perpiešiami visi.

`docs/wireframes/*.svg` (piešiu aš, tiesiogiai SVG), žema
detalė, be spalvų ir efektų (Watch Dogs – tik realizacijoje), kiekvienas langas **dviem pločiais**
(≥ 768px ir 375px), kad lūžio taškas matytųsi projekte.

| # | Langas | Pastabos |
|---|---|---|
| W1 | Titulinis `/` | Header, hero su ekrano nuotrauka, 3 funkcijos su nuotraukomis, rolės, CTA, footer |
| W2 | Prisijungimas / registracija | Kortelė + nuotrauka šone (mobiliajame paslepiama) |
| W3 | Aikštelė `/projects` | Paieška, filtrai, kortelės, puslapiavimas |
| W4 | Viešas projektas + pasiūlymo modalas | |
| W5 | Programos karkasas `/app` | Šoninė juosta su ikonomis; mobiliajame – hamburger stalčius |
| W6 | Projekto darbo aplinka | Skirtukai: užduotys, pasiūlymai, nuorodos, ataskaita, nustatymai |
| W7 | Užduoties šoninis skydelis + sesijų sąrašas | |
| W8 | Darbo žurnalas + laikmatis + rankinio įvedimo modalas | |
| W9 | Administratoriaus sritis | Naudotojų lentelė, blokavimo modalas |
| W10 | Modalai | Kūrimo / redagavimo forma, šalinimo patvirtinimas, „nuoroda rodoma tik kartą“ |

README bus rodomi šalia realizacijos nuotraukų.

---

## 4. Etapas B – duomenų sluoksnis ir autentifikacija

**Būsena:** atlikta (2026-10-05). Patikrinta gyvai per tarpinį maršrutą
(`curl` ir naršyklė, API su `ACCESS_TOKEN_TTL=10s`): prisijungimas, sesijos
atkūrimas perkrovus, 3 lygiagrečios užklausos su pasibaigusiu žetonu → **vienas**
`/auth/refresh` → 3 pakartojimai, `SESSION_REVOKED`, CSV su `Content-Disposition`,
304, `HEAD`, 405 su `Allow`, Swagger UI per `/api/docs/`. API: 295 testai.

**Nukrypimai nuo žemiau aprašyto plano:**

- **Sesijos žymė vietoj `hourly_refresh` patikros.** Atnaujinimo slapukas turi
  `path=/api/auth`, todėl naršyklė jo nesiunčia į `/app/**` – `proxy.ts` jo
  nemato. Tarpinis maršrutas atkartoja jo galiojimą į `hourly_signed_in=1`
  (`path=/`, `httpOnly`, be paslapties): nustato išdavus atnaujinimo žetoną,
  išvalo API jį išvalius (`lib/session-marker.ts`).
- **`[[...path]]` vietoj `[...path]`** – kad `follow()` pasiektų ir `GET /api`.
- **`restoreSession()`** – visos užklausos laukia pirmojo atkūrimo po puslapio
  įkėlimo: vaikų užklausos startuoja anksčiau nei `AuthProvider` efektas ir be
  šito gaudavo 401.
- **Web Lock** (`navigator.locks`) atnaujinimui – kelios kortelės dalijasi
  slapuku; vienu metu atnaujinusios, antroji būtų palaikyta pakartotiniu
  panaudojimu ir atjungtų visas.
- **`unavailable` būsena** – API nepasiekiama ≠ svečias (kitaip `/login` ir
  `proxy.ts` mėtytų naudotoją ratu, nes žymė dar yra).
- Pasibaigus sesijai (`SESSION_REVOKED`, `ACCOUNT_BLOCKED`) klientas iškviečia
  `/auth/logout`, kad išsivalytų slapukas ir žymė.
- **304:** Node `fetch`, gavęs `If-None-Match`, prideda `Cache-Control: no-cache`,
  o Express tada niekada neatsako 304 – tarpinis maršrutas nustato `max-age=0`.
- **`skipTrailingSlashRedirect: true`** – Next nuimdavo `/` nuo `/api/docs/`, o
  Swagger UI uždėdavo atgal (begalinis ratas).
- **`X-Forwarded-For`** persiunčiamas tik su `FORWARD_CLIENT_IP=true` (Azure);
  lokaliai klientas galėtų pats pasirinkti adresą. API `TRUST_PROXY`: 1 lokaliai,
  2 Azure.
- Dev serveris peržiūros įrankyje: `tsx watch` per `run-p` neužsikuria, API
  tikrinimui paleistas atskirai (`npx tsx src/server.ts`); `.claude/launch.json`
  – tik web peržiūrai.

### B1. Tarpinis maršrutas `src/app/api/[...path]/route.ts`

| Kryptis | Persiunčiamos antraštės |
|---|---|
| Į API | `authorization`, `content-type`, `cookie`, `accept`, `if-none-match`, **`x-forwarded-for`** (papildyta kliento IP) |
| Į naršyklę | `content-type`, `set-cookie`, `x-robots-tag`, **`location`, `content-disposition`, `cache-control`, `etag`, `www-authenticate`, `retry-after`, `allow`, `ratelimit`, `ratelimit-policy`** |

Taip pat `HEAD`, 304 be kūno, `API_URL` iš aplinkos.

### B2. `src/lib/auth.tsx` – `AuthProvider`

- būsena: `accessToken` (tik atmintyje), `user`, `status: loading | authenticated | guest`;
- įkeliant – `POST /auth/refresh` → `GET /auth/me`; nesėkmė → `guest`;
- `login`, `register`, `logout`; `logout` išvalo Query podėlį;
- nukreipimas į `/login?next=…` gavus `SESSION_REVOKED`, `REFRESH_TOKEN_REUSED`, `INVALID_REFRESH_TOKEN`.

### B3. `src/lib/api.ts`

- `Authorization: Bearer` iš `AuthProvider` (modulio „getter“);
- 401 `TOKEN_EXPIRED` → **vienas** bendras `/auth/refresh` (lygiagrečios užklausos laukia to paties pažado) ir pakartojimas;
- 401 `SESSION_REVOKED` → `guest` + pranešimas „Prisijungimas baigėsi“;
- 429 → `ApiRequestError` su `retryAfter` sekundėmis;
- 204 ir ne-JSON atsakymai; `apiDownload()` CSV ataskaitai (vardas iš `Content-Disposition`);
- `follow(link, body?)` – vykdo `_links` veiksmą (`href` be `/api`, `method`).

### B4. `src/lib/queries/*`

Po failą resursui (`projects`, `tasks`, `sessions`, `proposals`, `shares`, `users`,
`auth`, `root`): užklausų raktų gamyklos, `useXxx` / `useXxxMutation`,
invalidacija po mutacijų. Bendri tipai `Page<T>`, `Links` iš `@hourly/shared`.

### B5. `src/proxy.ts` – maršrutų apsauga

`/app/**` be `hourly_refresh` → `/login?next=…`; `/login`, `/register` su
slapuku → `/app`. **Prieš rašant perskaityti**
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

### B6. API pakeitimai diegimui

- `TRUST_PROXY` (šuolių skaičius) `env.ts` vietoj `app.set('trust proxy', 1)`: naršyklė → Azure (web) → Next → Azure (API) → API. Kitaip bandymų ribojimas visus naudotojus laikys vienu IP.
- Testas: `X-Forwarded-For` su dviem adresais → `req.ip` yra kliento.

---

## 5. Etapas C – dizaino sistema („Resend × Watch Dogs“)

**Būsena:** atlikta (2026-10-05). Visi komponentai su visomis būsenomis –
`/ui` puslapyje (tik kūrimo režime; `?open=dialog|confirm|left|right` atidaro
modalą). Patikrinta 1280px ir 390px pločiais (CDP ekrano nuotraukos):
be horizontalaus slinkimo, lentelė < 768px virsta kortelėmis, modalas –
apatiniu lapu, šoniniai skydeliai per visą aukštį.

| Failas | Turinys |
|---|---|
| `src/app/fonts.ts` | 4 šriftai per `next/font/google`, `latin-ext` |
| `src/app/globals.css` | Žetonai `@theme`: spalvos, spinduliai, šešėlis, lūžio taškai; `.label`, `.heading-display`, `.tabular` |
| `src/styles/animations.css` | **Visos** animacijos: glitch, HUD kampai, skeletas, blokų juosta, gyvas taškas, dialogų atidarymas / uždarymas (`@starting-style`), pranešimai, `prefers-reduced-motion` |
| `src/lib/use-scramble.ts` | „Iššifravimas“ (vienintelis efektas su JS) |
| `src/components/ui/*` | `Button`/`ButtonLink`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioCards`, `Badge` + būsenų ženkleliai, `RoleSticker`, `Card`, `KeyValues`, `DataTable`, `Tabs`, `Dialog`, `Drawer`, `ConfirmDialog`, `DropdownMenu`, `ToastProvider`/`useToast`, `EmptyState`/`PixelArt`, `Spinner`/`Skeleton`/`BlockProgress`, `Pagination`, `CopyField`, `Logo`, `Scramble` |
| `src/lib/errors.ts` | API klaidos → lietuviški sakiniai (pagal kodą, tada statusą; 429 – „po N min.“) |

**Nukrypimai nuo žemiau aprašyto plano:**

- **Tiny5 vietoj Silkscreen.** Silkscreen deklaruoja `latin-ext`, bet neturi
  Ą Č Ę Ė Į Ų Ū Ž (tik Š) – etiketės „PALETĖ“, „TUŠČIOS“ buvo surinktos iš
  dviejų šriftų. Išbandyta 11 pikselinių Google šriftų; pilną abėcėlę turi VT323,
  Pixelify Sans, Tiny5, Micro 5, Jersey 10, Press Start 2P, Handjet, Doto.
  Tiny5 – artimiausias Silkscreen stiliui.
- **Du lūžio taškai:** `md` (48rem) – vienintelis sąsajos lūžio taškas
  (hamburger, lentelės → kortelės, modalas → apatinis lapas); `lg` (64rem) –
  tik trečiam kortelių stulpeliui. Kiti Tailwind lūžio taškai išjungti
  (`--breakpoint-*: initial`).
- **Dialogų uždarymo animacija** – grynu CSS (`@starting-style`,
  `transition-behavior: allow-discrete`), be JS laikmačių; atidarius dialogą
  puslapis po juo neslenka (`body:has(.dialog[open])`).
- **`DataTable`** – lentelė ir kortelių sąrašas abu atvaizduojami, `md:` parenka
  vieną (be lango matavimo JS).
- ESLint `no-alert: error` – `alert/confirm/prompt` draudžiami jau dabar (G2).
- Nauja priklausomybė: `lucide-react`.

### C0. Kryptis ir dozavimo taisyklės

**Pasirinkta 1 tema** iš [nuotaikos lentos](https://claude.ai/artifact/BWiM1SZvXc3k6DSTyeew9F)
(2026-10-05). Lentos CSS – atskaitos taškas žetonams, glitch, HUD kampams ir
scramble realizuoti; „dozės“ perjungiklis į programą **nekeliamas**.

**Pagrindas – Resend, prieskonis – Watch Dogs.** Be taisyklių hibridas virsta
„geimerišku“ triukšmu, todėl:

1. **~90 % ekrano – Resend:** juodas fonas, pilkas tekstas, ploni rėmeliai, daug erdvės. Akcentinių spalvų – ne daugiau ~5–10 % ploto.
2. **Viena akcentinė spalva komponente.** Rožinė – veiksmas ir „gyva“ būsena, žydra – informacija ir duomenys, geltona – įspėjimas.
3. **Glitch – tik kaip įvykis:** užvedus pelę, atidarant / uždarant, kraunant. Niekas nemirga nuolat (išskyrus veikiančios sesijos tašką).
4. **Skaitomumas svarbiau už stilių:** pagrindinis tekstas, formos ir lentelės – Inter, be efektų. Pikselinis šriftas – tik trumpoms etiketėms didžiosiomis raidėmis.
5. **`prefers-reduced-motion`** išjungia visus glitch ir scramble efektus.

Kas iš kurios dalies:

| Šaltinis | Ką imame |
|---|---|
| Resend | Maketai, tipografikos skalė, serifinė antraštė, kortelės, lentelės, mygtukų forma, tuščios erdvės ritmas |
| Watch Dogs 2 (DedSec) | Neoninė rožinė / žydra / geltona ant juodos, RGB poslinkio glitch, pikselinės etiketės, „lipdukų“ ženkleliai, ASCII / pikselinės iliustracijos |
| Watch Dogs 1 (ctOS) | HUD kampų rėmeliai, „Profiler“ informacinės kortelės, ploni duomenų linijų tinkleliai, terminalo eilutės |

### C1. Žetonai (`src/app/globals.css`, `@theme`)

| Žetonas | Reikšmė | Paskirtis |
|---|---|---|
| `--color-bg` / `--color-fg` | `#000000` / `#f0f0f0` | Resend |
| `--color-muted` | `#a1a4a5` (kontrastas su juodu 8.4:1) | Antrinis tekstas |
| `--color-surface`, `--color-border` | `rgba(255,255,255,.03)`, `rgba(255,255,255,.08)` → hover `.14` | Kortelės, rėmeliai |
| **`--color-hack`** | `#ff2e88` (neoninė rožinė) | Pagrindinis veiksmas, fokusas, veikianti sesija, glitch kanalas |
| **`--color-data`** | `#00e5ff` (žydra) | Nuorodos, skaičiai, HUD rėmeliai, glitch kanalas |
| **`--color-warn`** | `#f5ff3b` (rūgštinė geltona) | Įspėjimai, 429, baigiasi nuorodos galiojimas |
| Būsenų spalvos | juodraštis / TODO – pilka; paskelbtas / laukia – žydra; vykdoma – rožinė (pulsuoja); atlikta / priimta – žalia `#3dff9a`; atmesta / užblokuota – raudona `#ff4d4d` | Ženkleliai: 10 % fonas, 30 % rėmelis, 100 % tekstas |
| `--radius-button` / `--radius-card` | `16px` / `20px`; HUD elementams – `0` | Resend apvalumas + ctOS kampai |
| **`--breakpoint-md`** | **`48rem`** – vienintelis lūžio taškas, keičiamas čia | |

Kontrastas su juodu fonu: rožinė 6.0:1, raudona 6.4:1, žydra 13.7:1, geltona ir
žalia > 15:1 – visos tenkina WCAG AA (≥ 4.5:1). Tekstas ant akcentinio fono
(pvz., rožinis mygtukas) – juodas.

### C2. Šriftai (`src/app/fonts.ts`)

`next/font/google`, `subsets: ['latin', 'latin-ext']`, `display: 'swap'`, CSS
kintamieji → `@theme`:

| Kintamasis | Šriftas | Kur |
|---|---|---|
| `--font-serif` | Instrument Serif | H1–H2 (Resend) |
| `--font-sans` | Inter | Visas tekstas, formos, lentelės |
| `--font-mono` | Geist Mono | Laikmatis, sumos, ID, terminalo eilutės, pranešimai |
| `--font-pixel` | ~~Silkscreen~~ **Tiny5** | Etiketės (`// PROJEKTAI`), ženkleliai, skirtukai, 404 |

Visi keturi turi `latin-ext` (patikrinta Google Fonts CSS). **Pikseliniams
šriftams `latin-ext` dar negarantuoja visų glifų** – C etapo pradžioje vizualiai
patikrinti `ĄČĘĖĮŠŲŪŽ ąčęėįšųūž`; jei Silkscreen trūksta – VT323 arba
Pixelify Sans (abu `latin-ext`).

### C2a. Watch Dogs elementai

| Elementas | Kur | Kaip (CSS) |
|---|---|---|
| **Glitch** (RGB poslinkis) | Logotipas, pagrindiniai mygtukai užvedus pelę, 404 antraštė, modalo atidarymas | `::before` / `::after` su `content: attr(data-text)`, `clip-path: inset()` juostos, `translate` ir `--color-hack` / `--color-data` šešėliai; `@keyframes glitch` 200–300 ms |
| **Teksto „iššifravimas“** (scramble) | Puslapio antraštė ir skaičiai, kai ateina duomenys | Mažas `useScramble` kablys: simboliai `▓▒░<>/#` per ~400 ms „nusistovi“ į tikrą tekstą. **Animacija duomenų grąžinimo metu** |
| **HUD kampų rėmeliai** (ctOS) | Užvedus pelę ant kortelės / eilutės; fokusas | Keturi kampai per `background` gradientus (be papildomų elementų), `transition` 150 ms |
| **Blokų progreso juosta** | Krovimas, ataskaitos generavimas | `▓▓▓▓░░░░` – `steps()` animacija, Geist Mono |
| **Terminalo pranešimai** | `Toast` | `> projektas_sukurtas [OK]` – mono, kairėje spalvota juosta; tekstas lietuviškai |
| **„Profiler“ kortelė** (WD1) | Naudotojo profilis, pasiūlymo autorius, administratoriaus lentelės išskleidimas | Mono etiketės: `ROLĖ`, `ĮKAINIS`, `VALANDOS`, `NARYS NUO`; plona žydra linija iki avataro |
| **Skenavimo linijos** | Ekrano nuotraukos tituliniame ir prisijungime | `repeating-linear-gradient` perdanga + `mix-blend-mode` duotone |
| **Pikselinės / ASCII iliustracijos** | Tuščios būsenos, 404 („SIGNALAS PRARASTAS“), `/p/[token]` antraštė | Savi SVG (`shape-rendering: crispEdges`) |
| **„Lipdukų“ ženkleliai** | Rolės (užsakovas / specialistas / admin), projekto kilmė | Pasukti ±2°, pikselinis šriftas, ryški spalva – vienintelė vieta, kur leidžiama „žaismė“ |
| **Laikmatis kaip HUD** | Viršutinė juosta, darbo žurnalas | Didelis Geist Mono, kampų rėmelis, pulsuojantis rožinis taškas, `REC` etiketė |

Glitch `@keyframes` – kartu su kitomis `src/styles/animations.css`, scramble –
`src/lib/use-scramble.ts`, kad gynime būtų viena vieta parodyti.

### C2b. UI „skill'ai“

Planas nustato kryptį, žetonus ir taisykles; konkrečią išvaizdą tobulins
skill'ai, kuriuos pridėsi. Jie naudojami **C etape** (komponentai) ir **po E**
(peržiūra / „redesign“). Jau įdiegti ir tinkami: `design-taste-frontend`,
`high-end-visual-design`, `redesign-existing-projects`; iš dalies –
`industrial-brutalist-ui` (terminalo estetika). Jei skill'as siūlo ką nors,
kas prieštarauja C0 taisyklėms ar kriterijams (pvz., `localStorage` žetonui,
`alert`) – pirmenybė planui.

### C3. Komponentai `src/components/ui/`

`Button` (primary / secondary / ghost / danger, `loading` būsena su sukučiu),
`Field` (etiketė + klaida iš 422), `Input`, `Textarea`, `Select`, `Checkbox`,
`Switch`, `RadioCards`, `Badge`, `Card`, `Table` (mobiliajame → kortelės),
`Tabs`, **`Dialog`**, **`ConfirmDialog`**, **`Drawer`**, `DropdownMenu`,
**`Toast`**, `EmptyState`, `Skeleton`, `Spinner`, `Pagination`, `CopyField`,
`Logo` (savas SVG).

---

## 6. Etapas D – maketai

**Būsena:** atlikta (2026-10-05). Patikrinta 1280px ir 390px pločiais
(prisijungus specialiste, užsakovu ir administratoriumi): šoninė juosta ir
mobilusis stalčius, naudotojo meniu, laikmačio piliulė, marketingo hamburger
skydelis, 404 programos rėmelyje, atsijungimas → `/`, `/p/*` antraštės.

| Failas | Turinys |
|---|---|
| `app/(marketing)/layout.tsx` + `components/layout/marketing-*` | Lipni permatoma antraštė (rėmelis atsiranda slenkant), meniu su ikonomis, < 768px – išslenkantis skydelis; poraštė su stulpeliais ir API būsena |
| `app/(auth)/layout.tsx` + `login`, `register` | Tik logotipas; forma + vaizdas šone (≥ md); viena eilutė apačioje |
| `app/app/layout.tsx` + `components/layout/app-shell.tsx` | Šoninė juosta 240px, viršutinė juosta (skilties pavadinimas, laikmatis, naudotojo meniu), plona poraštė; < 768px – hamburger + `Drawer` iš kairės; apsauga kliente |
| `components/layout/app-nav.ts` | Meniu punktai **iš `GET /api` `_links`** – klientas nekartoja rolių taisyklių |
| `app/p/[token]/layout.tsx` | „Tik skaitymui“ juosta, „Sukurta su Hourly“; `noindex` ir `Referrer-Policy: no-referrer` (meta + HTTP antraštės, J2) |
| `app/not-found.tsx`, `app/error.tsx`, `app/app/not-found.tsx`, `app/app/error.tsx`, `app/app/[...rest]` | 404 „Signalas prarastas“ (programoje – su meniu), klaidos ekranas su „Bandyti dar kartą“ (Next 16 – `retry`, ne `reset`) |
| `lib/format.ts` (J3), `lib/use-now.ts`, `lib/next-path.ts` | Lietuviškas formatavimas, `datetime-local` ↔ UTC; laikrodis; saugus `?next=` |
| `components/layout/states.tsx` | `PageHeader`, `LoadingState`, `ErrorState` – E etapo puslapiams |

**Nukrypimai nuo plano:**

- **Prisijungimo ir registracijos formos padarytos D etape** (plane – E1): be jų
  nebuvo kaip patikrinti programos maketo. Su `NEXT_PUBLIC_DEMO_MODE=true` –
  demonstracinių paskyrų mygtukai (J5).
- **Viršutinės juostos pavadinimas – aktyvaus meniu punkto** („Projektai“), o
  konkretaus įrašo pavadinimas – puslapio antraštėje (kaip W6 wireframe'e).
- **„Aikštelė“ programoje – `/app/marketplace`** (viešoji – `/projects`), kad
  prisijungęs naudotojas neišeitų iš programos rėmelio.
- **Svečio būsena turi priežastį** (`logout` / `expired`): po atsijungimo –
  į `/`, pasibaigus sesijai – į `/login?reason=…`.
- 404 kodas mirga kas 3 s (`glitch-loop`) – vienintelė nuolatinė glitch vieta.
- Laikini puslapiai (bus perrašyti E etape): titulinis, `/app` apžvalga, `/p/[token]`.

| Maketas | Kam | Header | Content | Footer |
|---|---|---|---|---|
| `(marketing)` | `/`, `/projects`, `/projects/[id]` | Lipni, permatoma su `backdrop-blur`; navigacija su ikonomis; mobiliajame – hamburger | `max-w-6xl`, didelės sekcijų paraštės | Stulpeliai (produktas, ištekliai, paskyra), API būsena (`/health/ready`) |
| `(auth)` | `/login`, `/register` | Tik logotipas | Kortelė + ekrano nuotrauka šone (≥ md) | Viena eilutė |
| `app` | `/app/**` | Viršutinė juosta: puslapio pavadinimas, veikiantis laikmatis, naudotojo meniu (ikonos) | Šoninė juosta 240px (ikonos) + turinys | Plona: versija, API būsena, nuoroda į `/api/docs` |
| `public-share` | `/p/[token]` | „Tik skaitymui“ juosta, galiojimo laikas | Suvestinė + užduotys | „Sukurta su Hourly“ |

**< 768px:** šoninė juosta → hamburger + `Drawer`; marketingo navigacija →
išskleidžiamas meniu; lentelės → kortelės; skirtukai – horizontaliai slenkami.

---

## 7. Etapas E – puslapiai ir visi metodai

**Būsena:** atlikta (2026-10-05) – E1–E6, kartu ir E3 laikmatis. `next build`
sėkmingas (21 maršrutas), tsc / lint švarūs, API – 295 testai. Patikrinta
tikrame Chrome (CDP ekrano nuotraukos) su specialisto, užsakovų ir
administratoriaus paskyromis; per sąsają iki galo išbandyta: projekto
sukūrimas (modalas) → užduotis → rankinė sesija (`datetime-local` 09:00 →
grįžta 09:00) → projekto šalinimas; laikmačio paleidimas / sustabdymas;
peržiūros nuorodos sukūrimas (rodoma kartą); pasiūlymo pateikimas (409 →
lietuviškas pranešimas modale). Testų sukurti įrašai ištrinti.

| Kelias | Failai |
|---|---|
| `/`, `/projects`, `/projects/[id]`, `/p/[token]` | `app/(marketing)/*`, `app/p/[token]/page.tsx`, `components/marketing/product-shot.tsx`, `components/domain/{marketplace,project-card,proposal-dialog,project-tasks-list,user-name}.tsx` |
| `/app` (pagal rolę), `/app/marketplace`, `/app/projects` | `app/app/page.tsx`, `app/app/{marketplace,projects}/page.tsx`, `components/domain/project-form-dialog.tsx` |
| `/app/projects/[id]` | `components/workspace/*`: užduočių lentelė + filtrai, užduoties skydelis su sesijomis, pasiūlymai (detalės + sprendimai), nuorodos (vienkartinis rodymas), ataskaita (JSON + CSV), nustatymai (redagavimas, būsenos, šalinimas) |
| `/app/sessions`, `/app/sessions/[p]/[t]/[s]` | `components/domain/{timer-card,session-list,session-form-dialog}.tsx` |
| `/app/proposals`, `/app/settings`, `/app/users/[id]`, `/app/admin/{users,projects}` | atitinkami `page.tsx` |

**Nukrypimai nuo plano:**

- **Mygtukai ir skirtukai – tik pagal `_links`.** Projekto skirtukai
  (Pasiūlymai, Nuorodos, Ataskaita, Nustatymai), užduoties veiksmai
  (pradėti laikmatį, patvirtinti, redaguoti, šalinti), sesijos (sustabdyti),
  pasiūlymo (priimti / atmesti / atsiimti / šalinti), nuorodos (atšaukti).
  Tas pats `/app/projects/[id]` tinka visoms rolėms ir pašaliniui iš aikštelės.
- **Filtrai, skirtukas, atidaryta užduotis ir pasiūlymas – URL parametruose**
  (`?tab=proposals&proposal=…`, `?task=…`, `?q=&status=&page=`): išlieka
  perkrovus, nuoroda veda tiesiai į būseną. `lib/use-url-filters.ts`.
- **Pavadinimai sąrašuose** (užduoties, projekto sesijų žurnale) – iš dviejų
  sąrašo užklausų (`GET /tasks?perPage=100`, `GET /projects?perPage=100`), ne po
  užklausą eilutei; naudotojų vardai – `GET /users/{id}` su podėliu.
- **API klaidų kodai išversti** (`lib/errors.ts`, 20+ kodų), o 422 lauko
  klaidos rodomos lietuviškai prie lauko (`formErrors`) – API tekstai angliški.
- **Paveiksliukai kol kas CSS** (`ProductShot`) – F etape bus pakeisti tikromis
  ekrano nuotraukomis tame pačiame rėmelyje.
- `_links` negarantuoja, kad nebus 409 (pvz., pasiūlymas jau pateiktas) – tai
  aprašyta API; klientas rodo pranešimą.
- Abi sveikatos operacijos naudojamos: vieša poraštė – `GET /health`, programos – `GET /health/ready`.

### E1. Vieši puslapiai

| Kelias | Turinys |
|---|---|
| `/` | Hero + ekrano nuotrauka, 3 funkcijos su nuotraukomis, rolės, CTA |
| `/projects` | Aikštelė: paieška (`search`), būsena ir kilmė (`select`), puslapiavimas |
| `/projects/[id]` | Projektas ir užduotys; specialistui – **„Pateikti pasiūlymą“ modalas** (jei yra `_links['submit-proposal']`) |
| `/p/[token]` | Vieša peržiūra; `noindex`, `Referrer-Policy: no-referrer` |
| `/login`, `/register` | Registracijoje rolė – `RadioCards`; 429 → „bandykite po N min.“ |

### E2. Programa (`/app`)

Šoninė juosta (ikonos): **Apžvalga · Projektai · Aikštelė · Pasiūlymai ·
Darbo žurnalas · Paskyra**; administratoriui – **Naudotojai · Visi projektai**.
Punktai sudaromi iš `GET /api` `_links` (įėjimo taškas).

| Kelias | Turinys |
|---|---|
| `/app` | Apžvalga: veikianti sesija, savaitės valandos ir uždarbis (`GET /sessions?from=…`), naujausios užduotys |
| `/app/projects` | Skirtukai „Mano“ / „Vykdomi“; **„Naujas projektas“ – modalas** |
| `/app/projects/[id]` | Skirtukai: Užduotys · Pasiūlymai · Nuorodos · Ataskaita · Nustatymai |
| ↳ Užduotys | Sąrašas su filtrais; **kūrimo ir redagavimo modalai**; būsenos keitimas; patvirtinimas; šalinimo patvirtinimas |
| ↳ Užduoties skydelis (`Drawer`) | Užduotis ir jos sesijos (3 lygių adresas); **sesijos kūrimo / redagavimo modalas**; šalinimas |
| ↳ Pasiūlymai | Priimti / atmesti (patvirtinimo modalas); pasiūlymo detalės |
| ↳ Nuorodos | **Sugeneruoti → modalas „nuoroda rodoma tik kartą“**; filtras aktyvios / neaktyvios; atšaukti |
| ↳ Ataskaita | Lentelė pagal užduotis; „Parsisiųsti CSV“ |
| ↳ Nustatymai | **Redagavimo modalas**; paskelbti, užbaigti, atšaukti (pagal `_links`); „pavojaus zona“ – šalinimas |
| `/app/sessions` | Darbo žurnalas: laikotarpis (`date`), „tik vykdomos“ (`Switch`); **rankinio įvedimo modalas** (`datetime-local`) |
| `/app/sessions/[projectId]/[taskId]/[sessionId]` | Sesijos detalės |
| `/app/proposals` | Savo pasiūlymai, būsenos filtras; atsiimti, šalinti |
| `/app/settings` | Vardas, aprašymas, slaptažodžio keitimas (modalas); atsijungti |
| `/app/users/[id]` | Viešas profilis |
| `/app/admin/users` | Lentelė, paieška, rolės ir blokavimo filtrai; blokuoti / atblokuoti, šalinti (modalai) |
| `/app/admin/projects` | Visi projektai (`scope=all`); šalinti |

### E3. Laikmatis

Viršutinėje juostoje – veikianti sesija (`GET /sessions?running=true`), `mm:ss`
monospace, pulsuojantis taškas. „Pradėti“ → užduoties pasirinkimas (`GET /tasks`,
`select`) → `POST …/tasks/{t}/sessions`; „Sustabdyti“ → `follow(_links.stop, { endedAt })`.
409 → pranešimas su nuoroda į veikiančią sesiją.

### E4. Klaidos ir tuščios būsenos

| Atsakymas | Rodymas |
|---|---|
| 422 | Klaida prie lauko |
| 409 | Pranešimas su paaiškinimu |
| 403 / 404 | `not-found.tsx` / „Neturite teisės“ puslapis |
| 401 `SESSION_REVOKED` | Į `/login` su pranešimu |
| 429 | „Per daug bandymų, bandykite po N min.“ |
| 502 `API_UNREACHABLE` | Juosta viršuje |
| Tuščias sąrašas | `EmptyState` su SVG iliustracija ir veiksmu |
| Kraunama | `Skeleton` |

### E5. Visų 41 operacijos panaudojimas

| Operacija | Kur |
|---|---|
| `GET /` | Šoninės juostos punktai (`_links`) |
| `GET /health`, `GET /health/ready` | Poraštės API būsenos taškas |
| `POST /auth/register`, `/login`, `/refresh`, `/logout` | Registracija, prisijungimas, tylus atnaujinimas, atsijungimas |
| `GET`, `PATCH /auth/me` | Paskyra |
| `GET /projects` (`marketplace`, `owned`, `assigned`, `all`) | Aikštelė, „Mano projektai“, administratorius |
| `POST /projects`; `GET`, `PATCH`, `DELETE /projects/{id}` | Naujo projekto modalas; projekto puslapis; nustatymai |
| `GET /projects/{id}/report` (JSON ir CSV) | Ataskaitos skirtukas |
| `GET /tasks` | Apžvalga, laikmačio užduoties pasirinkimas |
| `GET`, `POST /projects/{p}/tasks`; `GET`, `PATCH`, `DELETE …/tasks/{t}` | Užduočių skirtukas ir skydelis |
| `GET /sessions` | Darbo žurnalas, apžvalga, laikmatis |
| `GET`, `POST …/tasks/{t}/sessions`; `GET`, `PATCH`, `DELETE …/sessions/{s}` | Užduoties skydelis, sesijos detalės, laikmatis |
| `GET /proposals` | „Mano pasiūlymai“ |
| `GET`, `POST /projects/{p}/proposals`; `GET`, `PATCH`, `DELETE …/proposals/{id}` | Projekto puslapis (modalas), pasiūlymų skirtukas |
| `GET`, `POST /projects/{p}/shares`; `DELETE …/shares/{id}` | Nuorodų skirtukas |
| `GET /public/projects/{token}` | `/p/[token]` |
| `GET /users`; `GET`, `PATCH`, `DELETE /users/{id}` | Administratorius; viešas profilis |

### E6. Įvedimo elementai

`text`, `email`, `password`, `textarea`, `number` (biudžetas, įkainis,
valandos, galiojimo dienos), `date` (terminas, laikotarpis), `datetime-local`
(sesija), `search`, `select` (būsena, užduotis), `RadioCards` (rolė, projekto
kilmė, užduočių autorius), `checkbox` (sutikimas), `Switch` („tik vykdomos“).

---

## 8. Etapas F – paveiksliukai

**Būsena:** atlikta (2026-10-05). 5 tikros programos ekrano nuotraukos
(`apps/web/src/assets/screens/*.webp`, iš viso ~210 KB), padarytos iš
produkcinio build su demonstraciniais duomenimis (2× raiška, tikras Chrome per
DevTools protokolą), konvertuotos į WebP.

| Failas | Kur | Kaip kinta su langu |
|---|---|---|
| `workspace.webp` (1600×1000) + `workspace-mobile.webp` (780×1688) | Titulinio hero | **Art direction:** `<picture>` + `getImageProps` – ≥ 768px plati nuotrauka 16:10, siauresniame – telefono nuotrauka 4:5; atsisiunčiama tik pasirinkta |
| `timer.webp`, `report.webp`, `share.webp` (1200×750) | Funkcijų kortelės | `fill` + `sizes="(min-width: 64rem) 340px, (min-width: 48rem) 33vw, 100vw"`, rėmelis `aspect-[16/10]` |
| `workspace-mobile.webp` | Prisijungimas / registracija | Telefono rėmelyje, `h-[min(520px,68dvh)]`; < 768px paslėpta |

- **Statinis importas** – Next.js žino matmenis (jokio išdėstymo šokinėjimo),
  rodo sulietą vietos rezervavimą (`placeholder="blur"`), tiekia per
  `/_next/image` keliais pločiais (`srcset`).
- Hero – `fetchPriority="high"`, `loading="eager"` (LCP paveiksliukas; Next 16
  `priority` nebenaudojamas).
- Watch Dogs apdorojimas – CSS sluoksnis virš paveiksliuko (skenavimo linijos,
  spalvų perdanga), failai švarūs – tinka ataskaitai.
- `ProductShot` (CSS pakaitalai) pašalintas; komponentai –
  `components/marketing/product-image.tsx`.
- Kad laikmatis nuotraukose atrodytų natūraliai, specialistui laikinai sukurta
  vykdoma sesija (pradėta prieš 1 val. 23 min.), po nuotraukų ištrinta.

| Vieta | Paveiksliukas | Dydžio kitimas |
|---|---|---|
| Titulinio hero | Programos darbo aplinkos ekrano nuotrauka | `fill`, `sizes="(max-width: 768px) 100vw, 60vw"`, `aspect-ratio: 16/10` |
| Funkcijų sekcija | 3 nuotraukos (laikmatis, ataskaita, peržiūros nuoroda) | 1 stulpelis mobiliajame → 3 plačiame |
| Prisijungimas / registracija | Nuotrauka šone | Paslepiama < 768px |
| Tuščios būsenos, 404 | SVG iliustracijos | Vektorinės – mastelis be kokybės praradimo |

- Nuotraukos daromos iš **mūsų pačių** programos (1440px ir 390px pločiais), `public/images/*.webp`.
- Watch Dogs apdorojimas – **CSS**, ne paveiksliuke: skenavimo linijų perdanga, duotone (`mix-blend-mode`), HUD kampų rėmelis. Taip ta pati nuotrauka tinka README be efektų.
- `next/image` pats sugeneruoja `srcset` ir WebP / AVIF; `alt` tekstai lietuviškai.
- Kadangi nuotraukoms reikia gatavų langų, etapas vykdomas po E; iki tol – laikini pakaitalai.
- README – paveiksliukų šaltiniai.

---

## 9. Etapas G – animacijos ir grįžtamasis ryšys

**Būsena:** atlikta (2026-10-05). Didžioji dalis padaryta C–E etapuose; G
pridėjo slinkimo atsiradimą, puslapių perėjimus ir optimistinius
atnaujinimus. Patikrinta tikrame Chrome su CDP tinklo delsa (1,5 s):

| Patikra | Rezultatas |
|---|---|
| Titulinis: elementai žemiau ekrano | 9 paslėpti įkeliant → paslinkus visi 9 atsirado (`reveal-in`), matomi iš karto – neliečiami |
| Užduotis → „Pažymėti atlikta“ | Po 250 ms jau „Atlikta“ (API atsako po 1,5 s) |
| Ta pati, kai užklausa nepavyksta | 250 ms „Atlikta“ → grąžinta „Laukia“ + klaidos pranešimas |
| „Sustabdyti“ laikmatį | Piliulė viršutinėje juostoje dingsta po 250 ms |

**Kur kas yra (gynimui):**

| Animacija | Kodas |
|---|---|
| Visos `@keyframes` ir perėjimų klasės | `src/styles/animations.css` |
| Glitch (užvedus pelę, atidarant modalą, 404 kas 3 s) | `.glitch`, `.glitch-loop`, `@keyframes glitch-a/b`, `glitch-loop-a/b` |
| HUD kampai (užvedus pelę / fokusas) | `.hud`, `.hud-on` – `background-size` perėjimas |
| Krovimas | `.skeleton` (`shimmer`), `.blocks` (`steps()`), `Spinner` (`spin`) |
| Duomenys atėjo | `src/lib/use-scramble.ts` (vienintelė su JS – keičia simbolius) |
| Modalai ir stalčiai | `.dialog` + `@starting-style`, `allow-discrete` (atidarymas **ir** uždarymas be JS) |
| Pranešimai | `.toast-enter` / `.toast-leave` |
| Vykdoma sesija | `.dot-live` (`pulse-live`) |
| Puslapio perėjimas | `.page-enter` per `app/app/template.tsx`, `app/(marketing)/template.tsx` |
| Atsiradimas slenkant | `.reveal-pending` / `.reveal-in` + `src/components/ui/reveal.tsx` (`IntersectionObserver`) |
| Užvedus pelę (mygtukai, eilutės, meniu, ikonų poslinkis) | Tailwind `transition-*` + `hover:` komponentuose |
| Skirtukų pabraukimas, jungiklis, mobilusis meniu | `tabs.tsx` (`transition-[left,width]`), `field.tsx` (`after:translate-x`), `marketing-header.tsx` (`grid-template-rows 0fr → 1fr`) |
| Mažiau judesio | `@media (prefers-reduced-motion: reduce)` animations.css gale + `Reveal`, `useScramble` patikros |

**Optimistiniai atnaujinimai** – `lib/queries/tasks.ts` (`useUpdateTask`:
būsena, patvirtinimas) ir `lib/queries/sessions.ts` (`useStopSession`):
`onMutate` – nuotrauka ir pakeitimas podėlyje, `onError` – atstatymas,
`onSettled` – duomenys perkraunami.

### G1. Animacijos (`src/styles/animations.css` – visos `@keyframes` vienoje vietoje)

| Kada | Animacija |
|---|---|
| Duomenys kraunami | `Skeleton` blizgesys (`shimmer`), sukutis mygtuke, blokų progreso juosta (`steps()`) |
| Duomenys atėjo | Antraštės ir skaičių „iššifravimas“ (scramble, ~400 ms) |
| Užvedus pelę | Mygtukų, eilučių, kortelių, meniu punktų rėmelio ir fono perėjimai (150 ms); HUD kampai; pagrindinio mygtuko ir logotipo glitch; ikonos poslinkis |
| Modalas | `opacity` + `scale(.96 → 1)`, fonas `backdrop-blur`, trumpas glitch atidarant |
| Stalčius | `translateX(-100% → 0)` |
| Pranešimas | Įslydimas iš apačios, išnykimas |
| Veikianti sesija | Pulsuojantis taškas |
| Titulinis | Sekcijų `fade-up` (`IntersectionObserver`) |

`prefers-reduced-motion` jas išjungia.

### G2. Grįžtamasis ryšys

- Kiekviena mutacija: sėkmė → pranešimas; klaida → pranešimas arba klaida prie lauko;
- mygtukas vykdant – `disabled` + sukutis; optimistiniai atnaujinimai būsenoms ir laikmačiui;
- šalinimas – tik per `ConfirmDialog`;
- `alert`, `confirm`, `prompt` – draudžiami ESLint taisykle `no-alert`.

---

## 10. Etapas H – diegimas (anksti)

| Dalis | Paslauga | Pastabos |
|---|---|---|
| DB | Azure Database for PostgreSQL Flexible Server, Burstable B1ms | TLS; užkarda – tik Azure paslaugoms |
| API | App Service (Linux, Node 22) | `db:deploy` prieš paleidimą; `COOKIE_SECURE=true`; `TRUST_PROXY`; sveikatos patikra `/api/health/ready` |
| Web | App Service (tas pats planas) | `output: "standalone"`; `API_URL` – API adresas |
| CI/CD | `.github/workflows/deploy.yml` | Po sėkmingo `ci.yml` į `main`: migracijos → API → web |

1. **Po B etapo:** diegiamas skeletas (titulinis + prisijungimas) – patikrinama, ar veikia slapukas, `/auth/refresh`, bandymų ribojimas su tikru IP.
2. `db:seed` produkcijoje vieną kartą.
3. **Pabaigoje:** galutinis diegimas, patikra: `/api/health/ready`, prisijungimas, CSV, `Secure` slapukas, 429 per tikrą kelią.
4. README 2 skyrius ir diegimo diagrama – App Service vietoj Static Web Apps.

Alternatyvos (gynimui): Render / Railway (paprasčiau, bet nemokamas planas
„užmiega“), Vercel (Next.js, bet API ir DB – kitur), DigitalOcean App Platform.

---

## 11. Etapas I – ataskaita ir gynimas

### I1. Struktūra

**Ataskaita daroma po sąsajos** (sprendimas 2026-10-05). Šablonas (gautas):

| # | Skyrius | Turinys | Dabar README |
|---|---|---|---|
| 1 | Sprendžiamo uždavinio aprašymas | 1.1 Sistemos paskirtis, 1.2 Funkciniai reikalavimai | Yra (1.1, 1.2) |
| 2 | Sistemos architektūra | Pakanka UML diegimo diagramos | Yra, bet diagrama pasenusi (I2) |
| 3 | Naudotojo sąsajos projektas | Wireframe'ai ir juos atitinkančios realizacijos iškarpos | Nėra |
| 4 | API specifikacija | **Atskiras `api-spec.yaml`**; kiekvienam metodui – galimi atsako kodai ir pavyzdžiai (užklausa, atsakymas) | Dalinai (1.4 lentelės be pavyzdžių) |
| 5 | Išvados | | Nėra |

Pateikiama saugyklos README (jei saugykla privati – dokumentu Moodle).
Dabartiniai papildomi skyriai (1.3–1.5, technologijos, paleidimas,
autentifikacija, klaidos, demonstracija, kriterijų atitiktis, DI naudojimas) –
į priedus po išvadų arba į `docs/`, kad pagrindinė dalis tiksliai atitiktų
šabloną.

### I2. Diegimo diagrama (UML, ne PlantUML)

Cameo Systems Modeler (turi; jungiasi per `cameo-bridge`) arba draw.io su UML
biblioteka. Elementai: `<<device>>` naudotojo kompiuteris → `<<executionEnvironment>>`
naršyklė; `<<device>>` Azure App Service planas su dviem
`<<executionEnvironment>>` (Node 22: web, API) ir jų `<<artifact>>`;
`<<device>>` PostgreSQL Flexible Server su `<<executionEnvironment>>` PostgreSQL 17
ir DB schema; ryšiai su stereotipais `<<HTTPS>>`, `<<TLS>>`. Eksportas – PNG į
`docs/`, šaltinis – saugykloje.

### I3. OpenAPI

- `openapi.ts`: `example` kiekvienos operacijos užklausai ir **kiekvienam** atsakymo statusui (200/201/204, 400, 401, 403, 404, 409, 422, 429) – imant realius seed duomenis;
- `npm run openapi:export` papildomai rašo **`api-spec.yaml`** (šaknyje arba `docs/`); CI tikrina, kad jis sutampa su kodu, kaip dabar `openapi.json`;
- `npm run openapi:md` → `docs/api.md`: kiekvienai operacijai – paskirtis, URL, parametrai, užklausos pavyzdys, galimi atsakymai su pavyzdžiais (skaitomas GitHub'e be Swagger);
- CI patikra: kiekviena operacija turi bent vieną užklausos (jei turi kūną) ir atsakymo pavyzdį.

### I4. Išvados ir „DI šlamštas“

- Išvados sunumeruotos, kiekviena: **kas padaryta → kas iš to** (pvz., „HATEOAS nuorodos leido klientui nekartoti teisių logikos – mygtukai rodomi pagal `_links`“). Aš paruošiu faktus, rašai tu.
- Visą README peržiūrėti dėl LLM stiliaus: ilgi sąrašai „dėl visa ko“, tuščios frazės, pasikartojimai. Trumpiau ir savais žodžiais.

### I5. Turinys

- **Naudotojo sąsajos projektas:** wireframe'ai šalia realizacijos nuotraukų;
- **Dizaino sistema:** paletė, šriftai, komponentai, „Resend × Watch Dogs“ kryptis (įkvėpimo šaltiniai įvardijami);
- **Karkasas ir architektūra:** kodėl Next.js; alternatyvos – Vite + React (SPA, reikėtų atskiro maršrutizatoriaus ir tarpinio serverio slapukui), Angular (sunkesnis, savo ekosistema), Vue / Nuxt, SvelteKit; App Router, Server ir Client Components, maketai, route handler kaip tarpinis sluoksnis;
- **Būsena:** TanStack Query (serverio duomenys), Context (sesija), URL (filtrai), vietinė (formos); kodėl žetonas atmintyje;
- **Diegimas:** Azure resursai, CI/CD, aplinkos kintamieji;
- **8.3 3 lab.** – kriterijų lentelė su balais.

**Cheatsheet „Gynimui – 3 lab.“:** konkretūs failai ir eilutės:

| Klausimas | Kur |
|---|---|
| Kaip įtraukiami šriftai? | `src/app/fonts.ts` → `layout.tsx` → `@theme` |
| Kur animacijų kodas? | `src/styles/animations.css` |
| Kaip realizuotas lūžio taškas? Pakeisti | `@theme --breakpoint-md` → Tailwind `md:` sugeneruoja `@media (width >= 48rem)` |
| Kodėl SVG, kur jie? | `lucide-react` (npm, įterpiami į JSX), `Logo.tsx`, `public/illustrations/*.svg` |
| Kur būsena? | `lib/auth.tsx`, `lib/queries/*`, `useSearchParams` |

---

## 12. Etapas J – kokybė

- `lint`, `typecheck` web daliai (CI jau paleidžia per `--workspaces`);
- **`npm run ui:coverage`** – kaip `postman:coverage`, tik tikrina, ar kiekviena OpenAPI operacija minima `src/lib/queries/*` (pagal `method` + adreso šabloną);
- Playwright „dūmų“ testas CI: registracija → projektas → užduotis → sesija → ataskaita;
- rankinis patikrinimas 375 / 768 / 1280px; klaviatūra (`Tab`, `Esc` modale), `aria-label` ikonų mygtukams.

**Neprivaloma, jei liks laiko:** demonstraciniai prisijungimo mygtukai
(`NEXT_PUBLIC_DEMO_MODE`), gyva darbo eiga (`refetchInterval` 15 s projekto ir
`/p/[token]` puslapiuose), ⌘K komandų paletė, Lighthouse ≥ 90.

---

## 13. Eiliškumas

| # | Darbas | Commit'as |
|---|---|---|
| 1 | A – wireframe'ai | *Add UI wireframes* |
| 2 | B1–B5 – duomenų sluoksnis, autentifikacija | *Add client auth and API data layer* |
| 3 | B6 – `TRUST_PROXY` API | *Resolve client IP behind proxies* |
| 4 | C – žetonai, šriftai, UI komponentai, glitch / scramble, logotipas | *Add design system and UI components* |
| 5 | D – maketai, hamburger, klaidų puslapiai | *Add marketing, auth and app layouts* |
| 6 | H1 – skeleto diegimas | *Deploy API and web to Azure App Service* |
| 7 | E1 – vieši puslapiai, prisijungimas | *Add public pages and auth screens* |
| 8 | E2 – projektai, užduotys (modalai) | *Add project workspace* |
| 9 | E2–E3 – sesijos, laikmatis | *Add work log and session timer* |
| 10 | E2 – pasiūlymai, nuorodos, ataskaita | *Add proposals, share links and reports* |
| 11 | E2 – paskyra, administratorius | *Add account settings and admin area* |
| 12 | F – paveiksliukai | *Add responsive product images* |
| 13 | G – animacijos, grįžtamasis ryšys | *Polish motion and feedback* |
| 14 | J – `ui:coverage`, Playwright | *Add UI coverage check and smoke test* |
| 15 | H3 – galutinis diegimas | *Finalize deployment* |
| 16 | I3 – OpenAPI pavyzdžiai, `docs/api.md` | *Add examples to every OpenAPI operation* |
| 17 | I2 – UML diegimo diagrama | *Redraw deployment diagram for App Service* |
| 18 | I1, I4, I5 – README pagal šabloną, išvados, cheatsheet | *Restructure report to course template* |

I3 nepriklauso nuo kliento – jį galima daryti bet kada lygiagrečiai (pvz.,
laukiant Azure resursų).

Commit'us darai tu – aš paruošiu pakeitimus ir pasiūlysiu pranešimą.

---

## 14. Sprendimai, kuriuos reikia patvirtinti

| Klausimas | Rekomendacija |
|---|---|
| Paveiksliukų šaltinis | Mūsų programos ekrano nuotraukos (alternatyva – nemokamos Unsplash nuotraukos su licencija) |
| ~~Wireframe'ai – įrankis~~ | **Nuspręsta:** SVG piešiu aš, „Figma“ kriterijaus nepaisome |
| ~~Watch Dogs intensyvumas~~ | **Nuspręsta (2026-10-05): 1 tema** – „Resend × WD · planas“ iš [nuotaikos lentos](https://claude.ai/artifact/BWiM1SZvXc3k6DSTyeew9F). Išbandytos ir atmestos: grynas Resend, „daugiau WD“, grynos DedSec ir ctOS temos (per daug) |
| Diegimo diagramos įrankis | Cameo (jau turi, tikras UML) arba draw.io |
| ~~Ataskaitos šablonas~~ | **Gautas** (I1); ataskaita – po sąsajos |
| Diegti anksti (skeletas po B) | Taip |
| Playwright CI | Taip, vienas „dūmų“ scenarijus |
