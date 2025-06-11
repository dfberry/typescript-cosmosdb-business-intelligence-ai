#!/bin/bash

set -e

echo "🚀 Starting Azure deployment..."

# Set default values
export AZURE_LOCATION=${AZURE_LOCATION:-"eastus2"}
export AZURE_ENV_NAME=${AZURE_ENV_NAME:-"movie-ai-$(date +%s)"}

echo "📍 Using location: $AZURE_LOCATION"
echo "🏷️  Using environment: $AZURE_ENV_NAME"

# Initialize azd environment if not already done
if [ ! -d ".azure" ]; then
    echo "🔧 Initializing azd environment..."
    azd init --environment $AZURE_ENV_NAME --location $AZURE_LOCATION --subscription "1bd6f57f-967b-4aed-a90f-d13ad8d84ffe"
fi

# Set environment variables
azd env set AZURE_LOCATION $AZURE_LOCATION
azd env set AZURE_ENV_NAME $AZURE_ENV_NAME

# Provision and deploy
echo "☁️  Provisioning Azure resources..."
azd provision --no-prompt

echo "✅ Deployment complete!"
echo "💡 Next steps:"
echo "1. Copy .env values from the output above"
echo "2. Run: npm install && npm run build"
echo "3. Run: npm run load-data"
echo "4. Run: npm run vectorize"
echo "5. Run: npm start"
