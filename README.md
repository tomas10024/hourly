# Hourly

**T120B165 Saityno taikomųjų programų projektavimas** — projekto ataskaita

Kauno technologijos universitetas, Informatikos fakultetas

|  |  |
|---|---|
| Studentas | Tomas Barišauskas, IFF-3/2 |
| Dėstytojas | Tomas Blažauskas |
| Vieta ir metai | Kaunas, 2026 |

## Turinys

1. [Sprendžiamo uždavinio aprašymas](#1-sprendžiamo-uždavinio-aprašymas)
   - [1.1. Sistemos paskirtis](#11-sistemos-paskirtis)
   - [1.2. Funkciniai reikalavimai](#12-funkciniai-reikalavimai)
   - [1.3. Taikomosios srities objektai](#13-taikomosios-srities-objektai)
   - [1.4. Sąsajos metodai](#14-sąsajos-metodai)
2. [Sistemos architektūra](#2-sistemos-architektūra)
3. [Pasirinktų technologijų aprašymas](#3-pasirinktų-technologijų-aprašymas)
4. [Projekto paleidimas](#4-projekto-paleidimas)
5. [Klaidų apdorojimas](#5-klaidų-apdorojimas)
6. [Sąsajos demonstracija](#6-sąsajos-demonstracija)
7. [Reikalavimų atitiktis](#7-reikalavimų-atitiktis)

---

## 1. Sprendžiamo uždavinio aprašymas

### 1.1. Sistemos paskirtis

Projekto tikslas – sujungti darbų užsakovus ir laisvai samdomus specialistus vienoje aplinkoje bei užtikrinti skaidrią atliktų darbų laiko apskaitą.

Šiuo metu darbų paieška ir valandų fiksavimas dažniausiai vyksta atskirose priemonėse: susitariama socialiniuose tinkluose ar elektroniniu paštu, o valandos skaičiuojamos asmeninėse skaičiuoklėse. Dėl to užsakovas neturi galimybės matyti darbo eigos, o specialistui tenka rankiniu būdu rengti ataskaitas ir pagrįsti sugaištą laiką.

Veikimo principas – kuriamą platformą sudaro dvi dalys: internetinė aplikacija, kuria naudosis užsakovai, specialistai bei administratorius, ir aplikacijų programavimo sąsaja (angl. trump. API).

Užsakovas, norėdamas naudotis šia platforma, prisiregistruos prie internetinės aplikacijos ir galės paskelbti projektą: aprašyti darbo apimtį, nurodyti biudžeto rėžius bei pageidaujamą terminą. Priklausomai nuo pasirinkto režimo, užduotis projektui gali susivesti pats užsakovas arba jas pasiūlyti darbą laimėjęs specialistas.

Specialistai galės naršyti paskelbtus projektus ir teikti savo pasiūlymus, nurodydami kainą, valandinį įkainį bei numatomą atlikimo trukmę. Užsakovas, peržiūrėjęs gautus pasiūlymus, priims vieną iš jų – nuo to momento projektas įgyja vykdytoją.

Prasidėjus darbui, specialistas galės registruoti darbo sesijas prie konkrečių užduočių, o užsakovas realiu laiku matys darbo eigą ir sukauptą valandų skaičių. Pasibaigus darbui, sistema suformuos ataskaitą, kurioje pateikiama, kiek laiko skirta kiekvienai užduočiai ir kokia suma susidaro pagal sutartą įkainį.

Numatytas ir antrasis projektų kilmės būdas. Dalis darbų sutariama tiesiogiai – gyvai, telefonu ar per pažįstamus, o toks užsakovas paskyros platformoje neturi ir jos kurti nepageidauja. Tokiu atveju projektą susikuria pats specialistas, nurodydamas užsakovo pavadinimą laisvu tekstu. Pasiūlymų teikimo etapas praleidžiamas, o projektas iš karto pereina į vykdomo būseną.

Kad ir tiesiogiai sutarto darbo užsakovas galėtų matyti darbo eigą, specialistas jam sugeneruos peržiūros nuorodą. Ji suteikia prieigą prie konkretaus projekto neprisijungiant: atidaręs nuorodą užsakovas mato užduočių būsenas, sukauptas valandas ir susidariusią sumą. Nuoroda galioja ribotą laiką, yra tik skaitymo režimo ir bet kada gali būti atšaukta.

Administratorius prižiūrės platformos turinį: šalins taisyklių neatitinkančius projektus, blokuos pažeidėjų paskyras ir spręs kilusius nesutarimus.

Atsiskaitymai tarp šalių vykdomi už sistemos ribų – platforma atlieka darbų aikštelės ir laiko apskaitos funkciją, tačiau mokėjimų netarpininkauja.

### 1.2. Funkciniai reikalavimai

#### Neregistruotas sistemos naudotojas galės:

1. Peržiūrėti platformos reprezentacinį puslapį;
2. Peržiūrėti paskelbtų projektų sąrašą;
3. Peržiūrėti viešą projekto aprašymą;
4. Peržiūrėti projekto darbo eigą pagal gautą peržiūros nuorodą (matyti užduočių sąrašą ir jų būsenas, matyti sukauptų valandų suvestinę ir susidariusią sumą);
5. Užsiregistruoti prie platformos pasirenkant užsakovo arba specialisto rolę;
6. Prisijungti prie internetinės aplikacijos.

#### Registruotas sistemos naudotojas galės:

1. Atsijungti nuo internetinės aplikacijos;
2. Peržiūrėti ir redaguoti savo paskyros duomenis;
3. Peržiūrėti kito naudotojo viešą profilį;
4. Peržiūrėti savo projektų sąrašą.

#### Užsakovas galės:

1. Sukurti projektą:
   1. Nurodyti pavadinimą ir darbo aprašymą;
   2. Nurodyti biudžeto rėžius ir pageidaujamą terminą;
   3. Pasirinkti užduočių sudarymo režimą (užduotis sudaro užsakovas arba specialistas);
2. Sudaryti projekto užduočių sąrašą;
3. Paskelbti projektą viešai;
4. Peržiūrėti gautus pasiūlymus savo projektui;
5. Priimti vieną iš gautų pasiūlymų;
6. Atmesti pasiūlymą;
7. Patvirtinti specialisto pasiūlytas užduotis;
8. Peržiūrėti vykdomo projekto užduočių būsenas;
9. Peržiūrėti sukauptų valandų suvestinę pagal užduotis;
10. Suformuoti ir parsisiųsti projekto ataskaitą;
11. Redaguoti arba šalinti savo projektą;
12. Užbaigti projektą.

#### Specialistas galės:

1. Peržiūrėti paskelbtų projektų sąrašą ir jį filtruoti;
2. Pateikti pasiūlymą projektui:
   1. Nurodyti kainą ir valandinį įkainį;
   2. Nurodyti numatomą atlikimo trukmę;
   3. Pridėti laisvos formos žinutę užsakovui;
3. Peržiūrėti savo pateiktų pasiūlymų sąrašą ir jų būsenas;
4. Atšaukti savo pateiktą pasiūlymą;
5. Sudaryti laimėto projekto užduočių sąrašą, kai tokį režimą pasirinko užsakovas;
6. Sukurti tiesiogiai sutarto darbo projektą:
   1. Nurodyti pavadinimą, aprašymą ir valandinį įkainį;
   2. Nurodyti užsakovo pavadinimą, kai šis platformoje paskyros neturi;
   3. Sudaryti tokio projekto užduočių sąrašą;
7. Sugeneruoti projekto peržiūros nuorodą užsakovui;
8. Peržiūrėti sukurtų peržiūros nuorodų sąrašą ir jų galiojimo laiką;
9. Atšaukti peržiūros nuorodą;
10. Keisti užduoties būseną;
11. Registruoti darbo sesiją:
    1. Pradėti ir užbaigti laiko skaičiavimą;
    2. Įvesti sesiją rankiniu būdu;
    3. Pridėti komentarą apie atliktą darbą;
12. Redaguoti arba šalinti savo darbo sesiją;
13. Peržiūrėti savo darbo statistiką ir sukauptą uždarbį;
14. Suformuoti ir parsisiųsti projekto ataskaitą;
15. Užbaigti tiesiogiai sutartą projektą.

#### Administratorius galės:

1. Peržiūrėti visų naudotojų sąrašą;
2. Blokuoti ir atblokuoti naudotoją;
3. Šalinti naudotoją;
4. Peržiūrėti visus sistemoje esančius projektus;
5. Šalinti netinkamus projektus;
6. Peržiūrėti bet kurio projekto užduotis ir darbo sesijas sprendžiant ginčus.

### 1.3. Taikomosios srities objektai

Sistemos taikomosios srities objektai susieti hierarchiniu ir prasminiu ryšiu:

```
Projektas -> Užduotis -> Darbo sesija
```

**Projektas** yra darbas, kurį arba paskelbia užsakovas, arba tiesiogiai susikuria specialistas. Kiekvienas projektas skaidomas į **užduotis**, o kiekviena užduotis susideda iš **darbo sesijų**, kurias registruoja projektą vykdantis specialistas. Vidurinis lygmuo nėra vien struktūrinis: valandinis įkainis nurodomas projekto lygmenyje, tačiau atskira užduotis gali jį perrašyti, todėl sesijos vertė skaičiuojama pagal artimiausią nurodytą įkainį hierarchijoje.

Prie projekto taip pat siejami du hierarchijai nepriklausantys objektai. **Pasiūlymas** valdo aikštelės projekto gyvavimo ciklą, nes darbo sesijos gali atsirasti tik po to, kai vienas iš pasiūlymų priimamas. **Peržiūros nuoroda** suteikia paskyros neturinčiam užsakovui teisę skaityti konkretaus projekto darbo eigą.

### 1.4. Sąsajos metodai

Sąsaja suprojektuota pagal taikomosios srities objektų hierarchiją: kiekvienas
iš trijų pagrindinių objektų turi pilną penkių metodų rinkinį (sąrašas,
peržiūra, kūrimas, redagavimas, šalinimas).

**Projektas**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects` | Projektų sąrašas | 200 | 400 |
| `GET /projects/{id}` | Projekto duomenys | 200 | 400, 404 |
| `POST /projects` | Sukurti projektą | 201 | 400, 422 |
| `PATCH /projects/{id}` | Redaguoti, paskelbti arba užbaigti | 200 | 400, 403, 404, 422 |
| `DELETE /projects/{id}` | Šalinti projektą | 204 | 400, 403, 404 |

**Užduotis**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /tasks` | Naudotojo projektų užduotys | 200 | 400 |
| `GET /tasks/{id}` | Užduoties duomenys | 200 | 400, 404 |
| `POST /tasks` | Sukurti užduotį | 201 | 400, 403, 422 |
| `PATCH /tasks/{id}` | Redaguoti, perstumti, keisti būseną, patvirtinti | 200 | 400, 403, 404, 422 |
| `DELETE /tasks/{id}` | Šalinti užduotį | 204 | 400, 403, 404, 422 |

**Darbo sesija**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /sessions` | Naudotojo darbo žurnalas | 200 | 400 |
| `GET /sessions/{id}` | Sesijos duomenys | 200 | 400, 404 |
| `POST /sessions` | Pradėti sesiją arba įvesti rankiniu būdu | 201 | 400, 403, 409, 422 |
| `PATCH /sessions/{id}` | Redaguoti arba užbaigti sesiją | 200 | 400, 403, 404, 409, 422 |
| `DELETE /sessions/{id}` | Šalinti sesiją | 204 | 400, 403, 404, 422 |

**Hierarchiniai sąsajos metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects/{id}/tasks` | Konkretaus projekto užduotys | 200 | 400, 404 |
| `GET /tasks/{id}/sessions` | Konkrečios užduoties darbo sesijos | 200 | 400, 404 |
| `GET /projects/{id}/proposals` | Konkrečiam projektui pateikti pasiūlymai | 200 | 400, 403, 404 |

Nerastas tėvinis resursas grąžina 404, o ne tuščią sąrašą: „projekto nėra“ ir
„projektas yra, bet be užduočių“ yra du skirtingi atsakymai.

Projektų sąrašo metodas priima `scope` parametrą, nurodantį, kurios projektų
aibės prašoma: `GET /projects?scope=marketplace` grąžina viešai paskelbtus,
`scope=owned` – naudotojo sukurtus, `scope=assigned` – jo vykdomus. Toks
sprendimas pasirinktas vietoj atskirų adresų (pvz., `/my-projects`), nes
resursas išlieka tas pats, o keičiasi tik jo atrankos kriterijus. Papildomai
priimami `q` (paieška), `status`, `page` ir `perPage`.

**Pasiūlymų valdymo metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /proposals` | Savo pateiktų pasiūlymų sąrašas ir būsenos | 200 | 400 |
| `POST /projects/{id}/proposals` | Pateikti pasiūlymą | 201 | 400, 403, 404, 409, 422 |
| `PATCH /proposals/{id}` | Priimti, atmesti arba atšaukti | 200 | 400, 403, 404, 409, 422 |
| `DELETE /proposals/{id}` | Šalinti savo pasiūlymą | 204 | 400, 403, 404, 422 |

Pasiūlymo priėmimas vykdomas viena duomenų bazės transakcija: pasiūlymas įgyja
būseną `ACCEPTED`, kiti to projekto pasiūlymai atmetami, o projektas pereina į
`IN_PROGRESS` ir gauna vykdytoją. Būtent todėl `PATCH /projects/{id}` neleidžia
perėjimo `PUBLISHED → IN_PROGRESS` tiesiogiai – kitaip projektas galėtų atsidurti
vykdomoje būsenoje be priskirto specialisto.

**Peržiūros nuorodų ir ataskaitų metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects/{id}/shares` | Projekto peržiūros nuorodų sąrašas | 200 | 400, 403, 404 |
| `POST /projects/{id}/shares` | Sugeneruoti peržiūros nuorodą | 201 | 400, 403, 404, 422 |
| `DELETE /shares/{id}` | Atšaukti peržiūros nuorodą | 204 | 400, 403, 404 |
| `GET /public/projects/{token}` | Projekto darbo eiga pagal nuorodą | 200 | 400, 404 |
| `GET /projects/{id}/report` | Projekto ataskaita (JSON arba CSV) | 200 | 400, 403, 404, 406 |

Ataskaitos metodas taiko turinio derybas (angl. content negotiation): tas pats
resursas grąžinamas kaip `application/json` arba, nurodžius
`Accept: text/csv`, – kaip parsisiunčiamas CSV failas. Nepalaikomas tipas
grąžina 406, o ne tyliai JSON.

**Tarnybiniai metodai:** `GET /health` ir `GET /health/ready` (pastarasis tikrina
ir jungtį su duomenų baze).

**Papildomi metodai, skirti autentifikacijai** (numatyti 2 laboratoriniam
darbui): `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`,
`POST /auth/logout`, `GET /auth/me`.

> **Pastaba apie 1 laboratorinį darbą.** Autentifikacija dar nerealizuota, todėl
> veiksmą atliekančio naudotojo tapatybė perduodama `X-Actor-Id` antrašte. Tai
> nėra saugumo priemonė – ji leidžia realizuoti dalykines taisykles (savininko
> teisės, `scope=owned`), kol žetonų dar nėra. 2 laboratoriniame darbe keičiamas
> tik vienas failas (`src/lib/actor.ts`), kuriame antraštė pakeičiama patikrintu
> JWT turiniu, o patys sąsajos metodai lieka nepakitę.

---

## 2. Sistemos architektūra

Sistemos sudedamosios dalys:

- **Kliento pusė** (angl. Front-End) – naudojant Next.js (React.js);
- **Serverio pusė** (angl. Back-End) – naudojant Node.js ir Express karkasą;
- **Duomenų bazė** – PostgreSQL.

![Sistemos diegimo diagrama](docs/deployment-diagram.jpg)

*2.1 pav. Sistemos diegimo diagrama*

2.1 pav. pavaizduota kuriamos sistemos diegimo diagrama. Sistemos talpinimui yra naudojamos Microsoft Azure debesų technologijos.

Naudotojas su sistema sąveikauja per interneto naršyklę. Internetinė aplikacija yra talpinama Azure Static Web Apps paslaugoje ir pasiekiama saugiu HTTPS protokolu.

Šios sistemos veikimui (pvz., duomenų manipuliavimui su duomenų baze) yra reikalingas „Hourly“ API, kuris diegiamas atskiroje Azure App Service paslaugoje. Naršyklė į API tiesiogiai nesikreipia – užklausas persiunčia internetinė aplikacija, kuri veikia kaip tarpinis sluoksnis tarp naudotojo ir sąsajos. Toks sprendimas pasirinktas dėl saugumo: atnaujinimo žetonas saugomas `httpOnly` slapuke toje pačioje kilmėje (angl. origin), todėl jis nepasiekiamas kliento pusės scenarijams. Duomenų mainai tarp internetinės aplikacijos ir API vyksta JSON formatu, laikantis REST principų.

Pats „Hourly“ API vykdo duomenų mainus su duomenų baze – tam naudojama ORM sąsaja (Prisma). Duomenų bazė diegiama Azure Database for PostgreSQL Flexible Server paslaugoje, prieiga prie jos vykdoma šifruotu TLS kanalu ir apribota užkardos taisyklėmis, leidžiančiomis prisijungti tik iš API paslaugos.

---

## 3. Pasirinktų technologijų aprašymas

**Next.js (React)** – kliento pusės karkasas, pasirinktas dėl komponentinės architektūros ir serverio pusėje generuojamo turinio galimybės. Ji leidžia viešus projektų puslapius pateikti iš karto sugeneruotus, o naudotojo darbo aplinką – kaip vieno puslapio aplikaciją. Naudojama TanStack Query biblioteka užklausų būsenai ir podėliui valdyti bei Tailwind CSS apipavidalinimui.

**Node.js ir Express** – serverio pusės platforma ir karkasas. Pasirinkta dėl tos pačios programavimo kalbos abiejose sistemos dalyse, o tai leidžia dalytis tipų aprašais tarp kliento ir serverio. Express suteikia lankstų tarpinės programinės įrangos (angl. middleware) mechanizmą, patogų autentifikacijos ir autorizacijos tikrinimams įgyvendinti.

**Prisma ORM** – objektinio ir reliacinio atvaizdavimo sąsaja. Aprašo duomenų schemą viename faile, iš kurio generuojami tipizuoti duomenų prieigos metodai ir duomenų bazės migracijos.

**PostgreSQL** – reliacinė duomenų bazių valdymo sistema. Pasirinkta dėl dalinių unikalių indeksų (angl. partial unique index) palaikymo, kuris naudojamas užtikrinti, kad vienam projektui galėtų būti priimtas tik vienas pasiūlymas, o vienas naudotojas tuo pačiu metu galėtų turėti tik vieną neužbaigtą darbo sesiją.

**JWT (JSON Web Token)** – autentifikacijos ir autorizacijos priemonė. Naudojama trumpos galiojimo trukmės prieigos žetonų (15 min.) ir atnaujinimo žetonų pora. Atnaujinimo žetonas saugomas `httpOnly` slapuke, o duomenų bazėje laikoma tik jo maiša. Taikoma žetonų rotacijos strategija: kiekvienas atnaujinimas išduoda naują žetoną ir panaikina ankstesnįjį, o pakartotinai panaudojus jau anuliuotą žetoną panaikinama visa to naudotojo žetonų šeima.

**Gebėjimo žetonas** (angl. capability token) – antrasis prieigos mechanizmas, skirtas peržiūros nuorodoms. Skirtingai nei JWT, jis nesieja su naudotojo paskyra, o suteikia teisę skaityti vieną konkretų resursą. Žetonas generuojamas kriptografiškai saugiu atsitiktinių skaičių generatoriumi, duomenų bazėje saugoma tik jo maiša, galiojimo laikas ribotas, o teisės apribotos vien skaitymo metodais. Toks sprendimas leidžia dalytis darbo eiga su paskyros neturinčiu užsakovu, neįvedant papildomos registracijos. Kadangi žetonas perduodamas adreso eilutėje, atsakymuose nustatoma `X-Robots-Tag: noindex` antraštė, o nuoroda bet kada gali būti atšaukta nekeičiant paties projekto.

**OpenAPI 3.1** – sąsajos specifikacijos standartas. Specifikacija generuojama iš duomenų validavimo schemų (Zod) ir pateikiama per Swagger UI adresu `/api/docs`, taip užtikrinant, kad dokumentacija nenutoltų nuo realizacijos.

**Microsoft Azure** – debesų technologijų platforma, pasirinkta dėl universiteto suteikiamo studento kredito. Naudojamos Azure Static Web Apps, Azure App Service ir Azure Database for PostgreSQL Flexible Server paslaugos.

**Git ir GitHub Actions** – versijavimo sistema ir nepertraukiamo integravimo priemonė. Sujungus pakeitimus į pagrindinę šaką automatiškai paleidžiami testai, vykdomos duomenų bazės migracijos ir atnaujinamos Azure paslaugos.

---

## 4. Projekto paleidimas

### Reikalavimai

- Node.js 22 (žr. [.nvmrc](.nvmrc))
- Docker (PostgreSQL duomenų bazei) arba vietinė PostgreSQL 17

Duomenų bazės konteineris skelbiamas **5433** prievade, o ne įprastame 5432 –
taip išvengiama konflikto su kompiuteryje jau veikiančiu PostgreSQL. Prievadas
nurodytas [docker-compose.yml](docker-compose.yml) ir `apps/api/.env.example`
failuose.

### Saugyklos sandara

```
apps/api        Node.js + Express sąsaja (Prisma, Zod, OpenAPI)
apps/web        Next.js internetinė aplikacija (TanStack Query, Tailwind)
packages/shared Bendri Zod aprašai ir tipai, naudojami abiejose pusėse
```

### Paruošimas

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up
npm run db:migrate
npm run db:seed
```

### Kasdienis darbas

```bash
npm run dev
```

| Adresas | Paskirtis |
|---|---|
| http://localhost:3000 | Internetinė aplikacija |
| http://localhost:4000/api/health | Sąsajos būsenos patikrinimas |
| http://localhost:4000/api/docs | Sąsajos dokumentacija (Swagger UI) |

Naršyklė į API tiesiogiai nesikreipia – užklausos eina per Next.js maršrutą
[`/api/[...path]`](apps/web/src/app/api/%5B...path%5D/route.ts), kuris veikia kaip
tarpinis sluoksnis ir leidžia atnaujinimo žetoną laikyti `httpOnly` slapuke.

### Naudingos komandos

| Komanda | Paskirtis |
|---|---|
| `npm run dev:api` / `npm run dev:web` | Paleisti tik vieną dalį |
| `npm run db:up` / `npm run db:down` | Pakelti / sustabdyti duomenų bazės konteinerį |
| `npm run db:migrate` | Sukurti ir pritaikyti migraciją |
| `npm run db:studio` | Prisma Studio duomenų peržiūrai |
| `npm run lint` | Statinė analizė |
| `npm run test` | Testai |
| `npm run demo` | Sąsajos demonstracija (žr. 6 skyrių) |
| `npm run openapi:export` | Atnaujinti `docs/openapi.json` |
| `npm run build` | Sukompiliuoti visas dalis |

### Demonstracinės paskyros

Po `npm run db:seed` sukuriamos aštuonios paskyros, visos su slaptažodžiu
`slaptazodis123`:

| Paskyra | Rolė | Pastaba |
|---|---|---|
| `admin@hourly.lt` | Administratorius | |
| `uzsakovas@hourly.lt` | Užsakovas | Turi vykdomą ir užbaigtą projektą |
| `rasa@zalialanka.lt` | Užsakovas | Turi paskelbtą projektą su pasiūlymais |
| `mindaugas@kavinepupa.lt` | Užsakovas | Turi juodraštinį projektą |
| `specialistas@hourly.lt` | Specialistas | Pagrindinė demonstracijos paskyra |
| `gabija@dizainas.lt` | Specialistas | Užbaigė projektą su ataskaita |
| `tomas@frontend.lt` | Specialistas | Turi atmestą ir atsiimtą pasiūlymą |
| `ieva@duomenys.lt` | Specialistas | **Turi vykdomą darbo sesiją** |

Duomenyse yra visos projekto ir pasiūlymo būsenos, 20 užduočių, 24 darbo sesijos
(iš jų viena vykdoma) ir trys peržiūros nuorodos: galiojanti, pasibaigusi ir
atšaukta. Seed yra pakartojamas – paleidus iš naujo duomenys atstatomi, o
identifikatoriai nesikeičia.

Sukurti identifikatoriai ir peržiūros nuorodų žetonai įrašomi į
`docs/postman/demo-data.json` (failas negrįžta į Git, nes generuojamas iš naujo).

---

## 5. Klaidų apdorojimas

Visos klaidos grąžinamos vienodu formatu, nepriklausomai nuo to, kuriame
sluoksnyje jos kilo – schemos validavime, dalykinėje taisyklėje ar duomenų
bazės apribojime:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot change project status from PUBLISHED to IN_PROGRESS.",
    "details": { "from": "PUBLISHED", "to": "IN_PROGRESS" }
  }
}
```

`code` skirtas programai, `message` – žmogui, o neprivalomas `details` nurodo
konkretų lauką ar apribojimą. Validavimo klaidų atveju `details` yra laukų
medis, todėl kliento pusė gali pažymėti būtent tą įvedimo lauką, kuris
neatitiko reikalavimų.

### 5.1. Statuso kodų politika

| Kodas | Kada grąžinamas | Pavyzdys |
|---|---|---|
| 400 | Užklausos **sintaksė** netinkama – serveris jos net negali suprasti | netaisyklingas JSON, `id` ne UUID, `scope=nesamas` |
| 403 | Naudotojas atpažintas, bet neturi teisių į šį resursą | svetimo projekto redagavimas |
| 404 | Resurso nėra | nesamas projekto identifikatorius |
| 406 | Prašomas turinio tipas neprieinamas | `Accept: application/xml` ataskaitai |
| 409 | Konfliktas su esama duomenų būsena | antra neužbaigta darbo sesija |
| 422 | Užklausa suprantama, bet jos **turinys** prieštarauja taisyklėms | per trumpas pavadinimas, neleistinas būsenos perėjimas |

Skirtumas tarp 400 ir 422 yra esminis ir nuoseklus visoje sąsajoje: 400 reiškia
netvarkingą užklausą, 422 – tvarkingą užklausą su netinkamu turiniu. Dėl to
identifikatorius adreso eilutėje ir identifikatorius užklausos kūne elgiasi
skirtingai:

- `GET /projects/{nesamas-id}` → **404**, nes adresas nurodo neegzistuojantį resursą;
- `POST /tasks` su nesamu `projectId` → **422**, nes adresas teisingas, o klaida yra turinyje.

### 5.2. Mašininiai klaidų kodai

| Kodas | Reikšmė |
|---|---|
| `MALFORMED_JSON` | Užklausos kūnas nėra taisyklingas JSON |
| `INVALID_PATH_PARAM`, `INVALID_QUERY` | Netinkamas adreso arba užklausos parametras |
| `VALIDATION_ERROR` | Turinys neatitinka duomenų schemos |
| `ACTOR_REQUIRED`, `INVALID_ACTOR` | Trūksta arba netinkama `X-Actor-Id` antraštė |
| `FORBIDDEN` | Naudotojas neturi teisių į resursą |
| `NOT_FOUND` | Resursas nerastas |
| `INVALID_REFERENCE` | Nurodytas neegzistuojantis susijęs įrašas |
| `INVALID_STATUS_TRANSITION` | Neleistinas projekto būsenos perėjimas |
| `INVALID_BUDGET_RANGE`, `INVALID_TIME_RANGE`, `TIMESTAMP_IN_FUTURE` | Nenuoseklios reikšmės |
| `PROJECT_CLOSED`, `PROJECT_NOT_IN_PROGRESS`, `PROJECT_NOT_PUBLISHED` | Veiksmas neatitinka projekto būsenos |
| `NO_PROPOSAL_STAGE`, `PROPOSAL_NOT_PENDING`, `PROPOSAL_ACCEPTED` | Pasiūlymų gyvavimo ciklo taisyklės |
| `SESSION_ALREADY_RUNNING`, `PROPOSAL_ALREADY_SUBMITTED`, `CONFLICT` | Konfliktai su esama būsena |
| `NOT_ACCEPTABLE` | Neprieinamas prašomas turinio tipas |
| `INTERNAL_ERROR` | Vidinė serverio klaida (gamyboje priežastis neatskleidžiama) |

Dalis konfliktų tikrinama dviem lygmenimis: programa pateikia aiškų pranešimą,
o galutinę garantiją duoda duomenų bazės daliniai unikalūs indeksai
(`work_sessions_one_open_per_specialist`, `proposals_one_accepted_per_project`).
Tik pastarieji apsaugo tuo atveju, kai dvi užklausos ateina vienu metu.

---

## 6. Sąsajos demonstracija

Sąsajos veikimą galima patikrinti trimis būdais.

**1. Swagger UI** – adresu `http://localhost:4000/api/docs`. Specifikacija
generuojama iš tų pačių Zod schemų, kuriomis validuojamos užklausos, todėl
dokumentacija negali nutolti nuo realizacijos. Ta pati specifikacija saugoma ir
saugykloje: [docs/openapi.json](docs/openapi.json); nepertraukiamo integravimo
darbo eiga tikrina, ar įrašytas failas atitinka kodą.

**2. Automatinė demonstracija** – Postman kolekcija, paleidžiama per Newman:

```bash
npm run dev:api   # viename terminale
npm run demo      # kitame
```

Kolekciją taip pat galima importuoti į Postman
([kolekcija](docs/postman/hourly.postman_collection.json),
[aplinka](docs/postman/hourly.local.postman_environment.json)) ir paleisti
mygtuku „Run collection“.

Kolekciją sudaro trys dalys:

| Dalis | Turinys |
|---|---|
| 1. Darbo eiga | Pilnas gyvavimo ciklas: visi 15 pagrindinių metodų, hierarchiniai metodai, pasiūlymai, ataskaita (JSON ir CSV), peržiūros nuoroda |
| 2. Klaidų apdorojimas | Kodai 400, 403, 404, 406 ir 422 su skirtingomis priežastimis |
| 3. Valymas | Sukurtų duomenų šalinimas ir 204 bei 404 atsakymų patikra |

Scenarijus sukuria viską, ko jam reikia, ir pabaigoje ištrina, todėl
demonstraciją galima kartoti nepaleidžiant pradinių duomenų iš naujo. Rezultatas:

```
requests 44 | assertions 96 | failed 0 | total run duration: ~4s
```

Kadangi laikai užklausose fiksuoti, testai tikrina ne „kažkokį skaičių“, o
konkrečias reikšmes: serverio apskaičiuotą 90 minučių trukmę, iš projekto
paveldėtą 40 EUR/val. įkainį bei 210 minučių ir 140 EUR suvestinę – tą pačią
tiek ataskaitoje, tiek viešoje peržiūroje.

**3. Vienetiniai testai** – `npm run test` paleidžia 105 testus, tikrinančius
dalykines taisykles (būsenų perėjimus, įkainio paveldėjimą, trukmės
skaičiavimą, klaidų kodų politiką) ir tai, kad atsakymų struktūra atitinka
OpenAPI specifikaciją.

---

## 7. Reikalavimų atitiktis

| Reikalavimas | Kaip tenkinamas |
|---|---|
| Realizuoti visi numatyti API metodai | 27 dalykiniai metodai, iš jų 15 pagrindinių CRUD (1.4 skyrius) |
| OpenAPI specifikacija kiekvienam metodui | Generuojama iš Zod schemų, pateikiama `/api/docs` ir [docs/openapi.json](docs/openapi.json) |
| Patogi paleidimo aplinka | `npm install` → `npm run db:up` → `db:migrate` → `db:seed` → `npm run dev` |
| Duomenų bazės sprendimas | PostgreSQL 17 su Prisma ORM, migracijos saugykloje |
| Prasmingi duomenys gynimo metu | 8 naudotojai, 7 projektai (visos būsenos), 20 užduočių, 24 darbo sesijos, 7 pasiūlymai, 3 peržiūros nuorodos |
| Teisingas turinio tipas | `application/json` ir `text/csv` (ataskaitos parsisiuntimas) |
| 404, kai resursas nerandamas | 5 skyrius; demonstracijos 2 ir 3 dalys |
| 400 / 422 netinkamam turiniui | 5.1 skyrius; demonstracijoje – trys 400 ir trys 422 atvejai |
| 201 sukūrus resursą | Visi kūrimo metodai, kartu grąžinama `Location` antraštė |
| 200 / 204 ištrynus resursą | Visi šalinimo metodai grąžina 204 be turinio |
| Demonstracija iki ~15 s | `npm run demo` – 44 užklausos per ~4 s |
| Kodas Git saugykloje, dokumentacija | GitHub; ataskaita – šis `README.md`, darbų planas – [docs/planas.md](docs/planas.md) |

