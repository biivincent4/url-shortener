@description('Static Web App name')
param name string

@description('Location for the resource')
param location string

@description('GitHub repository URL')
param repositoryUrl string

@description('Branch to deploy from')
param branch string = 'main'

resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: '/frontend'
      outputLocation: 'dist'
      skipGithubActionWorkflowGeneration: true
    }
  }
}

@description('Static Web App default hostname')
output defaultHostname string = swa.properties.defaultHostname

@description('Static Web App name')
output swaName string = swa.name
