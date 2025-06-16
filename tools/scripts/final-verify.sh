#!/bin/bash

# Final verification script for Movie AI application
echo "🎬 Movie AI - Final Verification"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check Node.js version
echo "📋 Checking prerequisites..."
NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

# Check if TypeScript is available
if ! npm list typescript &> /dev/null; then
    echo "❌ TypeScript not found"
    exit 1
fi
echo "✅ TypeScript: Available"

# Check environment file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run deployment first."
    exit 1
fi
echo "✅ Environment file: Found"

# Build the project
echo ""
echo "🔨 Building project..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build: Successful"
else
    echo "❌ Build: Failed"
    exit 1
fi

# Check compiled files
echo ""
echo "📁 Checking compiled files..."
EXPECTED_FILES=("config.js" "demo.js" "index.js" "load-data.js" "test-app.js" "test-config.js" "types.js" "vectorize.js")

for file in "${EXPECTED_FILES[@]}"; do
    if [ -f "dist/$file" ]; then
        echo "✅ $file: Compiled"
    else
        echo "❌ $file: Missing"
        exit 1
    fi
done

# Test configuration
echo ""
echo "⚙️  Testing configuration..."
if npm run test-config > /dev/null 2>&1; then
    echo "✅ Configuration: Valid"
else
    echo "❌ Configuration: Invalid"
    exit 1
fi

# Run comprehensive tests
echo ""
echo "🧪 Running comprehensive tests..."
if timeout 30s npm run test > /dev/null 2>&1; then
    echo "✅ Tests: All passed"
else
    echo "❌ Tests: Some failed or timed out"
    echo "ℹ️  Run 'npm run test' manually for details"
fi

# Final summary
echo ""
echo "🎉 Verification Complete!"
echo ""
echo "📚 Available commands:"
echo "  npm start        - Start interactive Movie AI"
echo "  npm run demo     - See demonstration"
echo "  npm run test     - Run tests"
echo "  npm run load-data - Load movie data"
echo "  npm run vectorize - Generate embeddings"
echo ""
echo "🚀 Movie AI is ready to use!"
