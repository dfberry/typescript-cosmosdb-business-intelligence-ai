#!/bin/bash

# Deploy Azure resources using Azure Developer CLI
echo "🚀 Deploying Azure resources..."

# Initialize Azure Developer CLI (if not already done)
azd init --template .

# Set environment variables
azd env set AZURE_LOCATION eastus2

# Deploy infrastructure
azd provision

# Get outputs and create .env file
echo "📝 Creating .env file..."
azd env get-values > .env

echo "✅ Deployment complete!"
echo "💡 Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Build the application: npm run build"  
echo "3. Load movie data: npm run load-data"
echo "4. Vectorize data: npm run vectorize"
echo "5. Start the application: npm start"
