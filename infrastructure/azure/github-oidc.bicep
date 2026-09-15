targetScope = 'subscription'

@description('Base application name used for generated Azure resource names.')
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

@description('Name of the user-assigned managed identity used by GitHub Actions.')
param deploymentIdentityName string = 'id-${toLower(replace(replace(appName, ' ', ''), '_', ''))}-${env}-deploy'

@description('Existing App Service plan name that deployment may join.')
param webPlanName string = env == 'prod' ? 'Nibbler' : 'DefaultPlan2'

@description('Resource group containing the existing App Service plan that deployment may join.')
param webPlanResourceGroup string = env == 'prod' ? 'service-plans-linux' : 'Default-Web-WestUS'

@description('Assign deployment RBAC on the target resource group and existing App Service plan. Requires permission to create the resource group and role assignments at both target scopes.')
param assignRbac bool = true

var githubIssuer = 'https://token.actions.githubusercontent.com'
var azureTokenExchangeAudience = 'api://AzureADTokenExchange'
var contributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
var websiteContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')
var appNameSafe = toLower(replace(replace(appName, ' ', ''), '_', ''))
var webPlanRoleAssignmentDeploymentToken = substring(uniqueString(repository, deploymentIdentityName), 0, 8)
var webPlanRoleAssignmentDeploymentName = '${take(appNameSafe, 32)}-${env}-web-plan-${webPlanRoleAssignmentDeploymentToken}'
var normalizedExpectedSubscriptionId = toLower(expectedSubscriptionId)
var normalizedCurrentSubscriptionId = toLower(subscription().subscriptionId)
var expectedResourceGroupSuffix = '-${env}'
var normalizedResourceGroupName = toLower(resourceGroupName)
var repositoryParts = split(repository, '/')
var repositoryIsConfigured = length(repositoryParts) == 2 && !empty(repositoryParts[0]) && !empty(repositoryParts[1]) && repository != 'owner/repository'
var deploymentGuardPassed = !empty(expectedSubscriptionId) && repositoryIsConfigured && normalizedCurrentSubscriptionId == normalizedExpectedSubscriptionId && endsWith(normalizedResourceGroupName, expectedResourceGroupSuffix)
var federatedCredentialName = 'github-environment-${env}'
var federatedCredentialSubject = 'repo:${repository}:environment:${env}'

resource environmentResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = if (deploymentGuardPassed) {
  name: resourceGroupName
  location: location
}

module deploymentIdentity 'modules/deployment-identity.bicep' = if (deploymentGuardPassed) {
  name: '${env}-deployment-identity'
  scope: environmentResourceGroup
  params: {
    deploymentIdentityName: deploymentIdentityName
    federatedCredentialAudience: azureTokenExchangeAudience
    federatedCredentialIssuer: githubIssuer
    federatedCredentialName: federatedCredentialName
    federatedCredentialSubject: federatedCredentialSubject
    location: location
  }
}

module contributorAssignment 'modules/role-assignment.bicep' = if (deploymentGuardPassed && assignRbac) {
  name: '${env}-contributor-assignment'
  scope: environmentResourceGroup
  params: {
    principalId: deploymentIdentity!.outputs.principalId
    roleDefinitionId: contributorRoleDefinitionId
  }
}

module webPlanRoleAssignment 'modules/web-plan-role-assignment.bicep' = if (deploymentGuardPassed && assignRbac) {
  name: webPlanRoleAssignmentDeploymentName
  scope: resourceGroup(webPlanResourceGroup)
  params: {
    principalId: deploymentIdentity!.outputs.principalId
    roleDefinitionId: websiteContributorRoleDefinitionId
    webPlanName: webPlanName
  }
}

output clientId string = deploymentGuardPassed ? deploymentIdentity!.outputs.clientId : ''
output deploymentIdentityName string = deploymentGuardPassed ? deploymentIdentity!.outputs.deploymentIdentityName : ''
output deploymentGuardPassed bool = deploymentGuardPassed
output federatedCredentialSubject string = deploymentGuardPassed ? federatedCredentialSubject : ''
output principalId string = deploymentGuardPassed ? deploymentIdentity!.outputs.principalId : ''
output resourceGroupName string = deploymentGuardPassed ? environmentResourceGroup!.name : ''
output roleAssignmentId string = deploymentGuardPassed && assignRbac ? contributorAssignment!.outputs.roleAssignmentId : ''
output subscriptionId string = deploymentGuardPassed ? subscription().subscriptionId : ''
output tenantId string = deploymentGuardPassed ? tenant().tenantId : ''
output webPlanRoleAssignmentId string = deploymentGuardPassed && assignRbac ? webPlanRoleAssignment!.outputs.roleAssignmentId : ''
