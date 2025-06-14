@description('Name of the environment')
param environmentName string

@description('Primary location for all resources')
param location string = 'eastus2'

var cosmosAccountName = 'cosmos-${environmentName}'
var openaiAccountName = 'openai-${environmentName}'

// Cosmos DB Account with vectorization capabilities
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: cosmosAccount
  name: 'MovieDB'
  properties: {
    resource: {
      id: 'MovieDB'
    }
  }
}

// Cosmos DB Container with vector indexing for semantic search
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: cosmosDatabase
  name: 'Movies'
  properties: {
    resource: {
      id: 'Movies'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/embedding/*'
          }
        ]
        vectorIndexes: [
          {
            path: '/embedding'
            type: 'quantizedFlat'
          }
        ]
      }
      vectorEmbeddingPolicy: {
        vectorEmbeddings: [
          {
            path: '/embedding'
            dataType: 'float32'
            distanceFunction: 'cosine'
            dimensions: 1536
          }
        ]
      }
    }
  }
}

// Azure OpenAI Account
resource openaiAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openaiAccountName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: openaiAccountName
  }
}

// GPT-4o Deployment
resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiAccount
  name: 'gpt-4o'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 10
  }
}

// Text Embedding Deployment
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiAccount
  name: 'text-embedding-ada-002'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-ada-002'
      version: '2'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 10
  }
}

output COSMOS_DB_ENDPOINT string = cosmosAccount.properties.documentEndpoint
output COSMOS_DB_ACCOUNT_NAME string = cosmosAccount.name
output COSMOS_DB_DATABASE_NAME string = cosmosDatabase.name
output COSMOS_DB_CONTAINER_NAME string = cosmosContainer.name
output OPENAI_ENDPOINT string = openaiAccount.properties.endpoint
output OPENAI_ACCOUNT_NAME string = openaiAccount.name
output OPENAI_EMBEDDING_DEPLOYMENT_NAME string = embeddingDeployment.name
output OPENAI_LLM_DEPLOYMENT_NAME string = gptDeployment.properties.model.name
