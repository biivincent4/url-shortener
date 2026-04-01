using '../main.bicep'

param environmentName = 'dev'
param acrName = 'acrurlshortenerdev'
param containerAppName = 'ca-url-shortener-api'
param containerAppEnvName = 'cae-url-shortener'
param swaName = 'swa-url-shortener'
param repositoryUrl = 'https://github.com/biivincent4/url-shortener'

// Secure params — pass via CLI at deploy time:
//   --parameters databaseUrl="..." secretKey="..." googleClientId="..." etc.
