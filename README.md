# Valandinė

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

| Objektas | Metodai |
|---|---|
| Projektas | `GET /projects`, `GET /projects/{id}`, `POST /projects`, `PATCH /projects/{id}`, `DELETE /projects/{id}` |
| Užduotis | `GET /tasks`, `GET /tasks/{id}`, `POST /tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}` |
| Darbo sesija | `GET /sessions`, `GET /sessions/{id}`, `POST /sessions`, `PATCH /sessions/{id}`, `DELETE /sessions/{id}` |

**Hierarchiniai sąsajos metodai:**

- `GET /projects/{id}/tasks` – grąžina visas konkretaus projekto užduotis;
- `GET /tasks/{id}/sessions` – grąžina visas konkrečios užduoties darbo sesijas;
- `GET /projects/{id}/proposals` – grąžina konkrečiam projektui pateiktus pasiūlymus.

Projektų sąrašo metodas priima `scope` parametrą, nurodantį, kurios projektų aibės prašoma: `GET /projects?scope=marketplace` grąžina viešai paskelbtus, `scope=owned` – naudotojo sukurtus, `scope=assigned` – jo vykdomus. Toks sprendimas pasirinktas vietoj atskirų adresų (pvz., `/my-projects`), nes resursas išlieka tas pats, o keičiasi tik jo atrankos kriterijus.

**Papildomi metodai, skirti autentifikacijai:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.

**Papildomi metodai, skirti pasiūlymų valdymui:** `POST /projects/{id}/proposals`, `PATCH /proposals/{id}`, `DELETE /proposals/{id}`.

**Papildomi metodai, skirti peržiūros nuorodoms ir ataskaitoms:** `POST /projects/{id}/shares`, `GET /projects/{id}/shares`, `DELETE /shares/{id}`, `GET /public/projects/{token}`, `GET /projects/{id}/report`.

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

Šios sistemos veikimui (pvz., duomenų manipuliavimui su duomenų baze) yra reikalingas „Valandinė“ API, kuris diegiamas atskiroje Azure App Service paslaugoje. Naršyklė į API tiesiogiai nesikreipia – užklausas persiunčia internetinė aplikacija, kuri veikia kaip tarpinis sluoksnis tarp naudotojo ir sąsajos. Toks sprendimas pasirinktas dėl saugumo: atnaujinimo žetonas saugomas `httpOnly` slapuke toje pačioje kilmėje (angl. origin), todėl jis nepasiekiamas kliento pusės scenarijams. Duomenų mainai tarp internetinės aplikacijos ir API vyksta JSON formatu, laikantis REST principų.

Pats „Valandinė“ API vykdo duomenų mainus su duomenų baze – tam naudojama ORM sąsaja (Prisma). Duomenų bazė diegiama Azure Database for PostgreSQL Flexible Server paslaugoje, prieiga prie jos vykdoma šifruotu TLS kanalu ir apribota užkardos taisyklėmis, leidžiančiomis prisijungti tik iš API paslaugos.

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
