targetScope = 'resourceGroup'

@description('Object ID of the principal receiving the App Service plan role assignment.')
param principalId string

@description('Fully qualified Azure RBAC role definition ID.')
param roleDefinitionId string

@description('Existing App Service plan name receiving the role assignment.')
param webPlanName string

resource webPlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: webPlanName
}

resource assignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(webPlan.id, principalId, roleDefinitionId)
  scope: webPlan
  properties: {
    roleDefinitionId: roleDefinitionId
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

output roleAssignmentId string = assignment.id
