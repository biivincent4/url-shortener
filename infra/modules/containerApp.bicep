@description('Container App name')
param name string

@description('Location for the resource')
param location string

@description('Container Apps Environment ID')
param environmentId string

@description('ACR login server URL')
param acrLoginServer string

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

@description('Frontend URL for CORS')
param frontendUrl string

@description('Backend public URL')
param backendUrl string

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      secrets: [
        { name: 'database-url', value: databaseUrl }
        { name: 'secret-key', value: secretKey }
        { name: 'google-client-id', value: googleClientId }
        { name: 'google-client-secret', value: googleClientSecret }
        { name: 'x-client-id', value: xClientId }
        { name: 'x-client-secret', value: xClientSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'mcr.microsoft.com/k8se/quickstart:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'GOOGLE_CLIENT_ID', secretRef: 'google-client-id' }
            { name: 'GOOGLE_CLIENT_SECRET', secretRef: 'google-client-secret' }
            { name: 'X_CLIENT_ID', secretRef: 'x-client-id' }
            { name: 'X_CLIENT_SECRET', secretRef: 'x-client-secret' }
            { name: 'ALLOWED_ORIGINS', value: frontendUrl }
            { name: 'BACKEND_URL', value: backendUrl }
            { name: 'FRONTEND_URL', value: frontendUrl }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

@description('Container App FQDN')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Container App principal ID (managed identity)')
output principalId string = containerApp.identity.principalId

@description('Container App name')
output appName string = containerApp.name
