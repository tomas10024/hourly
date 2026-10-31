# Diegimas į Microsoft Azure

Sistema diegiama trimis Azure paslaugomis, apmokamomis iš „Azure for Students“
kredito:

| Resursas | Paslauga | Pastabos |
|---|---|---|
| `hourly-db-<priesaga>` | Azure Database for PostgreSQL Flexible Server, Burstable B1ms, 32 GB | TLS (`sslmode=require`); užkarda – tik Azure paslaugoms |
| `hourly-plan` | App Service planas, Linux B1 | Abi programos viename plane – mokama už planą, ne už programą |
| `hourly-api-<priesaga>` | Web App, Node 22 | Prieš kiekvieną paleidimą `prisma migrate deploy`; sveikatos patikra `/api/health/ready` |
| `hourly-web-<priesaga>` | Web App, Node 22 | Next.js `standalone` serveris; `/api/*` persiunčia į API |

Kodas į Azure keliauja per GitHub Actions: `.github/workflows/deploy.yml`
paleidžiamas, kai `ci.yml` sėkmingai baigiasi `main` šakoje (arba rankiniu
būdu – *Actions → Deploy → Run workflow*). Darbo eiga sukompiliuoja API ir
klientą, supakuoja juos su produkcinėmis priklausomybėmis ir įkelia zip
paketais. Azure pusėje niekas nekompiliuojama.

## 1. Pasiruošimas (vieną kartą)

1. Aktyvuok kreditą: <https://azure.microsoft.com/free/students> (prisijungiama
   universiteto paskyra).
2. Atidaryk **Azure Cloud Shell** (portale viršuje `>_` ikona, pasirink *Bash*) –
   jame jau yra `az`, `git`, `openssl`. Arba lokaliai Git Bash'e:

   ```bash
   winget install Microsoft.AzureCLI
   ```

   ```bash
   az login
   ```

3. Naujos prenumeratos dažnai neturi pigiausių resursų visuose regionuose:
   - `SkuNotAvailable` duomenų bazei – kitas `LOCATION` (pvz., `northeurope`);
   - `Operation cannot be completed without additional quota` App Service
     planui – kitas `APP_LOCATION` (pvz., `westeurope`), arba kvotos prašymas
     (*Quotas → App Service*), arba nemokamas `PLAN_SKU=F1` (užmiega, 60 CPU
     min. per dieną).

   Šiuo metu veikia: DB – `northeurope`, programos – `westeurope`:

   ```bash
   SUFFIX=tomas LOCATION=northeurope APP_LOCATION=westeurope bash infra/azure-setup.sh
   ```

## 2. Resursų sukūrimas

```bash
SUFFIX=tomas bash infra/azure-setup.sh
```

`SUFFIX` – bet kokia trumpa priesaga (mažosios raidės, skaičiai), kad
pavadinimai būtų unikalūs visame Azure. Skriptas užtrunka ~10 min. (ilgiausiai
kuriama duomenų bazė) ir pabaigoje parodo:

- kliento ir API adresus;
- **duomenų bazės prisijungimo eilutę** – išsisaugok ją slaptažodžių
  tvarkyklėje, jos prireiks pradiniams duomenims. Antrą kartą skriptas jos
  nebeparodys (slaptažodis keičiamas tik nurodžius `DB_PASSWORD=...`).

Jei kompiuteryje yra prisijungęs `gh` (GitHub CLI), skriptas pats įrašo
GitHub slaptažodžius ir kintamuosius. Kitaip (pvz., Cloud Shell'e) juos reikia
įrašyti ranka: *GitHub → Settings → Secrets and variables → Actions*:

| Tipas | Pavadinimas | Reikšmė |
|---|---|---|
| Variable | `AZURE_API_APP` | `hourly-api-<priesaga>` |
| Variable | `AZURE_WEB_APP` | `hourly-web-<priesaga>` |
| Variable | `NEXT_PUBLIC_DEMO_MODE` | `true` – prisijungimo lange rodomi demonstracinių paskyrų mygtukai (gynimui); kitaip nekurti |
| Secret | `AZURE_API_PUBLISH_PROFILE` | `az webapp deployment list-publishing-profiles -g hourly-rg -n hourly-api-<priesaga> --xml` išvestis |
| Secret | `AZURE_WEB_PUBLISH_PROFILE` | tas pats su `hourly-web-<priesaga>` |

## 3. Pirmas diegimas

Įkėlus pakeitimus į `main`, po CI automatiškai paleidžiama *Deploy*. Pirmą
kartą galima paleisti ir ranka (*Actions → Deploy → Run workflow*). Paskutinis
žingsnis (*Smoke test*) kreipiasi į `https://<web>/api/health/ready`, t. y.
patikrina visą grandinę: klientas → API → duomenų bazė.

Pirmas API paleidimas vykdo visas migracijas, todėl gali užtrukti 1–2 min.

## 4. Demonstraciniai duomenys

Duomenų bazė pasiekiama tik iš Azure, todėl pradiniams duomenims laikinai
leidžiamas savo IP adresas:

```bash
az postgres flexible-server firewall-rule create -g hourly-rg --server-name hourly-db-<priesaga> --name seed --start-ip-address <tavo-IP> --end-ip-address <tavo-IP>
```

Tada iš projekto šaknies (Git Bash'e):

```bash
DATABASE_URL="<prisijungimo eilutė>" WEB_ORIGIN="https://<web adresas>" npm run db:seed
```

Ir taisyklė pašalinama:

```bash
az postgres flexible-server firewall-rule delete -g hourly-rg --server-name hourly-db-<priesaga> --name seed --yes
```

`db:seed` ištrina visus duomenis ir įrašo juos iš naujo – realiems
naudotojams jau užsiregistravus, jo nebeleisti.

## 5. Žurnalai ir gedimų paieška

```bash
az webapp log tail -g hourly-rg -n hourly-api-<priesaga>
```

| Požymis | Tikėtina priežastis |
|---|---|
| API neužsikrauna, žurnale `Invalid environment configuration` | Trūksta `DATABASE_URL` ar `JWT_ACCESS_SECRET` (*App Service → Environment variables*) |
| `P1001: Can't reach database server` | Užkardoje išjungta „Allow Azure services“ arba neteisingas adresas |
| Prisijungus iš karto išmeta į `/login` | `WEB_ORIGIN` API nustatymuose nesutampa su kliento adresu |
| Bandymų ribojimas užblokuoja visus iš karto | `TRUST_PROXY` ≠ 2 arba kliente nėra `FORWARD_CLIENT_IP=true` |

## 6. Kaina ir išjungimas

B1 planas – apie 13 $/mėn., B1ms duomenų bazė – apie 13–15 $/mėn. (studentams
pirmus 12 mėn. dažnai nemokama). Tikslios kainos priklauso nuo regiono –
*Cost Management* portale rodo, kiek kredito liko.

Po gynimo viską pašalina viena komanda:

```bash
az group delete --name hourly-rg --yes
```
