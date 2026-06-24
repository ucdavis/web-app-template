@description('SQL server name.')
param name string

@description('Azure region for SQL resources.')
param location string

@description('Tags to apply to SQL resources.')
param tags object

@description('SQL admin login for SQL authentication.')
param adminLogin string

@secure()
@description('SQL admin password for SQL authentication.')
param adminPassword string

@description('SQL database name.')
param databaseName string

@description('SQL database SKU name.')
param skuName string

@description('SQL database SKU tier.')
param skuTier string

@description('Whether to allow Azure services and resources to access this SQL server.')
param allowAzureServices bool = false

@allowed([
  'Enabled'
  'Disabled'
])
@description('Public network access for this SQL server.')
param publicNetworkAccess string = 'Enabled'

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: publicNetworkAccess
  }
}

resource allowAzureServicesFirewallRule 'Microsoft.Sql/servers/firewallRules@2023-08-01' = if (allowAzureServices) {
  name: 'AllowAzureServices'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource database 'Microsoft.Sql/servers/databases@2023-08-01' = {
  name: databaseName
  parent: sqlServer
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
  }
}

output databaseName string = database.name
output serverName string = sqlServer.name
