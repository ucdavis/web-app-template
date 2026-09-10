@description('Azure region for compute resources.')
param location string

@description('Tags to apply to compute resources.')
param tags object

@description('App Service plan name.')
param webPlanName string

@description('Resource group containing the existing App Service plan.')
param webPlanResourceGroup string

@description('Web App name.')
param webAppName string

@description('Linux App Service runtime stack.')
param linuxFxVersion string

@secure()
@description('SQL connection string.')
param sqlConnectionString string

@description('Environment name for ASP.NET Core.')
param environmentName string

@description('Application Insights connection string for platform telemetry.')
param appInsightsConnectionString string

@description('Application Insights instrumentation key for platform telemetry.')
param appInsightsInstrumentationKey string

var baseAppSettings = [
  {
    name: 'ASPNETCORE_ENVIRONMENT'
    value: environmentName
  }
  {
    name: 'DB_CONNECTION'
    value: sqlConnectionString
  }
  {
    name: 'WEBSITE_RUN_FROM_PACKAGE'
    value: '1'
  }
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsightsConnectionString
  }
  {
    name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
    value: appInsightsInstrumentationKey
  }
  {
    name: 'APPLICATIONINSIGHTS_AGENT_EXTENSION_VERSION'
    value: '~3'
  }
]

resource webPlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: webPlanName
  scope: resourceGroup(webPlanResourceGroup)
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  tags: tags
  properties: {
    serverFarmId: webPlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      appSettings: baseAppSettings
      ftpsState: 'FtpsOnly'
      healthCheckPath: '/health'
      http20Enabled: true
      linuxFxVersion: linuxFxVersion
      minTlsVersion: '1.2'
    }
  }
}

output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
output webAppName string = webApp.name
