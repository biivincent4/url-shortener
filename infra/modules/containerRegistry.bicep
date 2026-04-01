@description('Azure Container Registry name (globally unique, lowercase, no dashes)')
param name string

@description('Location for the resource')
param location string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

@description('ACR login server URL')
output loginServer string = acr.properties.loginServer

@description('ACR resource name')
output acrName string = acr.name

@description('ACR resource ID')
output acrId string = acr.id
