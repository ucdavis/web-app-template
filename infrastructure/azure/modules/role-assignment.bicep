targetScope = 'resourceGroup'

@description('Object ID of the principal receiving the role assignment.')
param principalId string

@description('Fully qualified Azure RBAC role definition ID.')
param roleDefinitionId string

resource assignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, principalId, roleDefinitionId)
  properties: {
    roleDefinitionId: roleDefinitionId
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

output roleAssignmentId string = assignment.id
