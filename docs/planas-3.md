# Darbų planas: 3 laboratorinis (naudotojo sąsaja ir diegimas)

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md),
ankstesni planai – [planas.md](planas.md), [planas-2.md](planas-2.md),
[planas-pataisos.md](planas-pataisos.md).

**Tikslas:** Next.js klientas, kuriuo galima panaudoti **visus 41** API
metodus, kuris tenkina oficialius 3 lab. kriterijus (10 balų), yra įdiegtas
Azure (ir API, ir klientas) ir kurį galima apginti.

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

---

## 2. Sprendimai

| Klausimas | Sprendimas | Kodėl |
|---|---|---|
| Karkasas | **Next.js 16** (App Router, React 19) – jau projekte | Vienas TypeScript projektas su API ir `@hourly/shared`; maketai, maršrutai, `next/font`, `next/image` iš dėžės; tarpinis maršrutas leidžia `httpOnly` slapuką laikyti toje pačioje kilmėje. Alternatyvos gynimui – 11 skyriuje |
| Kur gaunami duomenys | **Naršyklėje** (Client Components + TanStack Query) iš JSON API | Kriterijus „JSON, ne HTML“; prieigos žetonas yra tik naršyklės atmintyje, tad serveris jo ir neturi. Server Components – tik statiniam karkasui ir tituliniam puslapiui |
| Būsena | Serverio duomenys – TanStack Query podėlis; sesija – `AuthProvider` (React Context); filtrai ir puslapis – URL parametrai; formos – vietinė būsena | Kiekviena būsena ten, kur jai vieta; URL būsena išlieka perkrovus ir dalinantis nuoroda |
| Vizualinis stilius | Resend įkvėpta tamsi tema (kaip anksčiau sutarta) | Nuosekli sistema, lengvai perkeliama į žetonus |
| Ko nekopijuojame | Resend logotipo, pavadinimo, iliustracijų, licencijuotų šriftų | Prekės ženklas ir licencijos |
| Paveiksliukai | **Mūsų pačių programos ekrano nuotraukos** (WebP) tituliniame, funkcijų ir prisijungimo puslapiuose; tuščių būsenų ir 404 iliustracijos – SVG | Autentiški, be licencijų klausimų; *patvirtinti – 12 sk.* |
| Ikonos | `lucide-react` | Įterptinis SVG, `currentColor`, vienodas stilius |
| Šriftai | `next/font/google`: Instrument Serif (antraštės), Inter (tekstas), Geist Mono (skaičiai, laikmatis) | Parsisiunčiami kompiliuojant ir tiekiami iš savo domeno – be užklausų į Google, be „šokinėjimo“ |
| Stiliai | Tailwind CSS v4 + CSS kintamieji; animacijos – `src/styles/animations.css` | Viena vieta žetonams, lūžio taškui ir animacijoms – lengva parodyti ir pakeisti gynime |
| Komponentai | Savi `src/components/ui/*`, be shadcn / Radix | Mažiau priklausomybių; `<dialog>` duoda `Esc`, fokusą ir `::backdrop` |
| Formos | Natūralūs `<form>` + Zod schemos iš `@hourly/shared`; 422 `details` → klaida prie lauko | Tos pačios taisyklės kliente ir serveryje |
| Veiksmai | Pagal `_links`: mygtukas rodomas tik jei yra nuoroda, vykdomas per `follow(link, body)` | HATEOAS klientas; nėra antros teisių kopijos |
| Maršrutų apsauga | `src/proxy.ts` (Next 16 pavadinimas): `/app/**` be `hourly_refresh` slapuko → `/login?next=…` | Greitas nukreipimas; tikra patikra – API |
| Diegimas | Azure App Service (Linux, Node 22) – du app'ai viename plane; PostgreSQL Flexible Server | Studento kreditas; Static Web Apps rezervuoja `/api` – konfliktas su tarpiniu maršrutu |
| Kada diegti | **Anksti** – po B etapo „vaikščiojantis skeletas“ | Diegimo problemos (slapukai, IP, migracijos) paaiškėja, kol dar yra laiko |

---

## 3. Etapas A – wireframe'ai (prieš kodą)

`docs/wireframes/*.svg`, žema detalė, kiekvienas langas **dviem pločiais**
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

## 5. Etapas C – dizaino sistema

### C1. Žetonai (`src/app/globals.css`, `@theme`)

| Žetonas | Reikšmė |
|---|---|
| `--color-bg` / `--color-fg` | `#000000` / `#f0f0f0` |
| `--color-muted` | `#a1a4a5` (kontrastas su juodu 8.4:1) |
| `--color-surface`, `--color-border` | `rgba(255,255,255,.03)`, `rgba(255,255,255,.08)` → hover `.14` |
| Būsenų spalvos | pilka (juodraštis, TODO), mėlyna (paskelbtas, laukia), gintarinė (vykdoma), žalia (atlikta, priimta), raudona (atmesta, užblokuota) |
| `--radius-button` / `--radius-card` | `16px` / `20px` |
| **`--breakpoint-md`** | **`48rem`** – vienintelis lūžio taškas, keičiamas čia |

### C2. Šriftai (`src/app/fonts.ts`)

`next/font/google`: Instrument Serif, Inter, Geist Mono; `subsets: ['latin', 'latin-ext']`,
`display: 'swap'`, CSS kintamieji → `@theme` `--font-serif`, `--font-sans`, `--font-mono`.

### C3. Komponentai `src/components/ui/`

`Button` (primary / secondary / ghost / danger, `loading` būsena su sukučiu),
`Field` (etiketė + klaida iš 422), `Input`, `Textarea`, `Select`, `Checkbox`,
`Switch`, `RadioCards`, `Badge`, `Card`, `Table` (mobiliajame → kortelės),
`Tabs`, **`Dialog`**, **`ConfirmDialog`**, **`Drawer`**, `DropdownMenu`,
**`Toast`**, `EmptyState`, `Skeleton`, `Spinner`, `Pagination`, `CopyField`,
`Logo` (savas SVG).

---

## 6. Etapas D – maketai

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

| Vieta | Paveiksliukas | Dydžio kitimas |
|---|---|---|
| Titulinio hero | Programos darbo aplinkos ekrano nuotrauka | `fill`, `sizes="(max-width: 768px) 100vw, 60vw"`, `aspect-ratio: 16/10` |
| Funkcijų sekcija | 3 nuotraukos (laikmatis, ataskaita, peržiūros nuoroda) | 1 stulpelis mobiliajame → 3 plačiame |
| Prisijungimas / registracija | Nuotrauka šone | Paslepiama < 768px |
| Tuščios būsenos, 404 | SVG iliustracijos | Vektorinės – mastelis be kokybės praradimo |

- Nuotraukos daromos iš **mūsų pačių** programos (1440px ir 390px pločiais), `public/images/*.webp`.
- `next/image` pats sugeneruoja `srcset` ir WebP / AVIF; `alt` tekstai lietuviškai.
- Kadangi nuotraukoms reikia gatavų langų, etapas vykdomas po E; iki tol – laikini pakaitalai.
- README – paveiksliukų šaltiniai.

---

## 9. Etapas G – animacijos ir grįžtamasis ryšys

### G1. Animacijos (`src/styles/animations.css` – visos `@keyframes` vienoje vietoje)

| Kada | Animacija |
|---|---|
| Duomenys kraunami | `Skeleton` blizgesys (`shimmer`), sukutis mygtuke |
| Užvedus pelę | Mygtukų, eilučių, kortelių, meniu punktų rėmelio ir fono perėjimai (150 ms); ikonos poslinkis |
| Modalas | `opacity` + `scale(.96 → 1)`, fonas `backdrop-blur` |
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

**README:**

- **Naudotojo sąsajos projektas:** wireframe'ai šalia realizacijos nuotraukų;
- **Dizaino sistema:** paletė, šriftai, komponentai;
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
| 4 | C – žetonai, šriftai, UI komponentai, logotipas | *Add design system and UI components* |
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
| 16 | I – ataskaita, cheatsheet | *Document UI, architecture and deployment* |

Commit'us darai tu – aš paruošiu pakeitimus ir pasiūlysiu pranešimą.

---

## 14. Sprendimai, kuriuos reikia patvirtinti

| Klausimas | Rekomendacija |
|---|---|
| Paveiksliukų šaltinis | Mūsų programos ekrano nuotraukos (alternatyva – nemokamos Unsplash nuotraukos su licencija) |
| Wireframe'ai | Palikti (buvo ankstesnės užduoties sąraše, ataskaitai naudinga), bet žemos detalės |
| Diegti anksti (skeletas po B) | Taip |
| Playwright CI | Taip, vienas „dūmų“ scenarijus |
