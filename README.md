# Hourly

**T120B165 Saityno taikomųjų programų projektavimas** — projekto ataskaita

Kauno technologijos universitetas, Informatikos fakultetas

|  |  |
|---|---|
| Studentas | Tomas Barišauskas, IFF-3/2 |
| Dėstytojas | Tomas Blažauskas |
| Vieta ir metai | Kaunas, 2026 |

---

## Turinys

1. [Sprendžiamo uždavinio aprašymas](#1-sprendžiamo-uždavinio-aprašymas)
   - [1.1. Sistemos paskirtis](#11-sistemos-paskirtis)
   - [1.2. Funkciniai reikalavimai](#12-funkciniai-reikalavimai)
2. [Sistemos architektūra](#2-sistemos-architektūra)
   - [2.1. Diegimo diagrama](#21-diegimo-diagrama)
   - [2.2. Technologijos](#22-technologijos)
3. [Naudotojo sąsajos projektas](#3-naudotojo-sąsajos-projektas)
4. [API specifikacija](#4-api-specifikacija)
   - [4.1. Specifikacija ir pavyzdžiai](#41-specifikacija-ir-pavyzdžiai)
   - [4.2. Taikomosios srities objektai](#42-taikomosios-srities-objektai)
   - [4.3. Sąsajos metodai](#43-sąsajos-metodai)
   - [4.4. REST principai ir klaidos](#44-rest-principai-ir-klaidos)
5. [Išvados](#5-išvados)

Priedai: [A. Projekto paleidimas](#a-projekto-paleidimas) · [B. Reikalavimų atitiktis](#b-reikalavimų-atitiktis) · [C. Dirbtinio intelekto įrankių naudojimas](#c-dirbtinio-intelekto-įrankių-naudojimas) · [papildoma techninė medžiaga](docs/priedai.md)

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

---

## 2. Sistemos architektūra

Sistemą sudaro trys dalys:

- **kliento pusė** – Next.js (React) internetinė aplikacija;
- **serverio pusė** – Node.js ir Express REST API;
- **duomenų bazė** – PostgreSQL.

### 2.1. Diegimo diagrama

![Sistemos diegimo diagrama](docs/deployment-diagram.png)

*2.1 pav. Sistemos diegimo diagrama (UML)*

Sistema talpinama Microsoft Azure debesyje:

| Mazgas | Azure paslauga | Kas įdiegta |
|---|---|---|
| App Service planas `hourly-plan` | Linux B1, West Europe | Dvi Web App programos viename plane – mokama už planą, ne už programą |
| Web App `hourly-web` | Node.js 22 | Next.js `standalone` serveris: puslapiai, statiniai failai ir tarpinis maršrutas `/api/*` |
| Web App `hourly-api` | Node.js 22 | Express API su Prisma Client; prieš kiekvieną paleidimą vykdomos migracijos (`prisma migrate deploy`) |
| Duomenų bazė | Azure Database for PostgreSQL Flexible Server, Burstable B1ms | PostgreSQL 17, 7 lentelės |
| GitHub Actions | GitHub | `ci.yml` (testai) ir `deploy.yml` (zip paketų įkėlimas į abi Web App) |

Naudotojas su sistema sąveikauja per interneto naršyklę **tik HTTPS** protokolu ir **tik su `hourly-web`**. Naršyklė į API tiesiogiai nesikreipia: visas `/api/*` užklausas persiunčia Next.js tarpinis maršrutas ([route.ts](apps/web/src/app/api/%5B%5B...path%5D%5D/route.ts)). Taip atnaujinimo žetonas gali gyventi `httpOnly` slapuke toje pačioje kilmėje (angl. origin) ir yra nepasiekiamas kliento scenarijams. Tarp `hourly-web` ir `hourly-api` keliauja JSON (REST), kartu perduodamas `X-Forwarded-For`, kad bandymų ribojimas matytų tikrą naudotojo adresą, o ne tarpinio serverio.

API su duomenų baze jungiasi PostgreSQL protokolu per TLS (`sslmode=require`), o duomenų bazės užkarda leidžia prisijungti tik Azure paslaugoms.

### 2.2. Technologijos

| Sritis | Technologija | Kodėl |
|---|---|---|
| Kliento pusė | Next.js (React), TanStack Query, Tailwind CSS | Vieši projektų puslapiai generuojami serveryje, o darbo aplinka veikia kaip vieno puslapio aplikacija |
| Serverio pusė | Node.js 22, Express 5 | Ta pati kalba abiejose pusėse, todėl Zod schemos ir tipai bendri (`@hourly/shared`) |
| Duomenys | PostgreSQL 17, Prisma ORM | Reliacinė hierarchija su kaskadomis ir transakcijomis; daliniai unikalūs indeksai užtikrina „vienas priimtas pasiūlymas“ ir „viena vykdoma sesija“ |
| Validavimas ir specifikacija | Zod, OpenAPI 3.1 | Ta pati schema tikrina užklausas ir generuoja specifikaciją (4 skyrius) |
| Autentifikacija | JWT (15 min.) ir besisukantys atnaujinimo žetonai `httpOnly` slapuke | Rolė žinoma be užklausos duomenų bazei, atsijungimas veikia iš karto |
| Peržiūros nuorodos | Gebėjimo žetonas (angl. capability token) | Užsakovas be paskyros mato vieną projektą tik skaitymui; duomenų bazėje saugoma tik žetono maiša |
| Diegimas | Microsoft Azure (App Service, PostgreSQL Flexible Server), GitHub Actions | Studento kreditas; po kiekvieno sujungimo į `main` automatiškai paleidžiami testai ir atnaujinamos abi programos |

Palyginimas su alternatyvomis (MySQL, MongoDB, SQLite, SQL Server) ir išsamesnis sprendimų aprašas – [priedų 1 skyriuje](docs/priedai.md#1-technologijų-pasirinkimas).

---

## 3. Naudotojo sąsajos projektas

### 3.1. Titulinis puslapis

Adresas: `/`.

![W1 wireframe: Titulinis puslapis](docs/wireframes/01-titulinis.svg)

*3.1 pav. W1 wireframe – titulinis puslapis*

![Realizacija](docs/screenshots/01-titulinis.png)

*3.2 pav. Realizacija*

<img src="docs/screenshots/01-titulinis-mobilus.png" alt="Realizacija – mobilusis vaizdas" width="320">

*3.3 pav. Realizacija – mobilusis vaizdas*

### 3.2. Registracija ir prisijungimas

Adresas: `/register, /login`.

![W2 wireframe: Registracija ir prisijungimas](docs/wireframes/02-registracija.svg)

*3.4 pav. W2 wireframe – registracija ir prisijungimas*

![Realizacija](docs/screenshots/02-registracija.png)

*3.5 pav. Realizacija*

### 3.3. Projektų aikštelė

Adresas: `/projects`.

![W3 wireframe: Projektų aikštelė](docs/wireframes/03-aikstele.svg)

*3.6 pav. W3 wireframe – projektų aikštelė*

![Realizacija](docs/screenshots/03-aikstele.png)

*3.7 pav. Realizacija*

### 3.4. Viešas projektas ir pasiūlymo modalas

Adresas: `/projects/[id]`.

![W4 wireframe: Viešas projektas ir pasiūlymo modalas](docs/wireframes/04-projektas-pasiulymas.svg)

*3.8 pav. W4 wireframe – viešas projektas ir pasiūlymo modalas*

![Realizacija](docs/screenshots/04-projektas.png)

*3.9 pav. Realizacija*

![Realizacija – pasiūlymo modalas](docs/screenshots/04-pasiulymo-modalas.png)

*3.10 pav. Realizacija – pasiūlymo modalas*

### 3.5. Programos karkasas ir apžvalga

Adresas: `/app`.

![W5 wireframe: Programos karkasas ir apžvalga](docs/wireframes/05-programos-karkasas.svg)

*3.11 pav. W5 wireframe – programos karkasas ir apžvalga*

![Realizacija](docs/screenshots/05-programos-karkasas.png)

*3.12 pav. Realizacija*

<img src="docs/screenshots/05-programos-karkasas-mobilus.png" alt="Realizacija – mobilusis vaizdas, atidarytas hamburger meniu" width="320">

*3.13 pav. Realizacija – mobilusis vaizdas, atidarytas hamburger meniu*

### 3.6. Projekto darbo aplinka (užduotys)

Adresas: `/app/projects/[id]`.

![W6 wireframe: Projekto darbo aplinka (užduotys)](docs/wireframes/06-projekto-aplinka.svg)

*3.14 pav. W6 wireframe – projekto darbo aplinka (užduotys)*

![Realizacija](docs/screenshots/06-projekto-aplinka.png)

*3.15 pav. Realizacija*

### 3.7. Užduoties skydelis ir darbo sesijos

Adresas: `/app/projects/[id]?task=…`.

![W7 wireframe: Užduoties skydelis ir darbo sesijos](docs/wireframes/07-uzduoties-skydelis.svg)

*3.16 pav. W7 wireframe – užduoties skydelis ir darbo sesijos*

![Realizacija](docs/screenshots/07-uzduoties-skydelis.png)

*3.17 pav. Realizacija*

### 3.8. Darbo žurnalas, laikmatis, rankinis įvedimas

Adresas: `/app/sessions`.

![W8 wireframe: Darbo žurnalas, laikmatis, rankinis įvedimas](docs/wireframes/08-darbo-zurnalas.svg)

*3.18 pav. W8 wireframe – darbo žurnalas, laikmatis, rankinis įvedimas*

![Realizacija](docs/screenshots/08-darbo-zurnalas.png)

*3.19 pav. Realizacija*

![Realizacija – rankinio įvedimo modalas](docs/screenshots/08-rankinis-ivedimas.png)

*3.20 pav. Realizacija – rankinio įvedimo modalas*

### 3.9. Administravimas: naudotojai

Adresas: `/app/admin/users`.

![W9 wireframe: Administravimas: naudotojai](docs/wireframes/09-administravimas.svg)

*3.21 pav. W9 wireframe – administravimas: naudotojai*

![Realizacija](docs/screenshots/09-administravimas.png)

*3.22 pav. Realizacija*

![Realizacija – blokavimo patvirtinimas](docs/screenshots/09-blokavimo-modalas.png)

*3.23 pav. Realizacija – blokavimo patvirtinimas*

### 3.10. Modaliniai langai

Adresas: visa programa.

![W10 wireframe: Modaliniai langai](docs/wireframes/10-modalai.svg)

*3.24 pav. W10 wireframe – modaliniai langai*

![Realizacija – užduoties kūrimo forma](docs/screenshots/10-nauja-uzduotis.png)

*3.25 pav. Realizacija – užduoties kūrimo forma*

![Realizacija – šalinimo patvirtinimas](docs/screenshots/10-salinimo-patvirtinimas.png)

*3.26 pav. Realizacija – šalinimo patvirtinimas*

![Realizacija – peržiūros nuoroda rodoma tik kartą](docs/screenshots/10-nuoroda-sukurta.png)

*3.27 pav. Realizacija – peržiūros nuoroda rodoma tik kartą*

---

## 4. API specifikacija

### 4.1. Specifikacija ir pavyzdžiai

- **[api-spec.yaml](api-spec.yaml)** – OpenAPI 3.1 specifikacija (atskiras failas);
- **[docs/api.md](docs/api.md)** – ta pati specifikacija skaitomu formatu GitHub'e: kiekvienam metodui galimi atsako kodai ir užklausos bei atsakymo pavyzdžiai;
- **Swagger UI** – veikiančiame API adresu `/api/docs`.

Specifikacija **negali nutolti nuo kodo**, nes ji generuojama iš tų pačių Zod schemų, kuriomis API validuoja užklausas ([openapi.ts](apps/api/src/openapi.ts)). `npm run openapi:export` įrašo `api-spec.yaml`, `docs/api.md` ir `docs/openapi.json`, o CI kiekvienam pakeitimui patikrina, ar įrašyti failai sutampa su sugeneruotais.

**Pavyzdžiai nėra išgalvoti.** Jie užfiksuoti paleidus Postman kolekciją (140 užklausų) prieš pradinius duomenis: įrankis [capture-examples.ts](apps/api/src/tools/capture-examples.ts) perskaito Newman rezultatą, kiekvienam metodui ir atsako kodui pasilieka pirmą tikrą užklausą su atsakymu ir įrašo juos į [openapi-examples.json](apps/api/src/openapi-examples.json). Taip gauti **79 pavyzdžiai visiems 41 metodui**. Kodams, kurių kolekcija konkrečiam metodui nesukelia (pvz., 401 be žetono kiekvienam metodui), pateikiamas tipinis atsakymas, pažymėtas `docs/api.md` kaip „tipinis“.

```bash
npm run demo -- --reporters cli,json --reporter-json-export run.json
npm run openapi:examples --workspace apps/api -- run.json
npm run openapi:export
```

Pavyzdys iš [docs/api.md](docs/api.md) – užduoties sukūrimas (atsakymas sutrumpintas):

```http
POST /api/projects/0a58902e-04dc-4b50-ac2d-7ae651b5c044/tasks HTTP/1.1
Authorization: Bearer <prieigos žetonas>
Content-Type: application/json

{
  "title": "Demonstracinė užduotis",
  "estimatedHours": 8
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/projects/0a58902e-04dc-4b50-ac2d-7ae651b5c044/tasks/cb7c1343-bb32-4d18-9690-a53de1e95e6f

{
  "id": "cb7c1343-bb32-4d18-9690-a53de1e95e6f",
  "title": "Demonstracinė užduotis",
  "status": "TODO",
  "estimatedHours": 8,
  …
  "_links": { "self": { "href": "/api/projects/0a58902e-…/tasks/cb7c1343-…" }, … }
}
```

Tas pats metodas su nesamu projektu grąžina 404, su per trumpu pavadinimu – 422; šie ir visi kiti atsakymai su pavyzdžiais pateikti [docs/api.md](docs/api.md). Visų metodų suvestinė su galimais atsako kodais – 4.3 poskyryje.

### 4.2. Taikomosios srities objektai

Sistemos taikomosios srities objektai susieti hierarchiniu ir prasminiu ryšiu:

```
Projektas -> Užduotis -> Darbo sesija
```

**Projektas** yra darbas, kurį arba paskelbia užsakovas, arba tiesiogiai susikuria specialistas. Kiekvienas projektas skaidomas į **užduotis**, o kiekviena užduotis susideda iš **darbo sesijų**, kurias registruoja projektą vykdantis specialistas. Vidurinis lygmuo nėra vien struktūrinis: valandinis įkainis nurodomas projekto lygmenyje, tačiau atskira užduotis gali jį perrašyti, todėl sesijos vertė skaičiuojama pagal artimiausią nurodytą įkainį hierarchijoje.

Prie projekto taip pat siejami du hierarchijai nepriklausantys objektai. **Pasiūlymas** valdo aikštelės projekto gyvavimo ciklą, nes darbo sesijos gali atsirasti tik po to, kai vienas iš pasiūlymų priimamas. **Peržiūros nuoroda** suteikia paskyros neturinčiam užsakovui teisę skaityti konkretaus projekto darbo eigą.

### 4.3. Sąsajos metodai

Sąsaja suprojektuota pagal taikomosios srities objektų hierarchiją: kiekvienas iš trijų pagrindinių objektų turi pilną penkių metodų rinkinį (sąrašas, peržiūra, kūrimas, redagavimas, šalinimas).

Hierarchija atsispindi adresuose: užduotis pasiekiama tik per jos projektą, o darbo sesija – per projektą ir užduotį:

```
/projects/{projectId}/tasks/{taskId}/sessions/{sessionId}
```

Kiekvienas identifikatorius ieškomas **savo tėvo viduje** (apimties valdymas per URL, angl. scoping). Todėl kito projekto užduotis, paprašyta šio projekto adresu, grąžina **404** – tokiu adresu resurso tiesiog nėra. Paieška vyksta iš išorės į vidų, tad klaidos pranešimas įvardija pirmą netinkantį lygį („Task … does not exist in project …“). Tai realizuota vienoje vietoje – [lib/scope.ts](apps/api/src/lib/scope.ts). Tas pats principas taikomas pasiūlymams ir peržiūros nuorodoms.

Lentelėse nurodyti klaidų kodai, būdingi konkrečiam metodui. Be jų, bet kuris metodas su netinkamu ar pasibaigusiu prieigos žetonu grąžina **401**, o užblokuoto naudotojo žetonu – **403**. 

**Projektas**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects` | Projektų sąrašas | 200 | 400, 401, 403 |
| `GET /projects/{id}` | Projekto duomenys | 200 | 400, 404 |
| `POST /projects` | Sukurti projektą | 201 | 400, 401, 403, 422 |
| `PATCH /projects/{id}` | Redaguoti, paskelbti arba užbaigti | 200 | 400, 401, 403, 404, 422 |
| `DELETE /projects/{id}` | Šalinti projektą | 204 | 400, 401, 403, 404 |

**Užduotis**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects/{projectId}/tasks` | Projekto užduotys | 200 | 400, 404 |
| `GET /projects/{projectId}/tasks/{taskId}` | Užduoties duomenys | 200 | 400, 404 |
| `POST /projects/{projectId}/tasks` | Sukurti užduotį | 201 | 400, 401, 403, 404, 422 |
| `PATCH /projects/{projectId}/tasks/{taskId}` | Redaguoti, perstumti, keisti būseną, patvirtinti | 200 | 400, 401, 403, 404, 422 |
| `DELETE /projects/{projectId}/tasks/{taskId}` | Šalinti užduotį | 204 | 400, 401, 403, 404, 422 |

**Darbo sesija**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects/{projectId}/tasks/{taskId}/sessions` | Užduoties darbo sesijos (visi trys hierarchijos lygiai) | 200 | 400, 401, 403, 404 |
| `GET /projects/{projectId}/tasks/{taskId}/sessions/{sessionId}` | Sesijos duomenys | 200 | 400, 401, 403, 404 |
| `POST /projects/{projectId}/tasks/{taskId}/sessions` | Pradėti sesiją arba įvesti rankiniu būdu | 201 | 400, 401, 403, 404, 409, 422 |
| `PATCH /projects/{projectId}/tasks/{taskId}/sessions/{sessionId}` | Redaguoti arba užbaigti sesiją | 200 | 400, 401, 403, 404, 409, 422 |
| `DELETE /projects/{projectId}/tasks/{taskId}/sessions/{sessionId}` | Šalinti sesiją | 204 | 400, 401, 403, 404, 422 |

Nerastas tėvinis resursas grąžina 404, o ne tuščią sąrašą: „projekto nėra“ ir „projektas yra, bet be užduočių“ yra du skirtingi atsakymai.

**Asmeniniai vaizdai.** Du sąrašai apima kelis projektus iš karto, todėl negali būti vieno projekto viduje. Tai ne antri užduočių ar sesijų adresai, o naudotojo atranka; kiekvienas elementas turi `projectId` (ir `taskId`), iš kurių sudaromas jo vienintelis adresas.

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /tasks` | Naudotojo projektų užduotys | 200 | 400, 401 |
| `GET /sessions` | Naudotojo darbo žurnalas | 200 | 400, 401 |

Žinomu adresu naudojant nepalaikomą metodą (pvz., `PUT /projects/{id}`) grąžinama **405** su `Allow` antrašte, išvardijančia palaikomus metodus. Sąrašas sudaromas iš pačių maršrutų, todėl negali jiems prieštarauti.

Projektų sąrašo metodas priima `scope` parametrą, nurodantį, kurios projektų aibės prašoma: `GET /projects?scope=marketplace` grąžina viešai paskelbtus, `scope=owned` – naudotojo sukurtus, `scope=assigned` – jo vykdomus, o `scope=all` – visus sistemos projektus (tik administratoriui). Toks sprendimas pasirinktas vietoj atskirų adresų (pvz., `/my-projects`), nes resursas išlieka tas pats, o keičiasi tik jo atrankos kriterijus.

**Puslapiavimas ir filtravimas.** Visi sąrašai grąžinami vienodu voku ir priima `page` (nuo 1) bei `perPage` (1–100, numatytasis 20):

```json
{ "items": [ ... ], "page": 2, "perPage": 20, "total": 47, "totalPages": 3 }
```

`total` ir elementai skaičiuojami vienoje transakcijoje, todėl negali prieštarauti vienas kitam. Puslapis už sąrašo pabaigos grąžina 200 su tuščiu `items`, o ne 404 – kolekcija egzistuoja, tik tiek elementų neturi.

| Sąrašas | Filtrai |
|---|---|
| `GET /projects` | `scope`, `q` (pavadinimas, aprašymas), `status`, `origin` |
| `GET /projects/{projectId}/tasks` | `status`, `q` |
| `GET /tasks` | `projectId`, `status`, `q` |
| `GET …/tasks/{taskId}/sessions` | `from`, `to`, `running` |
| `GET /sessions` | `projectId`, `taskId`, `from`, `to`, `running` |
| `GET /proposals`, `GET /projects/{projectId}/proposals` | `status` |
| `GET /projects/{projectId}/shares` | `active` (neatšauktos ir nepasibaigusios) |
| `GET /users` | `q` (vardas, el. paštas), `role`, `isBlocked` |

`from` ir `to` priima datą (`2026-09-01`) arba laiko žymą ir atrenka pagal pradžios laiką pusiau atviru intervalu `from <= startedAt < to`, todėl gretimi laikotarpiai (vienos savaitės `to` – kitos `from`) sesijos neskaičiuoja dukart. Loginiai filtrai priima tik žodžius `true` ir `false`. Netinkama reikšmė arba `from`, einantis po `to`, grąžina 400.

**Hypermedia.** Kiekvienas resursas grąžinamas su `_links` objektu (HAL stilius), kuriame yra dviejų rūšių nuorodos:

- **ryšiai** – kur rasti susijusius resursus: `self`, `project`, `task`,  `tasks`, `sessions`, `report`, `client`, `specialist`;
- **veiksmai** – ką kviečiantysis gali daryti **dabar**, su HTTP metodu: `update`, `delete`, `publish`, `complete`, `cancel`, `create-task`, `submit-proposal`, `start-session`, `stop`, `approve`, `accept`, `reject`, `withdraw`, `revoke`.

```json
{
  "id": "…", "status": "IN_PROGRESS", "endedAt": null,
  "_links": {
    "self":    { "href": "/api/projects/P/tasks/T/sessions/S" },
    "task":    { "href": "/api/projects/P/tasks/T" },
    "project": { "href": "/api/projects/P" },
    "stop":    { "href": "/api/projects/P/tasks/T/sessions/S", "method": "PATCH" }
  }
}
```

Veiksmai priklauso nuo kviečiančiojo rolės ir resurso būsenos: juodraštis užsakovui siūlo `publish`, paskelbtas projektas specialistui – `submit-proposal`, vykdoma sesija jos autoriui – `stop`, o svečiui nesiūloma nieko. Veiksmo nuoroda rodoma tada ir tik tada, kai maršrutas užklausą priimtų, nes sprendžiama paleidžiant **tas pačias** `assert*` taisykles ([lib/links.ts](apps/api/src/lib/links.ts), funkcija `allows`), o ne jų kopiją. Todėl klientas gali rodyti mygtukus pagal nuorodas ir nežinoti teisių lentelės. Vienintelis dalykas, kurio nuoroda negali garantuoti, – konfliktas su kitais resursais (409), pvz., antra vykdoma sesija.

Būsenos perėjimai (`publish`, `complete`, `cancel`, `accept`, `reject`, `withdraw`, `stop`) yra `PATCH` tuo pačiu adresu – su `{"status": …}` arba, sesijai, su `{"endedAt": …}`. Sąrašų vokas turi `self`, `first`, `last` ir, kai yra, `prev` bei `next`; jos išlaiko visus užklausos filtrus. Adresai santykiniai (`/api/…`), todėl veikia ir per web tarpinį maršrutą, ir įdiegus.

Įėjimo taškas `GET /api` grąžina nuorodas į viską, ką kviečiantysis gali pasiekti: svečiui – aikštelę, registraciją ir prisijungimą, prisijungusiam – savo projektus, užduotis, sesijas ar pasiūlymus, administratoriui – ir naudotojų sąrašą. Klientui užtenka žinoti šį vieną adresą.

**Pasiūlymų valdymo metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /proposals` | Savo pateiktų pasiūlymų sąrašas ir būsenos | 200 | 400, 401 |
| `GET /projects/{projectId}/proposals` | Projektui pateikti pasiūlymai | 200 | 400, 401, 404 |
| `GET /projects/{projectId}/proposals/{proposalId}` | Pasiūlymo duomenys | 200 | 400, 401, 404 |
| `POST /projects/{projectId}/proposals` | Pateikti pasiūlymą | 201 | 400, 401, 403, 404, 409, 422 |
| `PATCH /projects/{projectId}/proposals/{proposalId}` | Priimti, atmesti arba atšaukti | 200 | 400, 401, 403, 404, 409, 422 |
| `DELETE /projects/{projectId}/proposals/{proposalId}` | Šalinti savo pasiūlymą | 204 | 400, 401, 403, 404, 422 |

Pasiūlymo priėmimas vykdomas viena duomenų bazės transakcija: pasiūlymas įgyja būseną `ACCEPTED`, kiti to projekto pasiūlymai atmetami, o projektas pereina į `IN_PROGRESS` ir gauna vykdytoją. Būtent todėl `PATCH /projects/{id}` neleidžia perėjimo `PUBLISHED → IN_PROGRESS` tiesiogiai – kitaip projektas galėtų atsidurti vykdomoje būsenoje be priskirto specialisto.

**Peržiūros nuorodų ir ataskaitų metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /projects/{projectId}/shares` | Projekto peržiūros nuorodų sąrašas | 200 | 400, 401, 403, 404 |
| `POST /projects/{projectId}/shares` | Sugeneruoti peržiūros nuorodą | 201 | 400, 401, 403, 404, 422 |
| `DELETE /projects/{projectId}/shares/{shareId}` | Atšaukti peržiūros nuorodą | 204 | 400, 401, 403, 404 |
| `GET /public/projects/{token}` | Projekto darbo eiga pagal nuorodą | 200 | 400, 404 |
| `GET /projects/{id}/report` | Projekto ataskaita (JSON arba CSV) | 200 | 400, 401, 403, 404, 406 |

Ataskaitos metodas taiko turinio derybas (angl. content negotiation): tas pats resursas grąžinamas kaip `application/json` arba, nurodžius `Accept: text/csv`, – kaip parsisiunčiamas CSV failas. Nepalaikomas tipas grąžina 406, o ne tyliai JSON.

**Tarnybiniai metodai:** `GET /api` (įėjimo taškas su nuorodomis), `GET /health` ir `GET /health/ready` (pastarasis tikrina ir jungtį su duomenų baze).

**Autentifikacijos metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `POST /auth/register` | Registracija, pasirenkant užsakovo arba specialisto rolę | 201 | 400, 409, 422 |
| `POST /auth/login` | Prisijungimas | 200 | 400, 401, 403, 422 |
| `POST /auth/refresh` | Naujas prieigos žetonas (atnaujinimo žetono rotacija) | 200 | 401, 403 |
| `POST /auth/logout` | Atsijungimas | 204 | – |
| `GET /auth/me` | Savo paskyros duomenys | 200 | 401 |
| `PATCH /auth/me` | Redaguoti savo vardą, aprašymą arba slaptažodį | 200 | 400, 401, 422 |

**Naudotojų valdymo metodai:**

| Metodas | Paskirtis | Sėkmė | Klaidos |
|---|---|---|---|
| `GET /users` | Visų naudotojų sąrašas (administratorius) | 200 | 400, 401, 403 |
| `GET /users/{id}` | Kito naudotojo viešas profilis | 200 | 400, 401, 404 |
| `PATCH /users/{id}` | Užblokuoti arba atblokuoti naudotoją (administratorius) | 200 | 400, 401, 403, 404, 422 |
| `DELETE /users/{id}` | Šalinti naudotoją be darbo istorijos (administratorius) | 204 | 400, 401, 403, 404, 409, 422 |

Iš viso sąsaja turi 41 metodą: 28 dalykinius (iš jų 15 pagrindinių CRUD), 6 autentifikacijos, 4 naudotojų valdymo ir 3 tarnybinius. Kiekvieno jų užklausos ir atsakymo pavyzdžiai – [docs/api.md](docs/api.md).

### 4.4. REST principai ir klaidos

Sąsaja laikosi REST apribojimų: klientas ir serveris atskirti, kiekviena užklausa neša visą reikiamą informaciją (prieigos žetoną), atsakymai turi `Cache-Control` ir `ETag` (pakartotinis `GET` grąžina 304), resursai identifikuojami daiktavardžiais URI, o leidžiami veiksmai pateikiami `_links` nuorodomis. `PATCH` keičia tik pateiktus laukus, todėl `PUT` grąžina 405.

Visos klaidos grąžinamos vienodu formatu: `code` skirtas programai, `message` – žmogui, o `details` nurodo konkretų lauką ar apribojimą.

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot change project status from PUBLISHED to IN_PROGRESS.",
    "details": { "from": "PUBLISHED", "to": "IN_PROGRESS" }
  }
}
```

400 reiškia netvarkingą užklausą (pvz., `id` ne UUID), 422 – tvarkingą užklausą su netinkamu turiniu, o nesamas arba naudotojui nematomas resursas visada grąžina 404.

---

## 5. Išvados

1. **Sukurta veikianti trijų dalių sistema** – REST API (41 metodas), Next.js internetinė aplikacija ir PostgreSQL duomenų bazė, įdiegtos Azure debesyje su automatiniu diegimu iš GitHub.
2. **Taikomosios srities hierarchija atspindėta adresuose** (`/projects/{id}/tasks/{id}/sessions/{id}`), o kiekvienas vaikas ieškomas savo tėvo viduje. Dėl to teisių klaida „pasiekiau svetimą užduotį per kitą projektą“ išnyksta struktūriškai – ji tikrinama vienoje vietoje lib/scope.ts, o ne kiekviename metode.
3. **Hypermedia nuorodos (`_links`) skaičiuojamos tomis pačiomis teisių taisyklėmis, kurias vykdo API.** Klientas mygtukus rodo pagal nuorodas, todėl teisių logika neturi antros kopijos naršyklėje ir negali su API išsiskirti – pakeitus taisyklę serveryje, sąsaja prisitaiko be pakeitimų.
4. **Validavimo schemos (Zod) bendros klientui ir serveriui, o OpenAPI specifikacija generuojama iš jų.** Viena taisyklė tikrina formą naršyklėje, užklausą API ir aprašoma dokumentacijoje; CI patikrina, kad įrašyta specifikacija atitinka kodą. Dokumentacija tapo kodo rezultatu, o ne atskiru darbu, kurį reikia prisiminti atnaujinti.
5. **API pavyzdžiai užfiksuoti iš tikrų atsakymų** (79 pavyzdžiai, visi 41 metodas). Tai garantuoja, kad pavyzdžiai atitinka realų elgesį, ir atskleidė specifikacijos netikslumą: daliai skaitymo metodų buvo aprašyti kodai (422, 404), kurių jie negali grąžinti, – jie pašalinti.
6. **Saugumas suprojektuotas kaip žetonų pora su rotacija.** Trumpas JWT su prisijungimo identifikatoriumi (`sid`) ir vienkartiniai atnaujinimo žetonai leidžia atsijungimą ir blokavimą pritaikyti iš karto, o pavogto žetono pakartotinis panaudojimas panaikina visą prisijungimą. Kaina – viena duomenų bazės paieška kiekvienai užklausai; ji priimta sąmoningai, nes „stateless“ JWT be atšaukimo neleistų tikro atsijungimo.
7. **Konkurencines taisykles užtikrina duomenų bazė.** „Viena vykdoma sesija naudotojui“ ir „vienas priimtas pasiūlymas projektui“ realizuoti daliniais unikaliais indeksais, o ne tik programos patikromis. Tai vienintelis būdas apsisaugoti, kai dvi užklausos ateina vienu metu, ir viena iš priežasčių, kodėl pasirinkta PostgreSQL.
8. **Tarpinis Next.js maršrutas pasiteisino, bet turi kainą.** Jis leidžia atnaujinimo žetoną laikyti `httpOnly` slapuke ir nepriklausyti nuo CORS, tačiau kiekviena užklausa eina per papildomą šuolį, o bandymų ribojimui reikėjo perduoti tikrą kliento IP (`X-Forwarded-For`, `TRUST_PROXY`). Tai išryškėjo tik įdiegus sistemą į Azure, kur tarp naršyklės ir API atsiranda du tarpiniai sluoksniai – lokaliai tokia klaida nepasimato.
9. **Sąsaja suprojektuota prieš realizaciją.** Wireframe'ai dviem pločiais leido lūžio tašką, modalus ir navigaciją nuspręsti iš anksto; realizacijoje keitėsi tik vizualinis stilius, o ne išdėstymas. Ekrano iškarpos rodo, kad visi 10 suprojektuotų langų realizuoti.
10. **Kokybė patikrinta automatiškai, ne rankiniu būdu:** 299 vienetiniai ir integraciniai testai, 140 užklausų ir 300 patikrų Postman demonstracija, kuri kviečia visus dokumentuotus metodus, ir CI, kuris tikrina, kad nė vienas metodas neliktų be užklausos. Tai leido drąsiai keisti API po laboratorinių darbų pataisų (pvz., pereiti prie hierarchinių adresų) – sulaužytą elgesį iš karto parodydavo testai.


---

# Priedai

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

### Paleidimas

```bash
npm run dev
```

| Adresas | Paskirtis |
|---|---|
| http://localhost:3000 | Internetinė aplikacija |
| http://localhost:4000/api/health | Sąsajos būsenos patikrinimas |
| http://localhost:4000/api/docs | Sąsajos dokumentacija (Swagger UI) |

### Naudingos komandos

| Komanda | Paskirtis |
|---|---|
| `npm run dev:api` / `npm run dev:web` | Paleisti tik vieną dalį |
| `npm run db:up` / `npm run db:down` | Pakelti / sustabdyti duomenų bazės konteinerį |
| `npm run db:migrate` | Sukurti ir pritaikyti migraciją |
| `npm run db:studio` | Prisma Studio duomenų peržiūrai |
| `npm run lint` | Statinė analizė |
| `npm run test` | Testai |
| `npm run demo` | Sąsajos demonstracija |
| `npm run openapi:export` | Atnaujinti `api-spec.yaml`, `docs/api.md` ir `docs/openapi.json` |
| `npm run build` | Sukompiliuoti visas dalis |

### Demonstracinės paskyros

visos su slaptažodžiu `slaptazodis123`:

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
| `blokuotas@hourly.lt` | Specialistas | **Užblokuota** – prisijungus grąžinama 403 `ACCOUNT_BLOCKED` |
| `aldona@mociute.lt` | Užsakovas | Turi vykdomą aikštelės projektą |
| `ceo@cepelinai.ai` | Užsakovas | Turi paskelbtą projektą |
| `paulius@junior.lt` | Specialistas | Vykdo Aldonos projektą, **turi vykdomą darbo sesiją** |
| `murkis@katinas.lt` | Specialistas | Turi tiesiogiai sutartą projektą |
