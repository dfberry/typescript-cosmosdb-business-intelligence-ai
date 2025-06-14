#!/bin/bash

# Script to list all databases in an Azure Cosmos DB account
# Usage: ./list-cosmos-databases.sh

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$COSMOS_DB_ENDPOINT" ]; then
    echo "❌ COSMOS_DB_ENDPOINT not found in .env file"
    exit 1
fi

# Extract account name from endpoint URL
# Format: https://ACCOUNT_NAME.documents.azure.com:443/
COSMOS_ACCOUNT_NAME=$(echo "$COSMOS_DB_ENDPOINT" | sed -n 's/.*https:\/\/\([^.]*\)\.documents\.azure\.com.*/\1/p')

if [ -z "$COSMOS_ACCOUNT_NAME" ]; then
    echo "❌ Could not extract Cosmos DB account name from endpoint: $COSMOS_DB_ENDPOINT"
    exit 1
fi

echo "🔍 Listing databases in Cosmos DB account: $COSMOS_ACCOUNT_NAME"
echo "📍 Endpoint: $COSMOS_DB_ENDPOINT"
echo ""

# List all databases in the Cosmos DB account
echo "📋 Databases:"
az cosmosdb sql database list \
    --account-name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "${RESOURCE_GROUP:-$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --query resourceGroup -o tsv)}" \
    --query "[].{Name:id,Throughput:resource.throughput}" \
    --output table

echo ""
echo "✅ Database listing complete"

# Optional: Show detailed information about a specific database if it exists
if [ -n "$COSMOS_DATABASE_ID" ]; then
    echo ""
    echo "🔍 Checking for database: $COSMOS_DATABASE_ID"
    
    DB_EXISTS=$(az cosmosdb sql database show \
        --account-name "$COSMOS_ACCOUNT_NAME" \
        --resource-group "${RESOURCE_GROUP:-$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --query resourceGroup -o tsv)}" \
        --name "$COSMOS_DATABASE_ID" \
        --query "id" -o tsv 2>/dev/null)
    
    if [ -n "$DB_EXISTS" ]; then
        echo "✅ Database '$COSMOS_DATABASE_ID' exists"
        
        # List containers in the database
        echo ""
        echo "📋 Containers in database '$COSMOS_DATABASE_ID':"
        az cosmosdb sql container list \
            --account-name "$COSMOS_ACCOUNT_NAME" \
            --resource-group "${RESOURCE_GROUP:-$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --query resourceGroup -o tsv)}" \
            --database-name "$COSMOS_DATABASE_ID" \
            --query "[].{Name:id,PartitionKey:resource.partitionKey.paths[0]}" \
            --output table
    else
        echo "❌ Database '$COSMOS_DATABASE_ID' does not exist"
    fi
fi
