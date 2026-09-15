targetScope = 'resourceGroup'

@description('Name of the user-assigned managed identity used by GitHub Actions.')
param deploymentIdentityName string

@description('Azure region for the deployment identity.')
param location string

@description('Name of the federated credential on the deployment identity.')
param federatedCredentialName string

@description('Exact GitHub Actions OIDC subject trusted by Azure.')
param federatedCredentialSubject string

@description('OIDC token issuer trusted by the federated credential.')
param federatedCredentialIssuer string

@description('OIDC token audience trusted by the federated credential.')
param federatedCredentialAudience string

resource deploymentIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: deploymentIdentityName
  location: location
}

resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deploymentIdentity
  name: federatedCredentialName
  properties: {
    audiences: [
      federatedCredentialAudience
    ]
    issuer: federatedCredentialIssuer
    subject: federatedCredentialSubject
  }
}

output clientId string = deploymentIdentity.properties.clientId
output deploymentIdentityName string = deploymentIdentity.name
output principalId string = deploymentIdentity.properties.principalId
