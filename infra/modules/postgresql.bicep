@description('PostgreSQL Flexible Server name')
param name string

@description('Location for the resource')
param location string

@secure()
@description('Administrator login password')
param adminPassword string

@description('Administrator login username')
param adminLogin string = 'pgadmin'

@description('Database name')
param databaseName string = 'urlshortener'

@description('SKU name (e.g. Standard_B1ms for burstable)')
param skuName string = 'Standard_B1ms'

@description('SKU tier')
param skuTier string = 'Burstable'

@description('PostgreSQL version')
param postgresVersion string = '16'

@description('Storage size in GB')
param storageSizeGB int = 32

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to connect
resource firewallAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: server
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

@description('PostgreSQL server FQDN')
output fqdn string = server.properties.fullyQualifiedDomainName

@description('Connection string for the database')
output connectionString string = 'postgresql+asyncpg://${adminLogin}:${adminPassword}@${server.properties.fullyQualifiedDomainName}:5432/${databaseName}?ssl=require'
