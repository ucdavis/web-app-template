@description('App Service plan region used by the web app.')
param webAppLocation string

@description('Tags to apply to compute resources.')
param tags object

@description('Resource ID of the existing App Service plan.')
param webPlanId string

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

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: webAppLocation
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  tags: tags
  properties: {
    serverFarmId: webPlanId
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
