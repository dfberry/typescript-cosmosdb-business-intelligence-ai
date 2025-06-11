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
