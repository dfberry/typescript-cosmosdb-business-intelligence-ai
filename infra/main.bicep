targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string = 'eastus2'

param resourceGroupName string = 'rg-${environmentName}'

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: resourceGroupName
  location: location
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output COSMOS_DB_ENDPOINT string = resources.outputs.COSMOS_DB_ENDPOINT
output COSMOS_DB_ACCOUNT_NAME string = resources.outputs.COSMOS_DB_ACCOUNT_NAME
output OPENAI_ENDPOINT string = resources.outputs.OPENAI_ENDPOINT
output OPENAI_ACCOUNT_NAME string = resources.outputs.OPENAI_ACCOUNT_NAME
