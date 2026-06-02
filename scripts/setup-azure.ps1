# ============================================================
# URL Shortener - Fresh Azure Subscription Setup (PowerShell)
# ============================================================
# Creates ALL Azure resources from scratch in a new subscription
# and configures GitHub Actions OIDC authentication.
#
# Prerequisites:
#   - Azure CLI installed (`az login` done)
#   - GitHub CLI installed (`gh auth login` done)
#   - Run from repo root: .\scripts\setup-azure.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ===================== EDIT THESE =====================
$SUBSCRIPTION_ID   = "eb13777c-f3ff-42fc-bef7-e25c8e914152"
$LOCATION          = "eastus"
$RESOURCE_GROUP    = "rg-url-shortener-dev"
$ACR_NAME          = "acrurlshort$(-join ((48..57) + (97..122) | Get-Random -Count 4 | ForEach-Object {[char]$_}))"
$POSTGRES_PASSWORD = (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object {[char]$_})) + "!1"
$JWT_SECRET        = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
$GITHUB_REPO       = "biivincent4/url-shortener"

# OAuth credentials (paste from old subscription or leave empty)
$GOOGLE_CLIENT_ID     = ""
$GOOGLE_CLIENT_SECRET = ""
$X_CLIENT_ID          = ""
$X_CLIENT_SECRET      = ""
# ======================================================

Write-Host "=== Setting subscription ===" -ForegroundColor Cyan
az account set --subscription $SUBSCRIPTION_ID

Write-Host "=== Creating resource group ===" -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION | Out-Null

# ===================== OIDC Setup =====================
Write-Host "=== Creating Entra ID App Registration ===" -ForegroundColor Cyan
$APP_NAME = "github-actions-url-shortener"
$APP_ID = az ad app create --display-name $APP_NAME --query appId -o tsv
$OBJ_ID = az ad app show --id $APP_ID --query id -o tsv

Write-Host "=== Creating Service Principal ===" -ForegroundColor Cyan
az ad sp create --id $APP_ID | Out-Null

Write-Host "=== Assigning Contributor + AcrPush roles ===" -ForegroundColor Cyan
$SCOPE = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"
az role assignment create --assignee $APP_ID --role Contributor --scope $SCOPE | Out-Null
az role assignment create --assignee $APP_ID --role AcrPush --scope $SCOPE | Out-Null

Write-Host "=== Adding federated credential for GitHub Actions ===" -ForegroundColor Cyan
$TENANT_ID = az account show --query tenantId -o tsv

$fedCred = @{
    name = "github-actions-master"
    issuer = "https://token.actions.githubusercontent.com"
    subject = "repo:${GITHUB_REPO}:ref:refs/heads/master"
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Compress

az ad app federated-credential create --id $OBJ_ID --parameters $fedCred | Out-Null

# ===================== Deploy Infrastructure =====================
Write-Host "=== Deploying Bicep infrastructure ===" -ForegroundColor Cyan
$googleCid = if ($GOOGLE_CLIENT_ID) { $GOOGLE_CLIENT_ID } else { "placeholder" }
$googleCs  = if ($GOOGLE_CLIENT_SECRET) { $GOOGLE_CLIENT_SECRET } else { "placeholder" }
$xCid      = if ($X_CLIENT_ID) { $X_CLIENT_ID } else { "placeholder" }
$xCs       = if ($X_CLIENT_SECRET) { $X_CLIENT_SECRET } else { "placeholder" }

$deployOutput = az deployment group create `
  --resource-group $RESOURCE_GROUP `
  --template-file infra/main.bicep `
  --parameters `
    environmentName=dev `
    acrName=$ACR_NAME `
    postgresAdminPassword=$POSTGRES_PASSWORD `
    repositoryUrl="https://github.com/$GITHUB_REPO" `
    secretKey=$JWT_SECRET `
    googleClientId=$googleCid `
    googleClientSecret=$googleCs `
    xClientId=$xCid `
    xClientSecret=$xCs `
  --query "properties.outputs" -o json | ConvertFrom-Json

$CONTAINER_APP_FQDN = $deployOutput.containerAppFqdn.value
$PG_FQDN = $deployOutput.postgresFqdn.value
$DATABASE_URL = "postgresql+asyncpg://pgadmin:${POSTGRES_PASSWORD}@${PG_FQDN}:5432/urlshortener?ssl=require"

Write-Host ""
Write-Host "=== Infrastructure Deployed ===" -ForegroundColor Green
Write-Host "  Container App: https://$CONTAINER_APP_FQDN"
Write-Host "  PostgreSQL:    $PG_FQDN"
Write-Host "  ACR:           $ACR_NAME.azurecr.io"
Write-Host ""

# ===================== GitHub Secrets =====================
Write-Host "=== Setting GitHub repository secrets ===" -ForegroundColor Cyan
gh secret set AZURE_CLIENT_ID --repo $GITHUB_REPO --body $APP_ID
gh secret set AZURE_TENANT_ID --repo $GITHUB_REPO --body $TENANT_ID
gh secret set AZURE_SUBSCRIPTION_ID --repo $GITHUB_REPO --body $SUBSCRIPTION_ID
gh secret set AZURE_RESOURCE_GROUP --repo $GITHUB_REPO --body $RESOURCE_GROUP
gh secret set ACR_NAME --repo $GITHUB_REPO --body $ACR_NAME
gh secret set CONTAINER_APP_NAME --repo $GITHUB_REPO --body "ca-url-shortener-api"
gh secret set DATABASE_URL --repo $GITHUB_REPO --body $DATABASE_URL
gh secret set POSTGRES_ADMIN_PASSWORD --repo $GITHUB_REPO --body $POSTGRES_PASSWORD
gh secret set JWT_SECRET --repo $GITHUB_REPO --body $JWT_SECRET
gh secret set BACKEND_URL --repo $GITHUB_REPO --body "https://$CONTAINER_APP_FQDN"

if ($GOOGLE_CLIENT_ID) {
    gh secret set GOOGLE_CLIENT_ID --repo $GITHUB_REPO --body $GOOGLE_CLIENT_ID
    gh secret set GOOGLE_CLIENT_SECRET --repo $GITHUB_REPO --body $GOOGLE_CLIENT_SECRET
}
if ($X_CLIENT_ID) {
    gh secret set X_CLIENT_ID --repo $GITHUB_REPO --body $X_CLIENT_ID
    gh secret set X_CLIENT_SECRET --repo $GITHUB_REPO --body $X_CLIENT_SECRET
}

Write-Host "=== GitHub Secrets configured ===" -ForegroundColor Green

# ===================== Trigger CI/CD =====================
Write-Host "=== Triggering GitHub Actions backend deploy ===" -ForegroundColor Cyan
gh workflow run deploy-backend.yml --repo $GITHUB_REPO --ref master

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host " App URL:      https://$CONTAINER_APP_FQDN" -ForegroundColor White
Write-Host " PostgreSQL:   $PG_FQDN" -ForegroundColor White
Write-Host " ACR:          $ACR_NAME.azurecr.io" -ForegroundColor White
Write-Host " DB Password:  $POSTGRES_PASSWORD" -ForegroundColor Yellow
Write-Host " JWT Secret:   $JWT_SECRET" -ForegroundColor Yellow
Write-Host ""
Write-Host " Next steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for GitHub Actions to finish (check: gh run list --repo $GITHUB_REPO)"
Write-Host "   2. Update OAuth callback URLs to https://$CONTAINER_APP_FQDN/api/auth/..."
Write-Host "   3. For custom domain (urls.trie.africa):"
Write-Host "      az containerapp hostname add --name ca-url-shortener-api --resource-group $RESOURCE_GROUP --hostname urls.trie.africa"
Write-Host "      Then update DNS CNAME to: $CONTAINER_APP_FQDN"
Write-Host "============================================================"
