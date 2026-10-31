#!/usr/bin/env bash
# Creates the Azure resources Hourly runs on (see docs/azure.md):
#
#   resource group
#   ├── PostgreSQL Flexible Server (Burstable B1ms) with database "hourly"
#   └── App Service plan (Linux B1)
#       ├── API web app  (Node 22, migrations on startup)
#       └── web app      (Node 22, Next.js standalone server)
#
# Usage (Azure Cloud Shell or Git Bash with the Azure CLI, after `az login`):
#
#   SUFFIX=tomas bash infra/azure-setup.sh
#
# SUFFIX makes the app and database names globally unique. LOCATION, RG,
# PG_VERSION, APP_LOCATION and PLAN_SKU can be overridden the same way.
# Running the script again is safe:
# existing resources are updated, but a new JWT secret is generated (signing
# out every user) and the database password is reset only if DB_PASSWORD is
# given.
set -euo pipefail

SUFFIX="${SUFFIX:?Set SUFFIX, e.g. SUFFIX=tomas bash infra/azure-setup.sh}"
LOCATION="${LOCATION:-swedencentral}"
RG="${RG:-hourly-rg}"
PG_VERSION="${PG_VERSION:-17}"
# The App Service plan may need another region or tier than the database:
# new subscriptions often have no B1 quota in some regions. F1 (free) works
# for a demo, but sleeps when idle and allows 60 CPU minutes a day.
APP_LOCATION="${APP_LOCATION:-$LOCATION}"
PLAN_SKU="${PLAN_SKU:-B1}"
if [[ "$PLAN_SKU" == F1 ]]; then ALWAYS_ON=false; else ALWAYS_ON=true; fi

PLAN="hourly-plan"
API_APP="hourly-api-$SUFFIX"
WEB_APP="hourly-web-$SUFFIX"
DB_SERVER="hourly-db-$SUFFIX"
DB_NAME="hourly"
DB_ADMIN="hourlyadmin"

# Azure requires three of: upper case, lower case, digits, symbols.
random() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-"$1"; }
JWT_ACCESS_SECRET="$(random 48)"

# A new subscription has to opt in to each service namespace once.
echo "==> Registering resource providers (first run takes a minute or two)"
for namespace in Microsoft.DBforPostgreSQL Microsoft.Web; do
  az provider register --namespace "$namespace" --wait --output none
done

echo "==> Resource group $RG ($LOCATION)"
# An existing group keeps its own location: it only holds metadata, and the
# resources below are created in $LOCATION either way.
az group show --name "$RG" --output none 2>/dev/null ||
  az group create --name "$RG" --location "$LOCATION" --output none

echo "==> PostgreSQL $DB_SERVER (takes a few minutes)"
if az postgres flexible-server show --resource-group "$RG" --name "$DB_SERVER" --output none 2>/dev/null; then
  if [[ -n "${DB_PASSWORD:-}" ]]; then
    az postgres flexible-server update --resource-group "$RG" --name "$DB_SERVER" \
      --admin-password "$DB_PASSWORD" --output none
  else
    echo "    exists; keeping the current password (pass DB_PASSWORD to reset it)"
  fi
else
  DB_PASSWORD="${DB_PASSWORD:-Hx9-$(random 24)}"
  # --public-access 0.0.0.0 allows connections from Azure services only.
  # High availability is off by default (and not offered on Burstable).
  az postgres flexible-server create \
    --resource-group "$RG" --name "$DB_SERVER" --location "$LOCATION" \
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
    --version "$PG_VERSION" \
    --admin-user "$DB_ADMIN" --admin-password "$DB_PASSWORD" \
    --public-access 0.0.0.0 \
    --yes --output none
fi
# Also done by --public-access above, but repeated here so a rerun repairs a
# server whose creation stopped before the rule was added. 0.0.0.0 stands for
# "any Azure service", not any address.
az postgres flexible-server firewall-rule create --resource-group "$RG" --server-name "$DB_SERVER" \
  --name AllowAllAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 \
  --output none
az postgres flexible-server db show --resource-group "$RG" --server-name "$DB_SERVER" \
  --name "$DB_NAME" --output none 2>/dev/null ||
  az postgres flexible-server db create --resource-group "$RG" --server-name "$DB_SERVER" \
    --name "$DB_NAME" --output none
DB_HOST="$(az postgres flexible-server show --resource-group "$RG" --name "$DB_SERVER" \
  --query fullyQualifiedDomainName --output tsv)"

echo "==> App Service plan $PLAN (Linux $PLAN_SKU, $APP_LOCATION)"
az appservice plan create --resource-group "$RG" --name "$PLAN" --location "$APP_LOCATION" \
  --is-linux --sku "$PLAN_SKU" --output none

for app in "$API_APP" "$WEB_APP"; do
  echo "==> Web app $app"
  az webapp show --resource-group "$RG" --name "$app" --output none 2>/dev/null ||
    az webapp create --resource-group "$RG" --plan "$PLAN" --name "$app" \
      --runtime "NODE:22-lts" --output none
  az webapp update --resource-group "$RG" --name "$app" --https-only true --output none
  # The deploy workflow signs in with a publish profile, which needs SCM basic
  # authentication (off by default on new apps).
  az resource update --resource-group "$RG" --namespace Microsoft.Web \
    --resource-type basicPublishingCredentialsPolicies --parent "sites/$app" --name scm \
    --set properties.allow=true --output none
done

API_HOST="$(az webapp show --resource-group "$RG" --name "$API_APP" --query defaultHostName --output tsv)"
WEB_HOST="$(az webapp show --resource-group "$RG" --name "$WEB_APP" --query defaultHostName --output tsv)"

echo "==> API configuration"
# Migrations run before every start, so a deploy that changes the schema
# brings the database along with it. Zip deployment may drop the execute bit
# of Prisma's native schema engine, hence the chmod.
az webapp config set --resource-group "$RG" --name "$API_APP" --always-on "$ALWAYS_ON" \
  --startup-file "chmod +x node_modules/@prisma/engines/schema-engine-* ; node node_modules/prisma/build/index.js migrate deploy && node dist/server.js" \
  --generic-configurations '{"healthCheckPath": "/api/health/ready"}' --output none
api_settings=(
  NODE_ENV=production
  WEB_ORIGIN="https://$WEB_HOST"
  JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET"
  # Browser -> Azure front end -> Next.js -> Azure front end -> API.
  TRUST_PROXY=2
  # The workflow uploads a ready-built package.
  SCM_DO_BUILD_DURING_DEPLOYMENT=false
)
if [[ -n "${DB_PASSWORD:-}" ]]; then
  DATABASE_URL="postgresql://$DB_ADMIN:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME?sslmode=require"
  api_settings+=(DATABASE_URL="$DATABASE_URL")
fi
az webapp config appsettings set --resource-group "$RG" --name "$API_APP" \
  --settings "${api_settings[@]}" --output none

echo "==> Web configuration"
# Next.js would otherwise bind to the container's HOSTNAME only.
az webapp config set --resource-group "$RG" --name "$WEB_APP" --always-on "$ALWAYS_ON" \
  --startup-file "HOSTNAME=0.0.0.0 node apps/web/server.js" --output none
az webapp config appsettings set --resource-group "$RG" --name "$WEB_APP" --settings \
  API_URL="https://$API_HOST" \
  FORWARD_CLIENT_IP=true \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false \
  --output none

echo "==> GitHub secrets and variables"
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  az webapp deployment list-publishing-profiles --resource-group "$RG" --name "$API_APP" --xml |
    gh secret set AZURE_API_PUBLISH_PROFILE
  az webapp deployment list-publishing-profiles --resource-group "$RG" --name "$WEB_APP" --xml |
    gh secret set AZURE_WEB_PUBLISH_PROFILE
  gh variable set AZURE_API_APP --body "$API_APP"
  gh variable set AZURE_WEB_APP --body "$WEB_APP"
  echo "    set AZURE_API_PUBLISH_PROFILE, AZURE_WEB_PUBLISH_PROFILE, AZURE_API_APP, AZURE_WEB_APP"
else
  echo "    GitHub CLI not available or not signed in. Add these in the repository"
  echo "    settings (Secrets and variables -> Actions):"
  echo "      variable AZURE_API_APP = $API_APP"
  echo "      variable AZURE_WEB_APP = $WEB_APP"
  echo "      secret AZURE_API_PUBLISH_PROFILE = output of:"
  echo "        az webapp deployment list-publishing-profiles -g $RG -n $API_APP --xml"
  echo "      secret AZURE_WEB_PUBLISH_PROFILE = output of:"
  echo "        az webapp deployment list-publishing-profiles -g $RG -n $WEB_APP --xml"
fi

echo
echo "Done."
echo "  Web: https://$WEB_HOST"
echo "  API: https://$API_HOST/api"
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo
  echo "Database connection string (save it in a password manager; needed for db:seed):"
  echo "  $DATABASE_URL"
fi
