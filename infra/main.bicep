@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
param environmentName string = 'dev'

@description('ACR name (globally unique, lowercase, no dashes)')
param acrName string

@description('Container App name')
param containerAppName string = 'ca-url-shortener-api'

@description('Container Apps Environment name')
param containerAppEnvName string = 'cae-url-shortener'

@description('Static Web App name')
param swaName string = 'swa-url-shortener'

@description('Location for Static Web App (not all regions supported)')
param swaLocation string = 'eastus2'

@description('GitHub repository URL')
param repositoryUrl string

@secure()
@description('PostgreSQL connection string')
param databaseUrl string

@secure()
@description('JWT signing key')
param secretKey string

@secure()
@description('Google OAuth Client ID')
param googleClientId string

@secure()
@description('Google OAuth Client Secret')
param googleClientSecret string

@secure()
@description('X (Twitter) OAuth Client ID')
param xClientId string

@secure()
@description('X (Twitter) OAuth Client Secret')
param xClientSecret string

// --- Container Registry ---
module acr 'modules/containerRegistry.bicep' = {
  name: 'acr-${environmentName}'
  params: {
    name: acrName
    location: location
  }
}

// --- Container Apps Environment ---
module cae 'modules/containerAppEnv.bicep' = {
  name: 'cae-${environmentName}'
  params: {
    name: containerAppEnvName
    location: location
  }
}

// --- Container App ---
module app 'modules/containerApp.bicep' = {
  name: 'app-${environmentName}'
  params: {
    name: containerAppName
    location: location
    environmentId: cae.outputs.envId
    acrLoginServer: acr.outputs.loginServer
    databaseUrl: databaseUrl
    secretKey: secretKey
    googleClientId: googleClientId
    googleClientSecret: googleClientSecret
    xClientId: xClientId
    xClientSecret: xClientSecret
    frontendUrl: 'https://${swa.outputs.defaultHostname}'
    backendUrl: 'https://${containerAppName}.${location}.azurecontainerapps.io'
  }
}

// --- ACR Pull Role Assignment ---
module acrPull 'modules/acrPullRole.bicep' = {
  name: 'acr-pull-${environmentName}'
  params: {
    acrId: acr.outputs.acrId
    principalId: app.outputs.principalId
  }
}

// --- Static Web App ---
module swa 'modules/staticWebApp.bicep' = {
  name: 'swa-${environmentName}'
  params: {
    name: swaName
    location: swaLocation
    repositoryUrl: repositoryUrl
  }
}

// --- Outputs ---
@description('ACR login server')
output acrLoginServer string = acr.outputs.loginServer

@description('Container App FQDN')
output containerAppFqdn string = app.outputs.fqdn

@description('Static Web App hostname')
output swaHostname string = swa.outputs.defaultHostname
