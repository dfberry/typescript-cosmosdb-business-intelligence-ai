# Tutorial 01: Environment Setup and Azure Configuration

Learn how to set up your development environment and configure Azure resources for the movie intelligence AI application.

## Learning Objectives

By the end of this tutorial, you will:
- ✅ Set up a TypeScript ESM development environment
- ✅ Configure Azure CLI and authenticate
- ✅ Deploy Cosmos DB with vector search capabilities
- ✅ Set up Azure OpenAI service with proper models
- ✅ Understand critical configuration patterns

## Prerequisites

- Azure subscription with contributor access
- Node.js 18+ installed
- Basic TypeScript knowledge
- Git installed

## Step 1: Development Environment Setup

### 1.1 Initialize the Project

```bash
# Clone the repository
git clone <repository-url>
cd typescript-cosmosdb-business-intelligence-ai

# Install dependencies
npm install

# Verify TypeScript configuration
npx tsc --noEmit
```

### 1.2 Understanding the TypeScript Configuration

Examine [`tsconfig.json`](../../tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "type": "module"
  }
}
```

**Key Points**:
- **ESM Modules**: Modern JavaScript module system
- **ES2022 Target**: Use latest JavaScript features
- **Strict Type Checking**: Catch errors at compile time

### 1.3 Package.json Configuration

Key configurations for ESM:

```json
{
  "type": "module",
  "scripts": {
    "start": "node --loader ts-node/esm src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  }
}
```

## Step 2: Azure CLI Setup

### 2.1 Install and Login

```bash
# Install Azure CLI (if not already installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set default subscription
az account set --subscription "Your Subscription Name"
```

### 2.2 Verify Access

```bash
# Check current subscription
az account show

# List available locations
az account list-locations --output table
```

## Step 3: Deploy Azure Resources

### 3.1 Using Azure Developer CLI

The project uses Azure Developer CLI (azd) for infrastructure deployment:

```bash
# Initialize azd (if not done)
npm run azd:init

# Deploy infrastructure
npm run deploy
```

### 3.2 Manual Resource Creation (Alternative)

If you prefer manual setup:

```bash
# Create resource group
az group create --name "rg-movie-ai" --location "eastus2"

# Deploy Cosmos DB
az cosmosdb create \
  --name "cosmos-movie-ai" \
  --resource-group "rg-movie-ai" \
  --default-consistency-level "Session" \
  --enable-free-tier false
```

### 3.3 Understanding Cosmos DB Vector Configuration

Key vector search requirements:

```json
{
  "vectorEmbeddingPolicy": {
    "vectorEmbeddings": [{
      "path": "/embedding",
      "dataType": "float32", 
      "dimensions": 1536,
      "distanceFunction": "cosine"
    }]
  },
  "indexingPolicy": {
    "vectorIndexes": [{
      "path": "/embedding",
      "type": "quantizedFlat"
    }]
  }
}
```

## Step 4: Azure OpenAI Service Setup

### 4.1 Create OpenAI Resource

```bash
# Create Azure OpenAI service
az cognitiveservices account create \
  --name "openai-movie-ai" \
  --resource-group "rg-movie-ai" \
  --location "eastus2" \
  --kind "OpenAI" \
  --sku "S0"
```

### 4.2 Deploy Required Models

```bash
# Deploy GPT-4o for chat completions
az cognitiveservices account deployment create \
  --name "openai-movie-ai" \
  --resource-group "rg-movie-ai" \
  --deployment-name "gpt-4o" \
  --model-name "gpt-4o" \
  --model-version "2024-05-13" \
  --model-format "OpenAI" \
  --sku-capacity 10 \
  --sku-name "Standard"

# Deploy text-embedding-ada-002 for embeddings
az cognitiveservices account deployment create \
  --name "openai-movie-ai" \
  --resource-group "rg-movie-ai" \
  --deployment-name "text-embedding-ada-002" \
  --model-name "text-embedding-ada-002" \
  --model-version "2" \
  --model-format "OpenAI" \
  --sku-capacity 10 \
  --sku-name "Standard"
```

## Step 5: Environment Configuration

### 5.1 Get Azure Resource Information

```bash
# Get Cosmos DB connection details
az cosmosdb show --name "cosmos-movie-ai" --resource-group "rg-movie-ai"
az cosmosdb keys list --name "cosmos-movie-ai" --resource-group "rg-movie-ai"

# Get OpenAI connection details  
az cognitiveservices account show --name "openai-movie-ai" --resource-group "rg-movie-ai"
az cognitiveservices account keys list --name "openai-movie-ai" --resource-group "rg-movie-ai"
```

### 5.2 Configure Environment Variables

Create `.env` file:

```bash
# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=https://cosmos-movie-ai.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-primary-key
COSMOS_DB_DATABASE_NAME=MovieDB
COSMOS_DB_CONTAINER_NAME=Movies

# Azure OpenAI Configuration (CRITICAL: Correct URL format)
OPENAI_LLM_ENDPOINT=https://openai-movie-ai.openai.azure.com/
OPENAI_LLM_KEY=your-openai-key
OPENAI_LLM_DEPLOYMENT_NAME=gpt-4o
OPENAI_LLM_API_VERSION=2024-06-01

OPENAI_EMBEDDING_ENDPOINT=https://openai-movie-ai.openai.azure.com/
OPENAI_EMBEDDING_KEY=your-openai-key
OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002
OPENAI_EMBEDDING_API_VERSION=2024-06-01
```

### 5.3 Critical Configuration Notes

⚠️ **Common Mistake**: baseURL Construction

```typescript
// ❌ WRONG - Don't include deployment path in environment variable
OPENAI_LLM_ENDPOINT=https://account.openai.azure.com/openai/deployments/gpt-4o

// ✅ CORRECT - Only base endpoint in environment variable
OPENAI_LLM_ENDPOINT=https://account.openai.azure.com/

// The SDK appends the deployment path:
baseURL: `${endpoint}openai/deployments/${deploymentName}`
```

## Step 6: Validate Configuration

### 6.1 Test Azure Connectivity

```bash
# Run configuration validation
npm run validate

# Test Cosmos DB connectivity
npm run test:cosmos

# Test OpenAI connectivity  
npm run test:openai
```

### 6.2 Troubleshooting Common Issues

**Issue**: 404 errors from OpenAI API
**Solution**: Check baseURL construction and API version

**Issue**: Cosmos DB connection timeout
**Solution**: Verify firewall settings and endpoint URL

**Issue**: Authentication failures
**Solution**: Regenerate keys and update environment variables

## Next Steps

- 📖 Continue to [Tutorial 02: Cosmos DB Operations](../02-cosmos-db/README.md)
- 🔧 Explore the configuration patterns in [`src/utils/config.ts`](../../src/utils/config.ts)
- 🧪 Run the test suite to validate your setup: `npm test`

## Key Takeaways

1. **ESM Configuration**: Proper TypeScript ESM setup is crucial
2. **Azure Resource Planning**: Choose regions with model availability
3. **Environment Variables**: Never commit secrets, use proper naming
4. **Vector Configuration**: Cosmos DB requires specific vector policies
5. **baseURL Patterns**: Critical for Azure OpenAI client configuration

## Exercise

Try modifying the configuration to use different:
- API versions (test backward compatibility)
- Model deployments (if you have multiple)
- Database/container names

This hands-on experience will help you understand the configuration flexibility and requirements.
