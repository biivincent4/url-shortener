using 'main.bicep'

param environmentName = 'prod'
param acrName = 'acrurlshortenerprod'
param containerAppName = 'ca-url-shortener-api-prod'
param containerAppEnvName = 'cae-url-shortener-prod'
param swaName = 'swa-url-shortener-prod'
param repositoryUrl = 'https://github.com/OWNER/url-shortener'

// Secure params — pass via CLI at deploy time:
//   --parameters databaseUrl="..." secretKey="..." googleClientId="..." etc.
