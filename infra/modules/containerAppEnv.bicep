@description('Container Apps Environment name')
param name string

@description('Location for the resource')
param location string

resource env 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: name
  location: location
  properties: {
    zoneRedundant: false
  }
}

@description('Container Apps Environment ID')
output envId string = env.id

@description('Container Apps Environment name')
output envName string = env.name

@description('Default domain for the Container Apps Environment')
output defaultDomain string = env.properties.defaultDomain
