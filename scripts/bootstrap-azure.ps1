<#
.SYNOPSIS
    One-time bootstrap script that creates all Azure resources needed
    before the CI/CD pipeline can run.

.DESCRIPTION
    Creates:
    1. Azure Resource Group
    2. Azure AD App Registration + OIDC federated credentials for GitHub Actions
    3. Azure Database for PostgreSQL Flexible Server
    4. Configures all GitHub repository secrets

.PARAMETER GitHubOwner
    GitHub username or organization (e.g. "vincentbii")

.PARAMETER GitHubRepo
    GitHub repository name (e.g. "url-shortener")

.PARAMETER Location
    Azure region (default: eastus)

.PARAMETER Environment
    Environment name: dev or prod (default: dev)

.EXAMPLE
    .\bootstrap-azure.ps1 -GitHubOwner "vincentbii" -GitHubRepo "url-shortener"
#>

param(
    [Parameter(Mandatory)][string]$GitHubOwner,
    [Parameter(Mandatory)][string]$GitHubRepo,
    [string]$Location = "eastus",
    [ValidateSet("dev","prod")][string]$Environment = "dev",
    [string]$ResourceGroupName = "rg-url-shortener-$Environment",
    [string]$PostgresServerName = "pg-url-shortener-$Environment",
    [string]$PostgresDbName = "urlshortener",
    [Parameter(Mandatory)][string]$GoogleClientId,
    [Parameter(Mandatory)][string]$GoogleClientSecret
)

$ErrorActionPreference = "Stop"
$repoFullName = "$GitHubOwner/$GitHubRepo"

Write-Host "`n=== URL Shortener - Azure Bootstrap ===" -ForegroundColor Cyan
Write-Host "GitHub Repo : $repoFullName"
Write-Host "Azure Region: $Location"
Write-Host "Environment : $Environment"
Write-Host "Resource Group: $ResourceGroupName`n"

# ── Prerequisite checks ──────────────────────────────────────────────
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) not found. Install from https://aka.ms/installazurecli"
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) not found. Install from https://cli.github.com"
}

# Verify logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) { throw "Not logged into Azure CLI. Run: az login" }
Write-Host "  Azure account: $($account.name) ($($account.id))" -ForegroundColor Green

$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) { throw "Not logged into GitHub CLI. Run: gh auth login" }
Write-Host "  GitHub CLI: authenticated" -ForegroundColor Green

$subscriptionId = $account.id
$tenantId = $account.tenantId

# ── Resource Group ────────────────────────────────────────────────────
Write-Host "`n[2/7] Creating Resource Group..." -ForegroundColor Yellow

az group create --name $ResourceGroupName --location $Location --output none
Write-Host "  Created: $ResourceGroupName" -ForegroundColor Green

# ── Azure AD App Registration + OIDC ─────────────────────────────────
Write-Host "`n[3/7] Creating Azure AD App Registration for OIDC..." -ForegroundColor Yellow

$appName = "github-oidc-url-shortener-$Environment"
$existingApp = az ad app list --display-name $appName --query "[0]" 2>$null | ConvertFrom-Json

if ($existingApp) {
    $appId = $existingApp.appId
    $objectId = $existingApp.id
    Write-Host "  App already exists: $appId" -ForegroundColor Green
} else {
    $app = az ad app create --display-name $appName | ConvertFrom-Json
    $appId = $app.appId
    $objectId = $app.id
    Write-Host "  Created app: $appId" -ForegroundColor Green
}

# Create service principal if not exists
$existingSp = az ad sp list --filter "appId eq '$appId'" --query "[0]" 2>$null | ConvertFrom-Json
if (-not $existingSp) {
    az ad sp create --id $appId --output none
    Write-Host "  Created service principal" -ForegroundColor Green
}

# Assign Contributor role on the resource group
az role assignment create `
    --assignee $appId `
    --role "Contributor" `
    --scope "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName" `
    --output none 2>$null
Write-Host "  Assigned Contributor role on $ResourceGroupName" -ForegroundColor Green

# Create federated credentials for GitHub Actions
$audiences = @("api://AzureADTokenExchange")

# Credential for main branch pushes
$credNameBranch = "github-master-branch"
$existingCred = az ad app federated-credential list --id $objectId --query "[?name=='$credNameBranch']" 2>$null | ConvertFrom-Json
if (-not $existingCred -or $existingCred.Count -eq 0) {
    $credBody = @{
        name        = $credNameBranch
        issuer      = "https://token.actions.githubusercontent.com"
        subject     = "repo:${repoFullName}:ref:refs/heads/master"
        audiences   = $audiences
        description = "GitHub Actions - master branch"
    } | ConvertTo-Json -Compress
    $credBody | az ad app federated-credential create --id $objectId --parameters "@-" --output none
    Write-Host "  Created federated credential: master branch" -ForegroundColor Green
} else {
    Write-Host "  Federated credential already exists: master branch" -ForegroundColor Green
}

# Credential for pull requests
$credNamePR = "github-pull-request"
$existingCredPR = az ad app federated-credential list --id $objectId --query "[?name=='$credNamePR']" 2>$null | ConvertFrom-Json
if (-not $existingCredPR -or $existingCredPR.Count -eq 0) {
    $credBodyPR = @{
        name        = $credNamePR
        issuer      = "https://token.actions.githubusercontent.com"
        subject     = "repo:${repoFullName}:pull_request"
        audiences   = $audiences
        description = "GitHub Actions - pull requests"
    } | ConvertTo-Json -Compress
    $credBodyPR | az ad app federated-credential create --id $objectId --parameters "@-" --output none
    Write-Host "  Created federated credential: pull requests" -ForegroundColor Green
} else {
    Write-Host "  Federated credential already exists: pull requests" -ForegroundColor Green
}

# ── PostgreSQL Flexible Server ────────────────────────────────────────
Write-Host "`n[4/7] Creating Azure PostgreSQL Flexible Server..." -ForegroundColor Yellow

$pgPassword = -join ((48..57) + (65..90) + (97..122) + (33,35,36,37,38,42,43) | Get-Random -Count 24 | ForEach-Object { [char]$_ })

$existingPg = az postgres flexible-server show --name $PostgresServerName --resource-group $ResourceGroupName 2>$null | ConvertFrom-Json
if ($existingPg) {
    Write-Host "  PostgreSQL server already exists: $PostgresServerName" -ForegroundColor Green
    $databaseUrl = "postgresql+asyncpg://pgadmin:EXISTING_PASSWORD@${PostgresServerName}.postgres.database.azure.com:5432/${PostgresDbName}?sslmode=require"
    Write-Host "  WARNING: Using placeholder password. Update DATABASE_URL secret manually if password changed." -ForegroundColor DarkYellow
} else {
    az postgres flexible-server create `
        --name $PostgresServerName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --admin-user pgadmin `
        --admin-password $pgPassword `
        --sku-name Standard_B1ms `
        --tier Burstable `
        --storage-size 32 `
        --version 16 `
        --yes `
        --output none

    Write-Host "  Created: $PostgresServerName (Burstable B1ms)" -ForegroundColor Green

    # Create the database
    az postgres flexible-server db create `
        --resource-group $ResourceGroupName `
        --server-name $PostgresServerName `
        --database-name $PostgresDbName `
        --output none

    Write-Host "  Created database: $PostgresDbName" -ForegroundColor Green

    # Allow Azure services to connect
    az postgres flexible-server firewall-rule create `
        --resource-group $ResourceGroupName `
        --name $PostgresServerName `
        --rule-name AllowAzureServices `
        --start-ip-address 0.0.0.0 `
        --end-ip-address 0.0.0.0 `
        --output none

    Write-Host "  Firewall rule: AllowAzureServices" -ForegroundColor Green

    $databaseUrl = "postgresql+asyncpg://pgadmin:${pgPassword}@${PostgresServerName}.postgres.database.azure.com:5432/${PostgresDbName}?sslmode=require"
}

# ── Generate JWT Secret ───────────────────────────────────────────────
Write-Host "`n[5/7] Generating JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
Write-Host "  Generated 48-char secret" -ForegroundColor Green

# ── Bicep parameter files ─────────────────────────────────────────────
Write-Host "`n[6/7] Updating Bicep parameter files..." -ForegroundColor Yellow

$paramFile = if ($Environment -eq "prod") { "infra/parameters/prod.bicepparam" } else { "infra/parameters/dev.bicepparam" }
$acrName = if ($Environment -eq "prod") { "acrurlshortenerprod" } else { "acrurlshortenerdev" }
$containerAppName = if ($Environment -eq "prod") { "ca-url-shortener-api-prod" } else { "ca-url-shortener-api" }

# Update repositoryUrl in param file
$paramPath = Join-Path $PSScriptRoot "..\infra\parameters\$Environment.bicepparam"
if (Test-Path $paramPath) {
    $content = Get-Content $paramPath -Raw
    $content = $content -replace "https://github.com/OWNER/url-shortener", "https://github.com/$repoFullName"
    Set-Content $paramPath $content -NoNewline
    Write-Host "  Updated repositoryUrl in $Environment.bicepparam" -ForegroundColor Green
}

# ── GitHub Secrets ────────────────────────────────────────────────────
Write-Host "`n[7/7] Setting GitHub repository secrets..." -ForegroundColor Yellow

$secrets = @{
    AZURE_CLIENT_ID        = $appId
    AZURE_TENANT_ID        = $tenantId
    AZURE_SUBSCRIPTION_ID  = $subscriptionId
    AZURE_RESOURCE_GROUP   = $ResourceGroupName
    ACR_NAME               = $acrName
    CONTAINER_APP_NAME     = $containerAppName
    DATABASE_URL           = $databaseUrl
    JWT_SECRET             = $jwtSecret
    GOOGLE_CLIENT_ID       = $GoogleClientId
    GOOGLE_CLIENT_SECRET   = $GoogleClientSecret
    X_CLIENT_ID            = ""
    X_CLIENT_SECRET        = ""
}

foreach ($key in $secrets.Keys) {
    $val = $secrets[$key]
    if ($val) {
        $val | gh secret set $key --repo $repoFullName
        Write-Host "  Set: $key" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (empty): $key" -ForegroundColor DarkYellow
    }
}

# ── Summary ───────────────────────────────────────────────────────────
Write-Host "`n=== Bootstrap Complete ===" -ForegroundColor Cyan
Write-Host @"

Azure Resources Created:
  Resource Group     : $ResourceGroupName
  App Registration   : $appName (Client ID: $appId)
  PostgreSQL Server  : $PostgresServerName.postgres.database.azure.com
  PostgreSQL Database: $PostgresDbName

GitHub Secrets Configured:
  $($secrets.Keys -join ", ")

Next Steps:
  1. git init && git add -A && git commit -m "Initial commit"
  2. gh repo create $GitHubRepo --public --source . --remote origin --push
  3. Push triggers the CI/CD pipeline automatically!

  The deploy-infra workflow will create:
    - Azure Container Registry ($acrName)
    - Container Apps Environment
    - Container App (with your API)
    - Static Web App (frontend)
    - ACR Pull role assignment

  After infra deploys, get the SWA deployment token:
    az staticwebapp secrets list --name swa-url-shortener --query "properties.apiKey" -o tsv
    gh secret set SWA_DEPLOYMENT_TOKEN --repo $repoFullName --body "<token>"

"@ -ForegroundColor White

if (-not $existingPg) {
    Write-Host "IMPORTANT: PostgreSQL admin password (save this!):" -ForegroundColor Red
    Write-Host "  $pgPassword" -ForegroundColor Red
}
