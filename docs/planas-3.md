# Darbų planas: 3 laboratorinis (naudotojo sąsaja ir diegimas)

Dokumentas skirtas darbo eigai, ne ataskaitai. Ataskaita yra [README.md](../README.md),
ankstesni planai – [planas.md](planas.md), [planas-2.md](planas-2.md).

**Tikslas:** Next.js klientas, kuris naudoja visus 37 sąsajos metodus, atrodo
kaip [Resend](https://resend.com) (tamsi, minimalistinė, „developer tool“
estetika), tenkina 3 lab. naudotojo sąsajos reikalavimus ir yra įdiegtas Azure.

Sprendimai, priimti prieš pradedant:

| Klausimas | Sprendimas | Kodėl |
|---|---|---|
| Vizualinis stilius | Resend vizualinė kalba: juodas fonas, serifinės antraštės, ploni rėmeliai, balti „piliulės“ mygtukai, monospace skaičiams | Patinka; aiški, nuosekli dizaino sistema, kurią lengva perkelti į žetonus (C skyrius) |
| Ką **nekopijuojame** | Resend logotipo, pavadinimo, iliustracijų / 3D paveikslėlių ir licencijuotų šriftų (Domaine, ABC Favorit) | Šriftai komerciniai, o užduotis vis tiek reikalauja Google Fonts; logotipas ir paveikslėliai – prekės ženklas. Išdėstymą, spalvas ir komponentų formą kopijuoti galima |
| Tema | **Tik tamsi** | Resend taip pat tamsus; dvi temos padvigubintų vizualinį testavimą |
| Wireframe'ai | Žemos detalės **SVG** failai `docs/wireframes/` | Versijuojami kartu su kodu, rodomi tiesiai README |
| Titulinis puslapis | **Trumpas:** hero, funkcijos, rolės, CTA | Pakanka reikalavimams; ilgas puslapis be realaus turinio atrodytų tuščias |
| Kalba | Sąsaja lietuviškai, kodas ir komentarai angliškai | Kaip ir iki šiol |
| Stilių priemonė | Tailwind CSS v4 (jau įdiegtas) + CSS kintamieji dizaino žetonams | Nereikia naujos priklausomybės; žetonai viename faile |
| Komponentai | Savi `src/components/ui/*`, be shadcn / Radix | Mažiau priklausomybių; modalą darome su natūraliu `<dialog>` (prieinamumas, `Esc`, fokusas – nemokamai) |
| Ikonos | `lucide-react` (įterptinis SVG) | Užduoties reikalavimas „SVG ikonos“; stilius artimas Resend ikonoms |
| Formos | Natūralūs `<form>` + `zod` schemos iš `@hourly/shared` | Tos pačios schemos kaip API – klaidos kliente ir serveryje sutampa; 422 `details` rodomi prie laukų |
| Užklausų būsena | TanStack Query (jau įdiegta) | Podėlis, invalidacija po mutacijų, `refetchInterval` laikmačiui |
| Prieigos žetonas | Tik atmintyje; perkrovus puslapį atkuriamas per `/auth/refresh` | Taip suplanuota 2 lab. (14 skyrius); XSS negali pavogti žetono iš `localStorage` |
| Maršrutų apsauga | Next.js 16 `proxy.ts` (buvęs `middleware.ts`) tikrina, ar yra `hourly_refresh` slapukas; tikra patikra – API | Greitas nukreipimas į `/login` be mirgėjimo; saugumas nepriklauso nuo kliento |
| Diegimas | API ir web – **Azure App Service** (Linux, Node 22, vienas planas) | Static Web Apps rezervuoja `/api` kelią (G skyrius) |
| Duomenų bazė | Lokaliai – Docker (kaip dabar); Azure – **PostgreSQL Flexible Server**, ne Docker konteineris | Žr. G skyriaus pastabą „Kodėl ne DB Docker'yje“ |

**Užduoties reikalavimai** (patvirtinta – kitų nėra): wireframe'ai prieš kodą,
`768px` lūžio taškas, hamburger meniu, modalinis langas, SVG ikonos, Google
Fonts, perėjimai / animacijos, skirtingi Header / Content / Footer stiliai,
įvairūs įvedimo elementai, diegimas debesyje. Papildomi, šiam projektui
prasmingi dalykai – [J skyriuje](#10-etapas-j--papildomi-dalykai-ne-reikalavimai).

---

## 0. Išeities taškas

**Jau paruošta:**

- `apps/web` – Next.js 16.3, React 19, Tailwind v4, TanStack Query, Geist šriftai per `next/font/google`;
- `src/app/api/[...path]/route.ts` – tarpinis maršrutas į API (tos pačios kilmės slapukai);
- `src/lib/api.ts` – `apiFetch` ir `ApiRequestError` (statusas + mašininis kodas);
- `@hourly/shared` – visos Zod schemos ir tipai (įvesties ir atsakymų);
- API: 37 metodai, CORS iš `WEB_ORIGIN`, slapuko nustatymai per `env.ts`, visos paslaptys – aplinkos kintamieji.

**Spragos, kurias reikia užtaisyti:**

| # | Spraga | Kur | Pasekmė |
|---|---|---|---|
| 1 | Tarpinis maršrutas nepersiunčia `www-authenticate`, `location`, `content-disposition` | `route.ts` `FORWARD_RESPONSE_HEADERS` | CSV ataskaita nepasisiūlys parsisiųsti |
| 2 | `apiFetch` nesiunčia prieigos žetono ir neatnaujina jo gavus 401 | `lib/api.ts` | Jokia apsaugota užklausa neveiks |
| 3 | `apiFetch` visada bando `response.json()` | `lib/api.ts` | CSV atsakymas „sugadinamas“ |
| 4 | Nuoroda į `http://localhost:4000/api/docs` įrašyta kode | `page.tsx` | Įdiegus rodys į niekur |
| 5 | Nėra `output: "standalone"` | `next.config.ts` | Diegimo paketas su visu `node_modules` |
| 6 | Specialisto statistikos metodo nėra | API | „Uždarbis“ skaičiuojamas kliente iš `GET /sessions` (arba pridedam `GET /sessions/summary` – *spręsim B etape*) |

---

## 1. Etapas A – wireframe'ai (prieš kodą)

`docs/wireframes/` – po vieną failą kiekvienam langui, **dviem pločiais**
(≥ 768px ir 375px), kad lūžio taškas matytųsi jau projekte.

| # | Langas | Pastabos |
|---|---|---|
| W1 | Titulinis `/` | Hero, funkcijos, rolių kortelės, CTA, poraštė (4 sekcijos) |
| W2 | Prisijungimas / registracija | Centruota kortelė; registracijoje – rolės radio |
| W3 | Aikštelė `/projects` | Paieška, filtrai, kortelių sąrašas, puslapiavimas |
| W4 | Viešas projektas `/projects/[id]` + pasiūlymo modalas | |
| W5 | Valdymo skydelis `/app` | Šoninė juosta; mobiliajame – hamburger stalčius |
| W6 | Projekto darbo aplinka `/app/projects/[id]` | Skirtukai: užduotys, sesijos, pasiūlymai, nuorodos, ataskaita, nustatymai |
| W7 | Darbo žurnalas `/app/sessions` + laikmatis | Resend „Emails“ lentelės analogas |
| W8 | Vieša peržiūra `/p/[token]` | |
| W9 | Administratoriaus sritis | Naudotojų lentelė, blokavimo patvirtinimo modalas |

Ataskaitoje (README 9 sk.) kiekvienas wireframe'as dedamas šalia realizacijos
ekrano nuotraukos.

---

## 2. Etapas B – duomenų sluoksnis ir autentifikacija

### B1. `route.ts` – spraga 1

`FORWARD_RESPONSE_HEADERS` papildyti `www-authenticate`, `location`,
`content-disposition`, `cache-control`.

### B2. `src/lib/auth.tsx` – `AuthProvider`

- būsena: `accessToken` (atmintyje), `user` (`CurrentUser`), `status: loading | authenticated | guest`;
- įkeliant – vienas `POST /auth/refresh`; sėkmė → `GET /auth/me`, nesėkmė → `guest`;
- `login`, `register`, `logout` – kviečia `/auth/*` ir atnaujina būseną, `logout` išvalo Query podėlį.

### B3. `src/lib/api.ts` – spragos 2 ir 3

- `Authorization: Bearer` iš `AuthProvider` (per modulio lygio „getter“, kad `apiFetch` liktų funkcija);
- gavus 401 `TOKEN_EXPIRED` – **vienas** bendras `/auth/refresh` (lygiagrečios užklausos laukia to paties pažado) ir užklausos pakartojimas; antras 401 → `guest` ir nukreipimas į `/login?next=…`;
- `apiDownload(path)` – `Accept: text/csv`, `blob`, failo vardas iš `Content-Disposition`.

### B4. `src/lib/queries/*` – po failą resursui

`projects.ts`, `tasks.ts`, `sessions.ts`, `proposals.ts`, `shares.ts`,
`users.ts`, `auth.ts`: užklausų raktai, `useXxx` ir `useXxxMutation` kabliai,
invalidacija po mutacijų (pvz., priėmus pasiūlymą – `projects`, `proposals`).

### B5. `proxy.ts` – maršrutų apsauga

`/app/**` be `hourly_refresh` slapuko → `/login?next=…`; `/login`, `/register`
su slapuku → `/app`. **Prieš rašant – perskaityti**
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
(Next 16 pakeitimai).

---

## 3. Etapas C – dizaino sistema („Resend“ žetonai)

Išmatuota iš resend.com (2026-09-24):

| Žetonas | Reikšmė | Resend originalas |
|---|---|---|
| `--bg` | `#000000` | `rgb(0,0,0)` |
| `--fg` | `#f0f0f0` | `rgb(240,240,240)` |
| `--muted` | `#a1a4a5` | pastraipų spalva |
| `--surface` | `rgba(255,255,255,0.03)` | kortelių fonas |
| `--border` | `rgba(255,255,255,0.08)`, hover `0.14` | ploni rėmeliai |
| `--radius-button` | `16px` (piliulė ~36px aukščio) | `16px` |
| `--radius-card` | `16–20px` | |
| Antraštė H1 | serifas, 400, ~96px (mob. ~48px), `letter-spacing: -0.01em`, gradientas baltas → pilkas | Domaine, 96px, 400 |
| Tekstas | Inter 14–16px | Inter |
| Skaičiai, kodas, laikmatis | monospace | Commit Mono |

**Google Fonts pakaitalai** (visi su `latin-ext`, t. y. ąčęėįšųūž):

| Paskirtis | Šriftas |
|---|---|
| Antraštės | **Instrument Serif** (artimiausias Domaine; alternatyva – Newsreader) |
| Tekstas | **Inter** |
| Monospace | **Geist Mono** (jau naudojamas) |

**Būsenų ženkleliai** (Resend „Delivered / Bounced“ stilius – spalvotas fonas
10 %, rėmelis 20 %, tekstas 100 %):

| Būsena | Spalva |
|---|---|
| `DRAFT`, `TODO` | pilka |
| `PUBLISHED`, `PENDING` | mėlyna |
| `IN_PROGRESS`, vykdoma sesija | gintarinė (su pulsuojančiu tašku) |
| `COMPLETED`, `ACCEPTED`, `DONE` | žalia |
| `REJECTED`, `WITHDRAWN`, užblokuotas | raudona |

**UI komponentai** `src/components/ui/`: `Button` (primary – baltas fonas, juodas
tekstas; secondary – rėmelis; ghost), `Input`, `Textarea`, `Select`, `Checkbox`,
`Radio`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `Drawer`, `DropdownMenu`,
`Toast`, `EmptyState`, `Skeleton`, `Kbd`, `CopyField` (peržiūros nuorodai).

---

## 4. Etapas D – maketai (Header / Content / Footer)

| Maketas | Kam | Header | Content | Footer |
|---|---|---|---|---|
| `(marketing)` | `/`, `/projects`, `/projects/[id]` | Lipni, permatoma su `backdrop-blur`, ploną rėmelį įgyja tik slenkant | Centruotas, `max-w-6xl`, didelės sekcijų paraštės | Stulpeliais (Produktas, Ištekliai, Paskyra), pilkas smulkus tekstas, `/api/docs` nuoroda |
| `(auth)` | `/login`, `/register` | Tik logotipas | Centruota kortelė | Viena eilutė |
| `app` | `/app/**` | Viršutinė juosta: puslapio pavadinimas, veikiantis laikmatis, naudotojo meniu | Šoninė juosta 240px + turinys | – (šoninės juostos apačioje – naudotojas) |
| `public-share` | `/p/[token]` | „Tik skaitymui“ juosta, galiojimo laikas | Suvestinė + užduotys | „Sukurta su Hourly“ |

**Lūžio taškas `768px` (Tailwind `md:`):** žemiau – šoninė juosta tampa
hamburger stalčiumi (`Drawer`, išslysta iš kairės), marketingo navigacija –
išskleidžiamu meniu, lentelės – kortelėmis, skirtukai – horizontaliai slenkami.

---

## 5. Etapas E – puslapiai

### E1. Vieši

| Kelias | Turinys | API |
|---|---|---|
| `/` | Trumpas, 4 sekcijos: **hero** („Laikas, kurį galima parodyti“ + gyvo laikmačio / ataskaitos pavyzdžio kortelė vietoj Resend kodo bloko), **funkcijos** (3–4 kortelės: aikštelė, laikmatis, ataskaita, peržiūros nuoroda), **rolės** (užsakovas, specialistas, tiesioginis darbas), **CTA** | `GET /health` (būsenos taškas poraštėje) |
| `/projects` | Paieška (`type="search"`), būsenos filtras, puslapiavimas | `GET /projects?scope=marketplace` |
| `/projects/[id]` | Aprašymas, biudžetas, terminas; specialistui – **„Pateikti pasiūlymą“ modalas** | `GET /projects/{id}`, `POST /projects/{id}/proposals` |
| `/p/[token]` | Užduotys, valandos, suma; `noindex` | `GET /public/projects/{token}` |
| `/login`, `/register` | Rolės pasirinkimas radio kortelėmis | `POST /auth/login`, `POST /auth/register` |

### E2. Valdymo skydelis (`/app`)

Šoninė juosta (Resend: Emails, Broadcasts, Audience… → mūsų):
**Apžvalga · Projektai · Aikštelė · Pasiūlymai · Darbo žurnalas · Paskyra**,
administratoriui – **Naudotojai · Visi projektai**.

| Kelias | Turinys | API |
|---|---|---|
| `/app` | Apžvalga: veikianti sesija, savaitės valandos, uždarbis, naujausios užduotys | `GET /sessions`, `GET /tasks`, `GET /projects?scope=owned\|assigned` |
| `/app/projects` | Skirtukai „Sukurti“ / „Vykdomi“ | `GET /projects?scope=owned\|assigned` |
| `/app/projects/new` | Forma: pavadinimas, aprašymas, biudžeto rėžiai (`number`), terminas (`date`), užduočių režimas (radio), tiesioginiam darbui – užsakovo vardas, įkainis | `POST /projects` |
| `/app/projects/[id]` | Skirtukai (žr. žemiau) | `GET /projects/{id}` |
| ↳ Užduotys | Sąrašas, būsenos keitimas, perrikiavimas, patvirtinimas | `GET /projects/{id}/tasks`, `POST/PATCH/DELETE /tasks` |
| ↳ Užduoties šoninis skydelis | Užduoties duomenys ir jos sesijos | `GET /tasks/{id}`, `GET /tasks/{id}/sessions` |
| ↳ Pasiūlymai | Priimti / atmesti (patvirtinimo modalas) | `GET /projects/{id}/proposals`, `PATCH /proposals/{id}` |
| ↳ Peržiūros nuorodos | Sugeneruoti → **modalas „Nuoroda rodoma tik kartą“** (kaip Resend API rakto sukūrimas), atšaukti | `GET/POST /projects/{id}/shares`, `DELETE /shares/{id}` |
| ↳ Ataskaita | Lentelė pagal užduotis + „Parsisiųsti CSV“ | `GET /projects/{id}/report` (JSON ir CSV) |
| ↳ Nustatymai | Redaguoti, paskelbti, užbaigti, šalinti („pavojaus zona“ kaip Resend) | `PATCH/DELETE /projects/{id}` |
| `/app/sessions` | Darbo žurnalas (Resend „Emails“ lentelė), laikmatis, **rankinio įvedimo modalas** (`datetime-local`) | `GET/POST /sessions`, `PATCH/DELETE /sessions/{id}` |
| `/app/sessions/[id]` | Sesijos detalės (Resend el. laiško detalės puslapio analogas) | `GET /sessions/{id}` |
| `/app/proposals` | Savo pasiūlymai, atšaukti, šalinti | `GET /proposals`, `PATCH/DELETE /proposals/{id}` |
| `/app/settings` | Vardas, aprašymas, slaptažodžio keitimas, atsijungti | `GET/PATCH /auth/me`, `POST /auth/logout` |
| `/app/users/[id]` | Viešas profilis | `GET /users/{id}` |
| `/app/admin/users` | Lentelė, blokuoti / atblokuoti, šalinti | `GET /users`, `PATCH/DELETE /users/{id}` |
| `/app/admin/projects` | Visi projektai, šalinti | `GET /projects?scope=all`, `DELETE /projects/{id}` |

**Rezultatas:** naudojami visi 37 metodai (`GET /health/ready` – tik diegimo
patikrai). Ši lentelė pereis į README kaip „metodas → langas“ atitiktis.

### E3. Laikmatis

Viršutinėje juostoje – veikianti sesija (`mm:ss` monospace, pulsuojantis
gintarinis taškas). „Pradėti“ → užduoties pasirinkimas iš `GET /tasks` →
`POST /sessions`; „Sustabdyti“ → `PATCH /sessions/{id}`. Laikas skaičiuojamas iš
`startedAt` kliente (`requestAnimationFrame` / 1 s intervalas), ne apklausiant API.
409 (jau yra neužbaigta sesija) → pranešimas su nuoroda į ją.

### E4. Klaidų ir tuščių būsenų politika

| Atsakymas | Rodymas |
|---|---|
| 422 su `details` | Klaida prie konkretaus lauko |
| 409 | `Toast` su paaiškinimu |
| 403 | „Neturite teisės“ puslapis / pranešimas |
| 404 | Next `not-found.tsx` Resend stiliumi |
| 502 `API_UNREACHABLE` | Juosta viršuje „Serveris nepasiekiamas“ |
| Tuščias sąrašas | `EmptyState` su ikona ir veiksmo mygtuku |
| Kraunama | `Skeleton`, ne sukutis |

---

## 6. Etapas F – animacijos ir perėjimai

Visos – CSS (`transition`, `@keyframes`), be bibliotekos; `prefers-reduced-motion`
jas išjungia.

- hero antraštė ir sekcijos – `fade-up` atsiradimas (`IntersectionObserver`);
- modalas – `opacity` + `scale(0.96 → 1)`, fonas – `backdrop-blur`;
- stalčius – `translateX(-100% → 0)`;
- mygtukai, eilutės, kortelės – `hover` rėmelio ir fono perėjimai (150 ms);
- skirtukų indikatorius slenka tarp skirtukų;
- veikiančios sesijos taškas – pulsavimas;
- `Toast` – įslydimas iš apačios.

---

## 7. Etapas G – diegimas Azure

| Dalis | Paslauga | Pastabos |
|---|---|---|
| DB | Azure Database for PostgreSQL Flexible Server, Burstable B1ms | TLS, užkarda – tik Azure paslaugoms |
| API | App Service (Linux, Node 22) | `npm run db:deploy` prieš paleidimą; `COOKIE_SECURE=true`, `WEB_ORIGIN` = web adresas |
| Web | App Service (tas pats planas) | `output: "standalone"`, `API_URL` = API vidinis adresas |
| CI/CD | `.github/workflows/deploy.yml` | Po sėkmingo `ci.yml` į `main`: migracijos → API → web |

**Kodėl ne Static Web Apps:** Next.js „hybrid“ palaikymas ten vis dar ribotas, o
`/api` kelias SWA rezervuotas jo paties funkcijoms – konfliktuoja su mūsų
tarpiniu maršrutu `/api/[...path]`. Pasirinkus App Service reikės atnaujinti
README 2 skyrių ir `docs/deployment-diagram.jpg`.

**Kodėl ne DB Docker'yje (Azure).** Docker lieka lokaliam darbui ir CI – ten jis
tinka. Debesyje jis būtų prastesnis pasirinkimas:

- App Service ir Container Apps konteineriai neturi nuolatinio disko – perkrovus konteinerį duomenų bazė dingsta;
- prijungiamas Azure Files tomas veikia per SMB, o PostgreSQL su juo turi žinomų `fsync` ir failų teisių problemų;
- vienintelis tvarkingas variantas – virtuali mašina su `docker compose`, bet tada patiems reikia prižiūrėti OS, TLS ir atsargines kopijas, o App Service tampa nereikalingas.

Flexible Server – valdoma paslauga (atsarginės kopijos, TLS, užkarda), jau
aprašyta README 2 skyriuje. Burstable B1ms su 32 GB turėtų įeiti į Azure 12 mėn.
nemokamų paslaugų paketą (750 val./mėn.) – **patikrinsim kuriant resursą**; jei
ne, kaina ~12–15 €/mėn. iš studento kredito.

Diegimo etapai:

1. `next.config.ts` – `output: "standalone"`; `apps/api` – build į `dist` jau yra;
2. Azure resursai (rankiniu būdu portale arba `az` komandomis – užrašome į README);
3. `deploy.yml` su `azure/webapps-deploy`, paslaptys – GitHub Secrets;
4. `db:seed` produkcijoje **vieną kartą**, kad gynimo metu būtų duomenų;
5. patikra: `/health/ready`, prisijungimas, CSV parsisiuntimas, slapukas `Secure`.

---

## 8. Etapas H – kokybė

- `npm run lint` ir `typecheck` web daliai CI jau paleidžiami per `--workspaces`;
- rankinis patikrinimas 375px, 768px, 1280px pločiais kiekvienam langui;
- prieinamumas: klaviatūra (`Tab` per meniu ir modalą), `aria-label` ikonų mygtukams, kontrastas ≥ 4.5:1 (pilkas `#a1a4a5` ant juodo – 8.4:1, tinka).

---

## 9. Etapas I – ataskaita

README papildymai:

- **9. Naudotojo sąsajos projektas** – wireframe'ai šalia realizacijos nuotraukų, dizaino sistema (spalvos, šriftai), „įkvėpta Resend“ paminėjimas;
- **10. Diegimas** – atnaujinta diagrama, Azure resursai, CI/CD;
- **8.3. 3 laboratorinis darbas** – reikalavimų lentelė (12 skyrius žemiau);
- **Išvados**;
- `docs/cheatsheet.md` – gynimo scenarijus sąsajoje.

---

## 10. Etapas J – papildomi dalykai (ne reikalavimai)

Užduotis jų neprašo, bet šiam projektui jie prasmingi – dalis išplaukia iš
paties README, dalis palengvina gynimą.

| # | Kas | Kodėl būtent šiam projektui | Prioritetas |
|---|---|---|---|
| J1 | **Gyva darbo eiga:** projekto puslapis ir `/p/[token]` atsinaujina kas 15 s (`refetchInterval`, tik kai kortelė matoma) | README 1.1 žada, kad užsakovas „realiu laiku matys darbo eigą“ – be to pažadas neįvykdytas | būtina |
| J2 | **`Referrer-Policy: no-referrer`** ir `noindex` puslapiui `/p/[token]` | Žetonas yra adrese – paspaudus išorinę nuorodą jis nutekėtų per `Referer` antraštę. API jau duoda `X-Robots-Tag`, bet pats puslapis – Next.js | būtina |
| J3 | **Lietuviškas formatavimas** per `Intl`: `1 234,50 €`, `2 val. 15 min.`, datos `2026-09-24`; `datetime-local` ↔ UTC konvertavimas vienoje vietoje (`lib/format.ts`) | Pinigai ir laikas – sistemos esmė; neteisinga laiko juosta = neteisinga ataskaita | būtina |
| J4 | **Klaidų ir krovimo puslapiai:** `not-found.tsx`, `error.tsx`, `loading.tsx` Resend stiliumi | Gynimo metu parodyti 404 / 403 per UI, ne tik per Postman | būtina |
| J5 | **Demonstracinio prisijungimo mygtukai** prisijungimo lange (užsakovas, specialistas, administratorius, užblokuotas), rodomi tik su `NEXT_PUBLIC_DEMO_MODE=true` | Gynimo metu rolės perjungiamos vienu paspaudimu, be slaptažodžių rinkimo | verta |
| J6 | **Optimistiniai atnaujinimai** keičiant užduoties būseną ir stabdant laikmatį | Sąsaja atrodo greita net su lėtu Azure B1 planu | verta |
| J7 | **Savas SVG logotipas ir `favicon`**, puslapių `<title>` / `description` | Resend logotipo nenaudojame, o `favicon.ico` dabar – Next.js numatytasis | verta |
| J8 | **Playwright „dūmų“ testai** CI: prisijungimas → projektas → sesija → ataskaita | Web dalis dabar CI tikrinama tik `lint` / `typecheck` | verta |
| J9 | **Lighthouse ≥ 90** (prieinamumas, gera praktika), rezultatų nuotrauka README | Objektyvus sąsajos kokybės įrodymas ataskaitoje | jei liks laiko |
| J10 | **⌘K komandų paletė** (paieška po projektus, „Pradėti laikmatį“) | Firminis Resend elementas; gražu, bet ne būtina | jei liks laiko |

---

## 11. Darbų eiliškumas

| # | Darbas | Rezultatas | Commit'as |
|---|---|---|---|
| 1 | A | Wireframe'ai (SVG) | *Add UI wireframes* |
| 2 | B1–B5, J3 | Autentifikacija, `apiFetch`, užklausų kabliai, `lib/format.ts` | *Add client auth and API data layer* |
| 3 | C, J7 | Žetonai, šriftai, UI komponentai, logotipas | *Add Resend-inspired design system* |
| 4 | D, J4 | Maketai, hamburger stalčius, klaidų puslapiai | *Add marketing, auth and app layouts* |
| 5 | E1, J2, J5 | Vieši puslapiai, demonstracinis prisijungimas | *Add public pages and auth screens* |
| 6 | E2 (projektai, užduotys), J1, J6 | Projekto darbo aplinka | *Add project workspace* |
| 7 | E2–E3 (sesijos, laikmatis) | Darbo žurnalas | *Add work log and session timer* |
| 8 | E2 (pasiūlymai, nuorodos, ataskaita) | | *Add proposals, share links and reports* |
| 9 | E2 (paskyra, administratorius) | | *Add account settings and admin area* |
| 10 | F | Animacijos | *Polish transitions and motion* |
| 11 | J8 | Playwright CI | *Add end-to-end smoke tests* |
| 12 | G | Diegimas | *Deploy to Azure App Service* |
| 13 | I, J9 | Ataskaita | *Document UI and deployment* |
| – | J10 | Jei liks laiko | *Add command palette* |

Commit'us darai tu – aš tik paruošiu pakeitimus ir pasiūlysiu pranešimą.

---

## 12. Reikalavimų atitikties lentelė (3 lab.)

| Reikalavimas | Kur tenkinamas |
|---|---|
| Wireframe'ai prieš realizaciją | `docs/wireframes/` (A), README 9 sk. |
| Adaptyvumas, `768px` lūžio taškas | Tailwind `md:`, maketai (D) |
| Hamburger meniu | Valdymo skydelio stalčius, marketingo navigacija (D) |
| Modalinis langas | Pasiūlymas, rankinė sesija, peržiūros nuoroda, patvirtinimai (`<dialog>`) |
| SVG ikonos | `lucide-react` |
| Google Fonts | Instrument Serif, Inter, Geist Mono per `next/font/google` |
| Perėjimai / animacijos | F etapas |
| Skirtingi Header / Content / Footer stiliai | D etapo lentelė |
| Įvairūs įvedimo elementai | `text`, `email`, `password`, `number`, `date`, `datetime-local`, `search`, `textarea`, `select`, `radio`, `checkbox` |
| Sąsaja naudoja API | Visi 37 metodai (E2 lentelė) |
| Autentifikacija kliente | Žetonas atmintyje, automatinis atnaujinimas (B) |
| Diegimas debesyje | Azure App Service + PostgreSQL Flexible Server (G) |
