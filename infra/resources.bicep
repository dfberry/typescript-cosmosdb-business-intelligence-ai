@description('Name of the environment')
param environmentName string

@description('Primary location for all resources')
param location string = 'eastus2'

var cosmosAccountName = 'cosmos-${environmentName}'
var openaiAccountName = 'openai-${environmentName}'

// Cosmos DB Account with vectorization capabilities
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-09-15' = {
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
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-09-15' = {
  parent: cosmosAccount
  name: 'MovieDB'
  properties: {
    resource: {
      id: 'MovieDB'
    }
  }
}

// Cosmos DB Container with vector indexing
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-09-15' = {
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
        vectorIndexes: [
          {
            path: '/titleVector'
            type: 'flat'
          }
          {
            path: '/descriptionVector'
            type: 'flat'
          }
          {
            path: '/genreVector'
            type: 'flat'
          }
          {
            path: '/actorsVector'
            type: 'flat'
          }
          {
            path: '/reviewsVector'
            type: 'flat'
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

// GPT-4 Deployment
resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiAccount
  name: 'gpt-4'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4'
      version: '1106-Preview'
    }
    scaleSettings: {
      scaleType: 'Standard'
    }
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
    scaleSettings: {
      scaleType: 'Standard'
    }
  }
}

output COSMOS_DB_ENDPOINT string = cosmosAccount.properties.documentEndpoint
output COSMOS_DB_KEY string = cosmosAccount.listKeys().primaryMasterKey
output OPENAI_ENDPOINT string = openaiAccount.properties.endpoint
output OPENAI_KEY string = openaiAccount.listKeys().key1
