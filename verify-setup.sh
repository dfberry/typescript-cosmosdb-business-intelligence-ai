#!/bin/bash

echo "🔍 Verifying setup..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./deploy.sh first or copy .env.template to .env and fill in values."
    exit 1
fi

# Check if required environment variables are set
source .env

if [ -z "$COSMOS_DB_ENDPOINT" ] || [ -z "$COSMOS_DB_KEY" ] || [ -z "$OPENAI_ENDPOINT" ] || [ -z "$OPENAI_KEY" ]; then
    echo "❌ Missing required environment variables in .env file."
    echo "Required: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, OPENAI_ENDPOINT, OPENAI_KEY"
    exit 1
fi

echo "✅ Required environment variables found"

# Check for additional configuration variables from Bicep outputs
if [ -n "$COSMOS_DB_DATABASE_NAME" ] && [ -n "$COSMOS_DB_CONTAINER_NAME" ] && [ -n "$OPENAI_GPT_DEPLOYMENT_NAME" ] && [ -n "$OPENAI_EMBEDDING_DEPLOYMENT_NAME" ]; then
    echo "✅ Bicep deployment configuration found"
    echo "  🗄️  Database: $COSMOS_DB_DATABASE_NAME"
    echo "  📦 Container: $COSMOS_DB_CONTAINER_NAME" 
    echo "  🎯 GPT Model: $OPENAI_GPT_DEPLOYMENT_NAME"
    echo "  📊 Embedding Model: $OPENAI_EMBEDDING_DEPLOYMENT_NAME"
else
    echo "⚠️  Using default configuration values (not from Bicep outputs)"
fi

# Check if dependencies are installed
if [ ! -d node_modules ]; then
    echo "❌ Dependencies not installed. Run: npm install"
    exit 1
fi

# Check if application is built
if [ ! -d dist ]; then
    echo "❌ Application not built. Run: npm run build"
    exit 1
fi

echo "✅ Setup verification complete!"
echo "💡 Next steps:"
echo "1. Load movie data: npm run load-data"
echo "2. Vectorize data: npm run vectorize"  
echo "3. Start the application: npm start"
