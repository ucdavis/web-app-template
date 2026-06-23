targetScope = 'resourceGroup'

@description('Base name used for generated Azure resource names.')
param appName string = 'webapp'

@allowed([
  'test'
  'prod'
])
@description('Deployment environment. Only test and prod are supported by this template.')
param env string

@description('Expected Azure subscription ID. Resources are created only when this matches the current subscription and the resource group name ends with the environment suffix.')
param expectedSubscriptionId string

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('SQL admin login for SQL authentication.')
param sqlAdminLogin string

@secure()
@description('SQL admin password for SQL authentication.')
param sqlAdminPassword string

@description('SQL database name.')
param sqlDatabaseName string = appName

@description('Additional resource tags to apply.')
param tags object = {}

@minValue(30)
@maxValue(730)
@description('Log Analytics and Application Insights retention in days.')
param appInsightsRetentionInDays int = 30

@description('Linux App Service runtime stack.')
param linuxFxVersion string = 'DOTNETCORE|10.0'

@description('App Service plan SKU name.')
param webSkuName string = env == 'prod' ? 'B1' : 'B1'

@description('App Service plan SKU tier.')
param webSkuTier string = env == 'prod' ? 'Basic' : 'Basic'

@description('SQL database SKU name.')
param sqlSkuName string = env == 'prod' ? 'S0' : 'Basic'

@description('SQL database SKU tier.')
param sqlSkuTier string = env == 'prod' ? 'Standard' : 'Basic'

@description('Base URL used in generated notification emails. Defaults to the App Service hostname.')
param notificationBaseUrl string = ''

@description('Default application name used in generated notifications.')
param notificationDefaultAppName string = appName

@description('Default button text used in generated notifications.')
param notificationDefaultButtonText string = 'Open the application'

@description('Entra ID application client ID used by Microsoft Identity Web.')
param authClientId string = ''

@description('Entra ID tenant ID used by Microsoft Identity Web.')
param authTenantId string = ''

@description('Entra ID domain used by Microsoft Identity Web.')
param authDomain string = ''

@description('Entra ID authority instance used by Microsoft Identity Web.')
param authInstance string = environment().authentication.loginEndpoint

@description('OpenID Connect callback path used by Microsoft Identity Web.')
param authCallbackPath string = '/signin-oidc'

@description('SMTP host for outbound email.')
param smtpHost string = ''

@description('SMTP port for outbound email.')
param smtpPort int = 587

@description('SMTP timeout in milliseconds.')
param smtpTimeout int = 100000

@description('Whether SMTP should use SSL.')
param smtpUseSsl bool = true

@description('SMTP username for outbound email.')
param smtpUsername string = ''

@secure()
@description('SMTP password for outbound email.')
param smtpPassword string = ''

@description('From email address for outbound email.')
param smtpFromEmail string = ''

@description('From display name for outbound email.')
param smtpFromName string = appName

@description('Reply-to email address for outbound email.')
param smtpReplyToEmail string = ''

@description('BCC email address for outbound email.')
param smtpBccEmail string = ''

@description('Optional OTLP exporter endpoint. Leave empty when no external OTLP collector is configured.')
param otlpExporterEndpoint string = ''

@allowed([
  'grpc'
  'http/protobuf'
])
@description('OTLP exporter protocol used when an OTLP endpoint is configured.')
param otlpExporterProtocol string = 'http/protobuf'

@secure()
@description('Optional OTLP exporter headers. Use for collector authorization headers when required.')
param otelExporterOtlpHeaders string = ''

@description('Optional OpenTelemetry service name.')
param otelServiceName string = ''

@description('Optional OpenTelemetry resource attributes.')
param otelResourceAttributes string = ''

var appNameSafe = toLower(replace(replace(appName, ' ', ''), '_', ''))
var nameToken = substring(uniqueString(resourceGroup().id, appName, env), 0, 6)
var normalizedExpectedSubscriptionId = toLower(expectedSubscriptionId)
var normalizedCurrentSubscriptionId = toLower(subscription().subscriptionId)
var expectedResourceGroupSuffix = '-${env}'
var deploymentGuardPassed = !empty(expectedSubscriptionId) && normalizedCurrentSubscriptionId == normalizedExpectedSubscriptionId && endsWith(toLower(resourceGroup().name), expectedResourceGroupSuffix)

var sqlServerName = toLower('sql-${appNameSafe}-${env}-${nameToken}')
var webPlanName = toLower('asp-${appNameSafe}-${env}-${nameToken}')
var webAppName = toLower('web-${appNameSafe}-${env}-${nameToken}')
var appInsightsName = toLower('appi-${appNameSafe}-${env}-${nameToken}')
var logAnalyticsWorkspaceName = toLower('log-${appNameSafe}-${env}-${nameToken}')

var resourceTags = union(tags, {
  application: appName
  environment: env
})

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (deploymentGuardPassed) {
  name: logAnalyticsWorkspaceName
  location: location
  tags: resourceTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: appInsightsRetentionInDays
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (deploymentGuardPassed) {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: resourceTags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace!.id
  }
}

module sql 'modules/sql.bicep' = if (deploymentGuardPassed) {
  name: 'sql-${env}'
  params: {
    name: sqlServerName
    location: location
    tags: resourceTags
    adminLogin: sqlAdminLogin
    adminPassword: sqlAdminPassword
    databaseName: sqlDatabaseName
    skuName: sqlSkuName
    skuTier: sqlSkuTier
  }
}

var sqlServerHostnameSuffix = environment().suffixes.sqlServerHostname
var sqlServerFqdn = '${sqlServerName}${startsWith(sqlServerHostnameSuffix, '.') ? '' : '.'}${sqlServerHostnameSuffix}'
var sqlConnectionString = 'Server=tcp:${sqlServerFqdn},1433;Initial Catalog=${sqlDatabaseName};Persist Security Info=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
var resolvedNotificationBaseUrl = empty(notificationBaseUrl) ? 'https://${webAppName}.azurewebsites.net' : notificationBaseUrl

module compute 'modules/compute.bicep' = if (deploymentGuardPassed) {
  name: 'compute-${env}'
  dependsOn: [
    sql
  ]
  params: {
    location: location
    tags: resourceTags
    webPlanName: webPlanName
    webAppName: webAppName
    webSkuName: webSkuName
    webSkuTier: webSkuTier
    linuxFxVersion: linuxFxVersion
    sqlConnectionString: sqlConnectionString
    environmentName: env
    appInsightsConnectionString: appInsights!.properties.ConnectionString
    appInsightsInstrumentationKey: appInsights!.properties.InstrumentationKey
    notificationBaseUrl: resolvedNotificationBaseUrl
    notificationDefaultAppName: notificationDefaultAppName
    notificationDefaultButtonText: notificationDefaultButtonText
    authClientId: authClientId
    authTenantId: authTenantId
    authDomain: authDomain
    authInstance: authInstance
    authCallbackPath: authCallbackPath
    smtpHost: smtpHost
    smtpPort: smtpPort
    smtpTimeout: smtpTimeout
    smtpUseSsl: smtpUseSsl
    smtpUsername: smtpUsername
    smtpPassword: smtpPassword
    smtpFromEmail: smtpFromEmail
    smtpFromName: smtpFromName
    smtpReplyToEmail: smtpReplyToEmail
    smtpBccEmail: smtpBccEmail
    otlpExporterEndpoint: otlpExporterEndpoint
    otlpExporterProtocol: otlpExporterProtocol
    otelExporterOtlpHeaders: otelExporterOtlpHeaders
    otelServiceName: otelServiceName
    otelResourceAttributes: otelResourceAttributes
  }
}

output appInsightsConnectionString string = deploymentGuardPassed ? appInsights!.properties.ConnectionString : ''
output appInsightsName string = deploymentGuardPassed ? appInsights!.name : ''
output appServiceDefaultHostName string = deploymentGuardPassed ? compute!.outputs.defaultHostName : ''
output appServicePrincipalId string = deploymentGuardPassed ? compute!.outputs.principalId : ''
output deploymentGuardPassed bool = deploymentGuardPassed
output logAnalyticsWorkspaceName string = deploymentGuardPassed ? logAnalyticsWorkspace!.name : ''
output notificationBaseUrl string = deploymentGuardPassed ? resolvedNotificationBaseUrl : ''
output sqlDatabaseName string = sqlDatabaseName
output sqlServerName string = deploymentGuardPassed ? sql!.outputs.serverName : ''
output webAppName string = deploymentGuardPassed ? compute!.outputs.webAppName : ''
