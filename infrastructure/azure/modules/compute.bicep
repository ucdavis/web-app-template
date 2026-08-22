@description('Azure region for compute resources.')
param location string

@description('Tags to apply to compute resources.')
param tags object

@description('App Service plan name.')
param webPlanName string

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

// <deployment-settings:compute-params>
@description('OpenID Connect callback path used by Microsoft Identity Web.')
param authCallbackPath string

@description('Entra ID application client ID used by Microsoft Identity Web.')
param authClientId string

@description('Entra ID domain used by Microsoft Identity Web.')
param authDomain string

@description('Entra ID authority instance used by Microsoft Identity Web.')
param authInstance string

@description('Entra ID tenant ID used by Microsoft Identity Web.')
param authTenantId string

@description('Base URL used in generated notification emails.')
param notificationBaseUrl string

@description('Default application name used in generated notifications.')
param notificationDefaultAppName string

@description('Default button text used in generated notifications.')
param notificationDefaultButtonText string

@description('Optional OTLP exporter endpoint. Leave empty when no external OTLP collector is configured.')
param otelExporterOtlpEndpoint string

@secure()
@description('Optional OTLP exporter headers, such as collector authorization.')
param otelExporterOtlpHeaders string

@allowed([
  'grpc'
  'http/protobuf'
])
@description('OTLP exporter protocol used when an OTLP endpoint is configured.')
param otelExporterOtlpProtocol string

@description('Optional OpenTelemetry resource attributes.')
param otelResourceAttributes string

@description('Optional OpenTelemetry service name.')
param otelServiceName string

@description('BCC email address for outbound email.')
param smtpBccEmail string

@description('From email address for outbound email.')
param smtpFromEmail string

@description('From display name for outbound email.')
param smtpFromName string

@description('SMTP host for outbound email.')
param smtpHost string

@secure()
@description('Optional SMTP password runtime setting.')
param smtpPassword string

@description('SMTP port for outbound email.')
param smtpPort int

@description('Reply-to email address for outbound email.')
param smtpReplyToEmail string

@description('SMTP timeout in milliseconds.')
param smtpTimeout int

@description('Whether SMTP should use SSL.')
param smtpUseSsl bool

@description('SMTP username for outbound email.')
param smtpUsername string

@description('App Service plan SKU name.')
param webSkuName string

@description('App Service plan SKU tier.')
param webSkuTier string
// </deployment-settings:compute-params>

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

// <deployment-settings:compute-app-settings>
var deploymentSettingsAppSettings = concat(
  !empty(authCallbackPath) ? [
    {
      name: 'Auth__CallbackPath'
      value: authCallbackPath
    }
  ] : [],
  !empty(authClientId) ? [
    {
      name: 'Auth__ClientId'
      value: authClientId
    }
  ] : [],
  !empty(authDomain) ? [
    {
      name: 'Auth__Domain'
      value: authDomain
    }
  ] : [],
  !empty(authInstance) ? [
    {
      name: 'Auth__Instance'
      value: authInstance
    }
  ] : [],
  !empty(authTenantId) ? [
    {
      name: 'Auth__TenantId'
      value: authTenantId
    }
  ] : [],
  !empty(notificationBaseUrl) ? [
    {
      name: 'Notification__BaseUrl'
      value: notificationBaseUrl
    }
  ] : [],
  !empty(notificationDefaultAppName) ? [
    {
      name: 'Notification__DefaultAppName'
      value: notificationDefaultAppName
    }
  ] : [],
  !empty(notificationDefaultButtonText) ? [
    {
      name: 'Notification__DefaultButtonText'
      value: notificationDefaultButtonText
    }
  ] : [],
  !empty(otelExporterOtlpEndpoint) ? [
    {
      name: 'OTEL_EXPORTER_OTLP_ENDPOINT'
      value: otelExporterOtlpEndpoint
    }
  ] : [],
  !empty(otelExporterOtlpHeaders) ? [
    {
      name: 'OTEL_EXPORTER_OTLP_HEADERS'
      value: otelExporterOtlpHeaders
    }
  ] : [],
  !empty(otelExporterOtlpEndpoint) ? [
    {
      name: 'OTEL_EXPORTER_OTLP_PROTOCOL'
      value: otelExporterOtlpProtocol
    }
  ] : [],
  !empty(otelResourceAttributes) ? [
    {
      name: 'OTEL_RESOURCE_ATTRIBUTES'
      value: otelResourceAttributes
    }
  ] : [],
  !empty(otelServiceName) ? [
    {
      name: 'OTEL_SERVICE_NAME'
      value: otelServiceName
    }
  ] : [],
  !empty(smtpBccEmail) ? [
    {
      name: 'Smtp__BccEmail'
      value: smtpBccEmail
    }
  ] : [],
  !empty(smtpFromEmail) ? [
    {
      name: 'Smtp__FromEmail'
      value: smtpFromEmail
    }
  ] : [],
  !empty(smtpFromName) ? [
    {
      name: 'Smtp__FromName'
      value: smtpFromName
    }
  ] : [],
  !empty(smtpHost) ? [
    {
      name: 'Smtp__Host'
      value: smtpHost
    }
  ] : [],
  !empty(smtpPassword) ? [
    {
      name: 'Smtp__Password'
      value: smtpPassword
    }
  ] : [],
  [
    {
      name: 'Smtp__Port'
      value: string(smtpPort)
    }
  ],
  !empty(smtpReplyToEmail) ? [
    {
      name: 'Smtp__ReplyToEmail'
      value: smtpReplyToEmail
    }
  ] : [],
  [
    {
      name: 'Smtp__Timeout'
      value: string(smtpTimeout)
    }
  ],
  [
    {
      name: 'Smtp__UseSsl'
      value: string(smtpUseSsl)
    }
  ],
  !empty(smtpUsername) ? [
    {
      name: 'Smtp__Username'
      value: smtpUsername
    }
  ] : []
)
// </deployment-settings:compute-app-settings>

resource webPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: webPlanName
  location: location
  kind: 'linux'
  sku: {
    name: webSkuName
    tier: webSkuTier
    size: webSkuName
    capacity: 1
  }
  tags: tags
  properties: {
    reserved: true
  }
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
      appSettings: concat(baseAppSettings, deploymentSettingsAppSettings)
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
