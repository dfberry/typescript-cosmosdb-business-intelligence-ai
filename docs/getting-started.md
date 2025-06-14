# Getting Started with TypeScript Cosmos DB AI

This guide will walk you through setting up and running the movie intelligence AI application.

## Prerequisites

- **Azure Subscription** with permissions to create resources
- **Node.js 18+** and npm
- **TypeScript** knowledge (intermediate level)
- **Git** for version control

## Step 1: Environment Setup

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd typescript-cosmosdb-business-intelligence-ai
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.template .env
   # Edit .env with your Azure credentials
   ```

3. **Required Environment Variables**:
   ```bash
   # Azure Cosmos DB
   COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
   COSMOS_DB_KEY=your-cosmos-key
   COSMOS_DB_DATABASE_NAME=MovieDB
   COSMOS_DB_CONTAINER_NAME=Movies

   # Azure OpenAI (CRITICAL: Use correct URL format)
   OPENAI_LLM_ENDPOINT=https://your-account.openai.azure.com/
   OPENAI_LLM_KEY=your-openai-key
   OPENAI_LLM_DEPLOYMENT_NAME=gpt-4o
   OPENAI_LLM_API_VERSION=2024-06-01

   OPENAI_EMBEDDING_ENDPOINT=https://your-account.openai.azure.com/
   OPENAI_EMBEDDING_KEY=your-openai-key
   OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002
   OPENAI_EMBEDDING_API_VERSION=2024-06-01
   ```

## Step 2: Deploy Azure Resources

1. **Login to Azure**:
   ```bash
   npm run azure:login
   ```

2. **Deploy infrastructure**:
   ```bash
   npm run deploy
   ```

3. **Verify deployment**:
   ```bash
   npm run validate
   ```

## Step 3: Load Sample Data

1. **Load movie data**:
   ```bash
   npm run data:load
   ```

2. **Generate embeddings**:
   ```bash
   npm run data:vectorize
   ```

## Step 4: Run the Application

1. **Start the CLI**:
   ```bash
   npm start
   ```

2. **Try sample queries**:
   - "What are some good sci-fi movies?"
   - "Find action movies from 2023"
   - "Movies similar to The Matrix"

## Step 5: Run Tests

1. **All tests**:
   ```bash
   npm test
   ```

2. **With coverage**:
   ```bash
   npm run coverage
   ```

## Next Steps

- 📖 Read [`architecture.md`](architecture.md) to understand the system design
- 🎓 Follow the tutorials in [`../tutorials/`](../tutorials/)
- 📋 Explore code examples in [`../examples/`](../examples/)

## Troubleshooting

Common issues and solutions:

### 404 Errors with OpenAI
**Problem**: Getting "Resource not found" errors
**Solution**: Check your baseURL construction in the configuration

### Test Failures
**Problem**: Unit tests failing with type errors
**Solution**: Ensure environment variables match between config and tests

### Vector Search Not Working
**Problem**: Semantic search returning no results
**Solution**: Verify embeddings were generated and vector policy is configured

For more detailed troubleshooting, see [`troubleshooting.md`](troubleshooting.md).
