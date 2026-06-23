targetScope = 'subscription'

extension microsoftGraphV1_0

@description('Base application name used for generated Azure and Entra names.')
param appName string = 'webapp'

@description('GitHub repository in owner/name format.')
param repository string = 'owner/repository'

@description('Azure region for the environment resource group.')
param location string = deployment().location

@allowed([
  'test'
  'prod'
])
@description('GitHub Environment and Azure deployment environment to bootstrap.')
param env string

@description('Expected Azure subscription ID for this environment.')
param expectedSubscriptionId string

@description('Azure resource group assigned to this deployment identity.')
param resourceGroupName string = 'rg-${appName}-${env}'

@description('Display name for this deployment app registration.')
param applicationName string = '${appName}-github-${env}-deploy'

@description('Assign Contributor on the target resource group. Requires Owner or User Access Administrator at the target scope.')
param assignRbac bool = true

var githubIssuer = 'https://token.actions.githubusercontent.com'
var azureTokenExchangeAudience = 'api://AzureADTokenExchange'
var contributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
var normalizedExpectedSubscriptionId = toLower(expectedSubscriptionId)
var normalizedCurrentSubscriptionId = toLower(subscription().subscriptionId)
var expectedResourceGroupSuffix = '-${env}'
var normalizedResourceGroupName = toLower(resourceGroupName)
var repositoryIsConfigured = contains(repository, '/') && repository != 'owner/repository'
var deploymentGuardPassed = !empty(expectedSubscriptionId) && repositoryIsConfigured && normalizedCurrentSubscriptionId == normalizedExpectedSubscriptionId && endsWith(normalizedResourceGroupName, expectedResourceGroupSuffix)
var federatedCredentialName = 'github-environment-${env}'
var federatedCredentialSubject = 'repo:${repository}:environment:${env}'

resource environmentResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = if (deploymentGuardPassed) {
  name: resourceGroupName
  location: location
}

resource application 'Microsoft.Graph/applications@v1.0' = if (deploymentGuardPassed) {
  uniqueName: applicationName
  displayName: applicationName
  signInAudience: 'AzureADMyOrg'

  resource federatedCredential 'federatedIdentityCredentials@v1.0' = {
    name: '${applicationName}/${federatedCredentialName}'
    issuer: githubIssuer
    subject: federatedCredentialSubject
    audiences: [
      azureTokenExchangeAudience
    ]
  }
}

resource servicePrincipal 'Microsoft.Graph/servicePrincipals@v1.0' = if (deploymentGuardPassed) {
  appId: application!.appId
}

module contributorAssignment 'modules/role-assignment.bicep' = if (deploymentGuardPassed && assignRbac) {
  name: '${env}-contributor-assignment'
  scope: environmentResourceGroup
  params: {
    principalId: servicePrincipal!.id
    roleDefinitionId: contributorRoleDefinitionId
  }
}

output applicationName string = deploymentGuardPassed ? application!.displayName : ''
output clientId string = deploymentGuardPassed ? application!.appId : ''
output deploymentGuardPassed bool = deploymentGuardPassed
output federatedCredentialSubject string = deploymentGuardPassed ? federatedCredentialSubject : ''
output principalId string = deploymentGuardPassed ? servicePrincipal!.id : ''
output resourceGroupName string = deploymentGuardPassed ? environmentResourceGroup!.name : ''
output roleAssignmentId string = deploymentGuardPassed && assignRbac ? contributorAssignment!.outputs.roleAssignmentId : ''
output subscriptionId string = deploymentGuardPassed ? subscription().subscriptionId : ''
output tenantId string = deploymentGuardPassed ? tenant().tenantId : ''
