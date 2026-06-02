#!/bin/bash
# ============================================================
# URL Shortener - Fresh Azure Subscription Setup
# ============================================================
# This script creates ALL Azure resources from scratch in a new
# subscription and configures GitHub Actions OIDC authentication.
#
# Prerequisites:
#   - Azure CLI installed and logged in (`az login`)
#   - GitHub CLI installed and logged in (`gh auth login`)
#   - You are in the url-shortener repo root
#
# Usage:
#   1. Edit the variables below
#   2. Run: bash scripts/setup-azure.sh
# ============================================================

set -euo pipefail

# ===================== EDIT THESE =====================
SUBSCRIPTION_ID="eb13777c-f3ff-42fc-bef7-e25c8e914152"
LOCATION="eastus"                    # Azure region
RESOURCE_GROUP="rg-url-shortener-dev"
ACR_NAME="acrurlshort$(openssl rand -hex 2)"  # Must be globally unique, lowercase, no dashes
POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)!"
JWT_SECRET="$(openssl rand -base64 32)"
GITHUB_REPO="biivincent4/url-shortener"

# OAuth credentials (reuse from old subscription or create new)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
X_CLIENT_ID=""
X_CLIENT_SECRET=""
# ======================================================

echo "=== Setting subscription ==="
az account set --subscription "$SUBSCRIPTION_ID"

echo "=== Creating resource group ==="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# ===================== OIDC Setup =====================
echo "=== Creating Entra ID App Registration for GitHub Actions ==="
APP_NAME="github-actions-url-shortener"
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
OBJ_ID=$(az ad app show --id "$APP_ID" --query id -o tsv)

echo "=== Creating Service Principal ==="
SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)

echo "=== Assigning Contributor role to resource group ==="
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}"

echo "=== Assigning AcrPush role ==="
az role assignment create \
  --assignee "$APP_ID" \
  --role AcrPush \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}"

echo "=== Adding federated credential for GitHub Actions (master branch) ==="
TENANT_ID=$(az account show --query tenantId -o tsv)

az ad app federated-credential create --id "$OBJ_ID" --parameters '{
  "name": "github-actions-master",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$GITHUB_REPO"':ref:refs/heads/master",
  "audiences": ["api://AzureADTokenExchange"]
}'

# ===================== Deploy Infrastructure =====================
echo "=== Deploying Bicep infrastructure ==="
DEPLOY_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep \
  --parameters \
    environmentName=dev \
    acrName="$ACR_NAME" \
    postgresAdminPassword="$POSTGRES_PASSWORD" \
    repositoryUrl="https://github.com/${GITHUB_REPO}" \
    secretKey="$JWT_SECRET" \
    googleClientId="${GOOGLE_CLIENT_ID:-placeholder}" \
    googleClientSecret="${GOOGLE_CLIENT_SECRET:-placeholder}" \
    xClientId="${X_CLIENT_ID:-placeholder}" \
    xClientSecret="${X_CLIENT_SECRET:-placeholder}" \
  --query "properties.outputs" -o json)

echo "$DEPLOY_OUTPUT" | jq .

CONTAINER_APP_FQDN=$(echo "$DEPLOY_OUTPUT" | jq -r '.containerAppFqdn.value')
PG_FQDN=$(echo "$DEPLOY_OUTPUT" | jq -r '.postgresFqdn.value')
DATABASE_URL="postgresql+asyncpg://pgadmin:${POSTGRES_PASSWORD}@${PG_FQDN}:5432/urlshortener?ssl=require"

echo ""
echo "=== Deployment Complete ==="
echo "Container App: https://${CONTAINER_APP_FQDN}"
echo "PostgreSQL:    ${PG_FQDN}"
echo "ACR:           ${ACR_NAME}.azurecr.io"
echo ""

# ===================== GitHub Secrets =====================
echo "=== Setting GitHub repository secrets ==="
gh secret set AZURE_CLIENT_ID --repo "$GITHUB_REPO" --body "$APP_ID"
gh secret set AZURE_TENANT_ID --repo "$GITHUB_REPO" --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$GITHUB_REPO" --body "$SUBSCRIPTION_ID"
gh secret set AZURE_RESOURCE_GROUP --repo "$GITHUB_REPO" --body "$RESOURCE_GROUP"
gh secret set ACR_NAME --repo "$GITHUB_REPO" --body "$ACR_NAME"
gh secret set CONTAINER_APP_NAME --repo "$GITHUB_REPO" --body "ca-url-shortener-api"
gh secret set DATABASE_URL --repo "$GITHUB_REPO" --body "$DATABASE_URL"
gh secret set POSTGRES_ADMIN_PASSWORD --repo "$GITHUB_REPO" --body "$POSTGRES_PASSWORD"
gh secret set JWT_SECRET --repo "$GITHUB_REPO" --body "$JWT_SECRET"
gh secret set BACKEND_URL --repo "$GITHUB_REPO" --body "https://${CONTAINER_APP_FQDN}"

if [ -n "$GOOGLE_CLIENT_ID" ]; then
  gh secret set GOOGLE_CLIENT_ID --repo "$GITHUB_REPO" --body "$GOOGLE_CLIENT_ID"
  gh secret set GOOGLE_CLIENT_SECRET --repo "$GITHUB_REPO" --body "$GOOGLE_CLIENT_SECRET"
fi
if [ -n "$X_CLIENT_ID" ]; then
  gh secret set X_CLIENT_ID --repo "$GITHUB_REPO" --body "$X_CLIENT_ID"
  gh secret set X_CLIENT_SECRET --repo "$GITHUB_REPO" --body "$X_CLIENT_SECRET"
fi

echo ""
echo "=== GitHub Secrets configured ==="
echo ""

# ===================== First Deploy =====================
echo "=== Building and pushing initial container image ==="
az acr login --name "$ACR_NAME"
IMAGE="${ACR_NAME}.azurecr.io/url-shortener-api:initial"
docker build -t "$IMAGE" --build-arg VITE_API_URL="" -f backend/Dockerfile .
docker push "$IMAGE"

echo "=== Updating Container App with initial image ==="
az containerapp update \
  --name "ca-url-shortener-api" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE"

echo ""
echo "============================================================"
echo " SETUP COMPLETE!"
echo "============================================================"
echo ""
echo " App URL:      https://${CONTAINER_APP_FQDN}"
echo " PostgreSQL:   ${PG_FQDN}"
echo " ACR:          ${ACR_NAME}.azurecr.io"
echo " DB Password:  ${POSTGRES_PASSWORD}"
echo " JWT Secret:   ${JWT_SECRET}"
echo ""
echo " Next steps:"
echo "   1. Update OAuth callback URLs in Google/X developer consoles"
echo "      to point to: https://${CONTAINER_APP_FQDN}/api/auth/..."
echo "   2. For custom domain (urls.trie.africa):"
echo "      az containerapp hostname add --name ca-url-shortener-api \\"
echo "        --resource-group $RESOURCE_GROUP --hostname urls.trie.africa"
echo "      Then update DNS CNAME to: ${CONTAINER_APP_FQDN}"
echo "   3. Push any commit to master to trigger CI/CD"
echo "============================================================"
