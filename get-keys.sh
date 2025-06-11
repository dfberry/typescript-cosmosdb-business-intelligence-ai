#!/bin/bash

set -e

echo "🔑 Getting Azure resource keys..."

# Get resource group and account names from azd env
RESOURCE_GROUP="rg-$(azd env get-value AZURE_ENV_NAME)"
COSMOS_ACCOUNT="cosmos-$(azd env get-value AZURE_ENV_NAME)"
OPENAI_ACCOUNT="openai-$(azd env get-value AZURE_ENV_NAME)"

echo "📍 Resource Group: $RESOURCE_GROUP"
echo "🗄️  Cosmos Account: $COSMOS_ACCOUNT"
echo "🧠 OpenAI Account: $OPENAI_ACCOUNT"

# Get Cosmos DB connection details
echo "🔍 Getting Cosmos DB key..."
COSMOS_ENDPOINT=$(az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryMasterKey -o tsv)

# Get OpenAI connection details  
echo "🔍 Getting OpenAI key..."
OPENAI_ENDPOINT=$(az cognitiveservices account show --name $OPENAI_ACCOUNT --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)
OPENAI_KEY=$(az cognitiveservices account keys list --name $OPENAI_ACCOUNT --resource-group $RESOURCE_GROUP --query key1 -o tsv)

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT
COSMOS_DB_KEY=$COSMOS_KEY

# Azure OpenAI Configuration
OPENAI_ENDPOINT=$OPENAI_ENDPOINT
OPENAI_KEY=$OPENAI_KEY
EOF

echo "✅ Environment file created!"
echo ""
echo "🎯 Next steps:"
echo "1. Load movie data: npm run load-data"
echo "2. Vectorize data: npm run vectorize"
echo "3. Start the application: npm start"
