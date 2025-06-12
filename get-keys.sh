#!/bin/bash

set -e

echo "🔑 Getting Azure resource information from deployment..."

# Get values from azd deployment outputs
echo "🔍 Getting deployment outputs..."

# Required values (should always be available)
if azd env get-value AZURE_RESOURCE_GROUP >/dev/null 2>&1; then
  AZURE_RESOURCE_GROUP=$(azd env get-value AZURE_RESOURCE_GROUP)
else
  AZURE_RESOURCE_GROUP="rg-$(azd env get-value AZURE_ENV_NAME)"
fi

COSMOS_DB_ENDPOINT=$(azd env get-value COSMOS_DB_ENDPOINT)
COSMOS_DB_ACCOUNT_NAME=$(azd env get-value COSMOS_DB_ACCOUNT_NAME)
OPENAI_ENDPOINT=$(azd env get-value OPENAI_ENDPOINT)
OPENAI_ACCOUNT_NAME=$(azd env get-value OPENAI_ACCOUNT_NAME)

# Optional values (from newer Bicep templates)
if azd env get-value COSMOS_DB_DATABASE_NAME >/dev/null 2>&1; then
  COSMOS_DB_DATABASE_NAME=$(azd env get-value COSMOS_DB_DATABASE_NAME)
else
  COSMOS_DB_DATABASE_NAME="MovieDB"
fi

if azd env get-value COSMOS_DB_CONTAINER_NAME >/dev/null 2>&1; then
  COSMOS_DB_CONTAINER_NAME=$(azd env get-value COSMOS_DB_CONTAINER_NAME)
else
  COSMOS_DB_CONTAINER_NAME="Movies"
fi

if azd env get-value OPENAI_GPT_DEPLOYMENT_NAME >/dev/null 2>&1; then
  OPENAI_GPT_DEPLOYMENT_NAME=$(azd env get-value OPENAI_GPT_DEPLOYMENT_NAME)
else
  OPENAI_GPT_DEPLOYMENT_NAME="gpt-4o"
fi

if azd env get-value OPENAI_EMBEDDING_DEPLOYMENT_NAME >/dev/null 2>&1; then
  OPENAI_EMBEDDING_DEPLOYMENT_NAME=$(azd env get-value OPENAI_EMBEDDING_DEPLOYMENT_NAME)
else
  OPENAI_EMBEDDING_DEPLOYMENT_NAME="text-embedding-ada-002"
fi

echo "📍 Resource Group: $AZURE_RESOURCE_GROUP"
echo "🗄️  Cosmos Account: $COSMOS_DB_ACCOUNT_NAME"
echo "🧠 OpenAI Account: $OPENAI_ACCOUNT_NAME"
echo "🎯 GPT Deployment: $OPENAI_GPT_DEPLOYMENT_NAME"
echo "📊 Embedding Deployment: $OPENAI_EMBEDDING_DEPLOYMENT_NAME"

# Get access keys using Azure CLI
echo "🔍 Getting Cosmos DB key..."
COSMOS_DB_KEY=$(az cosmosdb keys list --name $COSMOS_DB_ACCOUNT_NAME --resource-group $AZURE_RESOURCE_GROUP --query primaryMasterKey -o tsv)

echo "🔍 Getting OpenAI key..."
OPENAI_KEY=$(az cognitiveservices account keys list --name $OPENAI_ACCOUNT_NAME --resource-group $AZURE_RESOURCE_GROUP --query key1 -o tsv)

# Create .env file with all values (from Bicep outputs or defaults)
echo "📝 Creating .env file..."
cat > .env << EOF
# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=$COSMOS_DB_ENDPOINT
COSMOS_DB_KEY=$COSMOS_DB_KEY
COSMOS_DB_DATABASE_NAME=$COSMOS_DB_DATABASE_NAME
COSMOS_DB_CONTAINER_NAME=$COSMOS_DB_CONTAINER_NAME

# Azure OpenAI Configuration
OPENAI_ENDPOINT=$OPENAI_ENDPOINT
OPENAI_KEY=$OPENAI_KEY
OPENAI_GPT_DEPLOYMENT_NAME=$OPENAI_GPT_DEPLOYMENT_NAME
OPENAI_EMBEDDING_DEPLOYMENT_NAME=$OPENAI_EMBEDDING_DEPLOYMENT_NAME
EOF

echo "✅ Environment file created!"
echo ""
echo "🎯 Next steps:"
echo "1. Load movie data: npm run load-data"
echo "2. Vectorize data: npm run vectorize"
echo "3. Start the application: npm start"
