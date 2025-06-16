

  #!/bin/bash

# Azure Resource Configuration Validator & Troubleshooter
# Verifies .env configuration against actual Azure resources and suggests fixes

set -e  # Exit on any error

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Load environment variables from .env file
if [[ -f "$ENV_FILE" ]]; then
    echo "📄 Loading environment variables from .env file..."
    set -a  # Automatically export all variables
    source "$ENV_FILE"
    set +a  # Stop auto-exporting
    echo "✅ Environment variables loaded"
else
    echo "❌ Error: .env file not found at $ENV_FILE"
    echo "Please copy .env.example to .env and configure your values"
    exit 1
fi

# Extract resource names from endpoints
COSMOS_ACCOUNT_NAME=$(echo "$COSMOS_DB_ENDPOINT" | sed -n 's|https://\([^.]*\)\.documents\.azure\.com.*|\1|p')
OPENAI_ACCOUNT_NAME=$(echo "$OPENAI_LLM_ENDPOINT" | sed -n 's|https://\([^.]*\)\.openai\.azure\.com.*|\1|p')

if [[ -z "$COSMOS_ACCOUNT_NAME" ]]; then
    echo "❌ Error: Could not extract CosmosDB account name from endpoint: $COSMOS_DB_ENDPOINT"
    exit 1
fi

if [[ -z "$OPENAI_ACCOUNT_NAME" ]]; then
    echo "❌ Error: Could not extract OpenAI account name from endpoint: $OPENAI_LLM_ENDPOINT"
    exit 1
fi

# Function to validate configuration and suggest fixes
validate_configuration() {
    echo "🔍 Configuration Validation & Fix Suggestions"
    echo "============================================="
    
    local config_issues=0
    local config_fixes=()
    
    # Validate Azure subscription and resource group
    echo "1. Validating Azure subscription and resource group..."
    local current_subscription=$(az account show --query "id" -o tsv 2>/dev/null)
    
    if [[ "$current_subscription" != "$AZURE_SUBSCRIPTION_ID" ]]; then
        echo "   ⚠️  Current subscription ($current_subscription) differs from .env ($AZURE_SUBSCRIPTION_ID)"
        config_issues=$((config_issues + 1))
        config_fixes+=("RUN: az account set --subscription '$AZURE_SUBSCRIPTION_ID'")
    else
        echo "   ✅ Subscription matches .env configuration"
    fi
    
    # Validate resource group exists
    local rg_exists=$(az group show --name "$AZURE_RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null || echo "")
    if [[ -z "$rg_exists" ]]; then
        echo "   ❌ Resource group '$AZURE_RESOURCE_GROUP' not found"
        config_issues=$((config_issues + 1))
        config_fixes+=("CHECK: Verify AZURE_RESOURCE_GROUP='$AZURE_RESOURCE_GROUP' is correct in .env")
        
        echo "   📋 Available resource groups:"
        az group list --query "[].{Name:name,Location:location}" -o table 2>/dev/null | head -10
    else
        echo "   ✅ Resource group '$AZURE_RESOURCE_GROUP' exists"
    fi
    
    # Validate CosmosDB account exists
    echo ""
    echo "2. Validating CosmosDB configuration..."
    local cosmos_account_exists=$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$cosmos_account_exists" ]]; then
        echo "   ❌ CosmosDB account '$COSMOS_ACCOUNT_NAME' not found in resource group '$AZURE_RESOURCE_GROUP'"
        config_issues=$((config_issues + 1))
        config_fixes+=("CHECK: Verify COSMOS_DB_ENDPOINT='$COSMOS_DB_ENDPOINT' is correct in .env")
        
        # Show available CosmosDB accounts
        echo "   📋 Available CosmosDB accounts in subscription:"
        local available_cosmos=$(az cosmosdb list --query "[].{Name:name,ResourceGroup:resourceGroup,Location:location}" -o table 2>/dev/null)
        if [[ -n "$available_cosmos" ]]; then
            echo "$available_cosmos"
        else
            echo "   ⚠️  No CosmosDB accounts found in subscription"
        fi
    else
        echo "   ✅ CosmosDB account '$COSMOS_ACCOUNT_NAME' exists"
        
        # Validate database exists
        local db_exists=$(az cosmosdb sql database show --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --name "$COSMOS_DB_DATABASE_NAME" --query "id" -o tsv 2>/dev/null || echo "")
        
        if [[ -z "$db_exists" ]]; then
            echo "   ❌ Database '$COSMOS_DB_DATABASE_NAME' not found"
            config_issues=$((config_issues + 1))
            config_fixes+=("CREATE: az cosmosdb sql database create --account-name '$COSMOS_ACCOUNT_NAME' --resource-group '$AZURE_RESOURCE_GROUP' --name '$COSMOS_DB_DATABASE_NAME'")
            
            # Show available databases
            echo "   📋 Available databases:"
            az cosmosdb sql database list --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "[].id" -o table 2>/dev/null || echo "   ⚠️  No databases found"
        else
            echo "   ✅ Database '$COSMOS_DB_DATABASE_NAME' exists"
            
            # Validate container exists
            local container_exists=$(az cosmosdb sql container show --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --database-name "$COSMOS_DB_DATABASE_NAME" --name "$COSMOS_DB_CONTAINER_NAME" --query "id" -o tsv 2>/dev/null || echo "")
            
            if [[ -z "$container_exists" ]]; then
                echo "   ❌ Container '$COSMOS_DB_CONTAINER_NAME' not found"
                config_issues=$((config_issues + 1))
                config_fixes+=("CREATE: az cosmosdb sql container create --account-name '$COSMOS_ACCOUNT_NAME' --resource-group '$AZURE_RESOURCE_GROUP' --database-name '$COSMOS_DB_DATABASE_NAME' --name '$COSMOS_DB_CONTAINER_NAME' --partition-key-path '/id'")
            else
                echo "   ✅ Container '$COSMOS_DB_CONTAINER_NAME' exists"
            fi
        fi
        
        # Validate CosmosDB keys
        echo "   🔑 Validating CosmosDB keys..."
        local primary_key=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "primaryMasterKey" -o tsv 2>/dev/null || echo "")
        local secondary_key=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "secondaryMasterKey" -o tsv 2>/dev/null || echo "")
        
        if [[ -n "$primary_key" ]]; then
            if [[ "$COSMOS_DB_KEY" == "$primary_key" ]]; then
                echo "   ✅ .env key matches PRIMARY key"
            elif [[ "$COSMOS_DB_KEY" == "$secondary_key" ]]; then
                echo "   ✅ .env key matches SECONDARY key"
            else
                echo "   ❌ .env key does NOT match Azure keys"
                config_issues=$((config_issues + 1))
                config_fixes+=("UPDATE .env: Set COSMOS_DB_KEY to primary key: ${primary_key:0:20}...${primary_key: -10}")
            fi
        else
            echo "   ❌ Could not retrieve CosmosDB keys (permission denied)"
            config_issues=$((config_issues + 1))
            config_fixes+=("CHECK: Ensure you have Cosmos DB Account Reader role or higher")
        fi
    fi
    
    # Validate OpenAI account exists
    echo ""
    echo "3. Validating OpenAI configuration..."
    local openai_account_exists=$(az cognitiveservices account show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$openai_account_exists" ]]; then
        echo "   ❌ OpenAI account '$OPENAI_ACCOUNT_NAME' not found in resource group '$AZURE_RESOURCE_GROUP'"
        config_issues=$((config_issues + 1))
        config_fixes+=("CHECK: Verify OPENAI_LLM_ENDPOINT='$OPENAI_LLM_ENDPOINT' is correct in .env")
        
        # Show available OpenAI accounts
        echo "   📋 Available OpenAI accounts in subscription:"
        local available_openai=$(az cognitiveservices account list --query "[?kind=='OpenAI'].{Name:name,ResourceGroup:resourceGroup,Location:location,Kind:kind}" -o table 2>/dev/null)
        if [[ -n "$available_openai" ]]; then
            echo "$available_openai"
        else
            echo "   ⚠️  No OpenAI accounts found in subscription"
        fi
    else
        echo "   ✅ OpenAI account '$OPENAI_ACCOUNT_NAME' exists"
        
        # Validate deployments exist
        local llm_deployment_exists=$(az cognitiveservices account deployment show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --deployment-name "$OPENAI_LLM_DEPLOYMENT_NAME" --query "name" -o tsv 2>/dev/null || echo "")
        local embedding_deployment_exists=$(az cognitiveservices account deployment show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --deployment-name "$OPENAI_EMBEDDING_DEPLOYMENT_NAME" --query "name" -o tsv 2>/dev/null || echo "")
        
        if [[ -z "$llm_deployment_exists" ]]; then
            echo "   ❌ LLM deployment '$OPENAI_LLM_DEPLOYMENT_NAME' not found"
            config_issues=$((config_issues + 1))
            config_fixes+=("CHECK: Verify OPENAI_LLM_DEPLOYMENT_NAME='$OPENAI_LLM_DEPLOYMENT_NAME' is correct in .env")
        else
            echo "   ✅ LLM deployment '$OPENAI_LLM_DEPLOYMENT_NAME' exists"
        fi
        
        if [[ -z "$embedding_deployment_exists" ]]; then
            echo "   ❌ Embedding deployment '$OPENAI_EMBEDDING_DEPLOYMENT_NAME' not found"
            config_issues=$((config_issues + 1))
            config_fixes+=("CHECK: Verify OPENAI_EMBEDDING_DEPLOYMENT_NAME='$OPENAI_EMBEDDING_DEPLOYMENT_NAME' is correct in .env")
        else
            echo "   ✅ Embedding deployment '$OPENAI_EMBEDDING_DEPLOYMENT_NAME' exists"
        fi
        
        # Show all available deployments
        if [[ -z "$llm_deployment_exists" || -z "$embedding_deployment_exists" ]]; then
            echo "   📋 Available deployments:"
            az cognitiveservices account deployment list --name "$OPENAI_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query "[].{Name:name,Model:properties.model.name,Version:properties.model.version,Status:properties.provisioningState}" -o table 2>/dev/null
        fi
        
        # Validate OpenAI keys
        echo "   🔑 Validating OpenAI keys..."
        local openai_keys=$(az cognitiveservices account keys list --name "$OPENAI_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" 2>/dev/null || echo "")
        
        if [[ -n "$openai_keys" ]]; then
            local key1=$(echo "$openai_keys" | jq -r '.key1' 2>/dev/null || echo "")
            local key2=$(echo "$openai_keys" | jq -r '.key2' 2>/dev/null || echo "")
            
            if [[ "$OPENAI_LLM_KEY" == "$key1" ]] || [[ "$OPENAI_LLM_KEY" == "$key2" ]]; then
                echo "   ✅ LLM .env key matches Azure keys"
            else
                echo "   ❌ LLM .env key does NOT match Azure keys"
                config_issues=$((config_issues + 1))
                config_fixes+=("UPDATE .env: Set OPENAI_LLM_KEY to primary key: ${key1:0:20}...${key1: -10}")
            fi
            
            if [[ "$OPENAI_EMBEDDING_KEY" == "$key1" ]] || [[ "$OPENAI_EMBEDDING_KEY" == "$key2" ]]; then
                echo "   ✅ Embedding .env key matches Azure keys"
            else
                echo "   ❌ Embedding .env key does NOT match Azure keys"
                config_issues=$((config_issues + 1))
                config_fixes+=("UPDATE .env: Set OPENAI_EMBEDDING_KEY to primary key: ${key1:0:20}...${key1: -10}")
            fi
        else
            echo "   ❌ Could not retrieve OpenAI keys (permission denied)"
            config_issues=$((config_issues + 1))
            config_fixes+=("CHECK: Ensure you have Cognitive Services User role or higher")
        fi
    fi
    
    # API Version compatibility check
    echo ""
    echo "4. Checking API version compatibility..."
    echo "   Current LLM API Version: $OPENAI_LLM_API_VERSION"
    echo "   Current Embedding API Version: $OPENAI_EMBEDDING_API_VERSION"
    
    # Warn about old API versions
    if [[ "$OPENAI_LLM_API_VERSION" < "2024-06-01" ]]; then
        echo "   ⚠️  LLM API version '$OPENAI_LLM_API_VERSION' may be outdated"
        config_issues=$((config_issues + 1))
        config_fixes+=("RECOMMEND: Update OPENAI_LLM_API_VERSION to '2024-06-01' or newer for better compatibility")
    fi
    
    if [[ "$OPENAI_EMBEDDING_API_VERSION" < "2024-06-01" ]]; then
        echo "   ⚠️  Embedding API version '$OPENAI_EMBEDDING_API_VERSION' may be outdated"
        config_issues=$((config_issues + 1))
        config_fixes+=("RECOMMEND: Update OPENAI_EMBEDDING_API_VERSION to '2024-06-01' or newer for better compatibility")
    fi
    
    # Configuration summary
    echo ""
    echo "📋 CONFIGURATION VALIDATION SUMMARY"
    echo "=================================="
    if [[ $config_issues -eq 0 ]]; then
        echo "✅ All configuration appears to be correct!"
        echo "   Your .env file matches the Azure resources."
    else
        echo "❌ Found $config_issues configuration issue(s)"
        echo ""
        echo "🔧 RECOMMENDED ACTIONS:"
        echo "----------------------"
        for i in "${!config_fixes[@]}"; do
            echo "$((i+1)). ${config_fixes[i]}"
        done
    fi
    
    return $config_issues
}

echo "🔍 Using extracted resource names:"
echo "  Subscription: '$AZURE_SUBSCRIPTION_ID'"
echo "  Resource Group: '$AZURE_RESOURCE_GROUP'"
echo "  CosmosDB Account: '$COSMOS_ACCOUNT_NAME'"
echo "  OpenAI Account: '$OPENAI_ACCOUNT_NAME'"
echo ""

# Function to test API connectivity and suggest fixes
test_api_connectivity() {
    echo "🔧 Testing API Connectivity & Suggesting Fixes"
    echo "=============================================="
    
    local issues_found=0
    local fixes=()
    
    # Test OpenAI Embedding API
    echo "🧪 Testing OpenAI Embedding API..."
    local embedding_test=$(timeout 10 curl -s -w "%{http_code}" \
        -H "api-key: $OPENAI_EMBEDDING_KEY" \
        -H "Content-Type: application/json" \
        -d '{"input": ["test"]}' \
        -X POST \
        "$OPENAI_EMBEDDING_ENDPOINT/openai/deployments/$OPENAI_EMBEDDING_DEPLOYMENT_NAME/embeddings?api-version=$OPENAI_EMBEDDING_API_VERSION" \
        --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
    
    local embedding_status="${embedding_test: -3}"
    echo "   Status: $embedding_status"
    
    if [[ "$embedding_status" == "404" ]]; then
        echo "   ❌ Embedding API failed (404 - Resource not found)"
        issues_found=$((issues_found + 1))
        
        # Test with newer API versions
        echo "   🔍 Testing newer API versions..."
        local test_versions=("2024-06-01" "2024-08-01-preview" "2024-10-01-preview")
        local working_version=""
        
        for version in "${test_versions[@]}"; do
            local test_result=$(timeout 10 curl -s -w "%{http_code}" \
                -H "api-key: $OPENAI_EMBEDDING_KEY" \
                -H "Content-Type: application/json" \
                -d '{"input": ["test"]}' \
                -X POST \
                "$OPENAI_EMBEDDING_ENDPOINT/openai/deployments/$OPENAI_EMBEDDING_DEPLOYMENT_NAME/embeddings?api-version=$version" \
                --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
            
            local test_status="${test_result: -3}"
            if [[ "$test_status" == "200" ]]; then
                working_version="$version"
                echo "   ✅ API version $version works!"
                break
            else
                echo "   ❌ API version $version failed ($test_status)"
            fi
        done
        
        if [[ -n "$working_version" ]]; then
            fixes+=("UPDATE .env: Change OPENAI_EMBEDDING_API_VERSION from '$OPENAI_EMBEDDING_API_VERSION' to '$working_version'")
        else
            fixes+=("INVESTIGATE: No tested API versions work for embedding deployment '$OPENAI_EMBEDDING_DEPLOYMENT_NAME'")
        fi
    elif [[ "$embedding_status" == "200" ]]; then
        echo "   ✅ Embedding API working correctly"
    else
        echo "   ⚠️  Embedding API returned status: $embedding_status"
        issues_found=$((issues_found + 1))
        fixes+=("INVESTIGATE: Embedding API error (status: $embedding_status)")
    fi
    
    # Test OpenAI Chat Completion API
    echo ""
    echo "🧪 Testing OpenAI Chat Completion API..."
    local chat_test=$(timeout 10 curl -s -w "%{http_code}" \
        -H "api-key: $OPENAI_LLM_KEY" \
        -H "Content-Type: application/json" \
        -d '{"messages": [{"role": "user", "content": "test"}], "max_tokens": 5}' \
        -X POST \
        "$OPENAI_LLM_ENDPOINT/openai/deployments/$OPENAI_LLM_DEPLOYMENT_NAME/chat/completions?api-version=$OPENAI_LLM_API_VERSION" \
        --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
    
    local chat_status="${chat_test: -3}"
    echo "   Status: $chat_status"
    
    if [[ "$chat_status" == "404" ]]; then
        echo "   ❌ Chat Completion API failed (404 - Resource not found)"
        issues_found=$((issues_found + 1))
        
        # Test with newer API versions
        echo "   🔍 Testing newer API versions..."
        local test_versions=("2024-06-01" "2024-08-01-preview" "2024-10-01-preview")
        local working_version=""
        
        for version in "${test_versions[@]}"; do
            local test_result=$(timeout 10 curl -s -w "%{http_code}" \
                -H "api-key: $OPENAI_LLM_KEY" \
                -H "Content-Type: application/json" \
                -d '{"messages": [{"role": "user", "content": "test"}], "max_tokens": 5}' \
                -X POST \
                "$OPENAI_LLM_ENDPOINT/openai/deployments/$OPENAI_LLM_DEPLOYMENT_NAME/chat/completions?api-version=$version" \
                --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
            
            local test_status="${test_result: -3}"
            if [[ "$test_status" == "200" ]]; then
                working_version="$version"
                echo "   ✅ API version $version works!"
                break
            else
                echo "   ❌ API version $version failed ($test_status)"
            fi
        done
        
        if [[ -n "$working_version" ]]; then
            fixes+=("UPDATE .env: Change OPENAI_LLM_API_VERSION from '$OPENAI_LLM_API_VERSION' to '$working_version'")
        else
            fixes+=("INVESTIGATE: No tested API versions work for LLM deployment '$OPENAI_LLM_DEPLOYMENT_NAME'")
        fi
    elif [[ "$chat_status" == "200" ]]; then
        echo "   ✅ Chat Completion API working correctly"
    else
        echo "   ⚠️  Chat Completion API returned status: $chat_status"
        issues_found=$((issues_found + 1))
        fixes+=("INVESTIGATE: Chat Completion API error (status: $chat_status)")
    fi
    
    # Test CosmosDB connectivity
    echo ""
    echo "🧪 Testing CosmosDB connectivity..."
    local cosmos_test=$(timeout 10 curl -s -w "%{http_code}" \
        -H "Authorization: type%3dmaster%26ver%3d1.0%26sig%3d$(echo -n "get

dbs

$(date -u '+%a, %d %b %Y %H:%M:%S GMT')" | openssl dgst -sha256 -hmac "$(echo "$COSMOS_DB_KEY" | base64 -d)" -binary | base64)" \
        -H "x-ms-date: $(date -u '+%a, %d %b %Y %H:%M:%S GMT')" \
        -H "x-ms-version: 2018-12-31" \
        "$COSMOS_DB_ENDPOINT/dbs" \
        --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
    
    local cosmos_status="${cosmos_test: -3}"
    echo "   Status: $cosmos_status"
    
    if [[ "$cosmos_status" == "200" ]]; then
        echo "   ✅ CosmosDB API working correctly"
    else
        echo "   ⚠️  CosmosDB API returned status: $cosmos_status"
        issues_found=$((issues_found + 1))
        fixes+=("INVESTIGATE: CosmosDB connectivity issue (status: $cosmos_status)")
    fi
    
    # Summary and recommendations
    echo ""
    echo "📋 DIAGNOSIS SUMMARY"
    echo "==================="
    if [[ $issues_found -eq 0 ]]; then
        echo "✅ All APIs are working correctly!"
        echo "   Your .env configuration appears to be properly set up."
    else
        echo "❌ Found $issues_found issue(s) with your configuration"
        echo ""
        echo "🔧 RECOMMENDED FIXES:"
        echo "--------------------"
        for i in "${!fixes[@]}"; do
            echo "$((i+1)). ${fixes[i]}"
        done
        
        echo ""
        echo "📝 Quick Fix Commands:"
        echo "---------------------"
        for fix in "${fixes[@]}"; do
            if [[ "$fix" == UPDATE* ]]; then
                local var_name=$(echo "$fix" | grep -o 'OPENAI_[A-Z_]*')
                local new_value=$(echo "$fix" | grep -o "'[^']*'" | tail -1 | tr -d "'")
                echo "sed -i 's/^$var_name=.*/$var_name=$new_value/' .env"
            fi
        done
    fi
    
    return $issues_found
}

# Function to list all resources in subscription
list_all_subscription_resources() {
    echo "========================================"
    
    local current_subscription=$(az account show --query "id" -o tsv 2>/dev/null)
    
    if [[ "$current_subscription" != "$AZURE_SUBSCRIPTION_ID" ]]; then
        echo "⚠️  Warning: Current subscription ($current_subscription) differs from .env ($AZURE_SUBSCRIPTION_ID)"
        echo "🔄 Setting subscription to: $AZURE_SUBSCRIPTION_ID"
        az account set --subscription "$AZURE_SUBSCRIPTION_ID" 2>/dev/null || {
            echo "❌ Error: Could not set subscription to $AZURE_SUBSCRIPTION_ID"
            echo "Available subscriptions:"
            az account list --query "[].{Name:name,Id:id,IsDefault:isDefault}" -o table
            return 1
        }
    fi
    
    echo "📊 All resources in subscription:"
    echo ""
    
    # List all resources with type and location
    local all_resources=$(az resource list --query "[].{Name:name,Type:type,ResourceGroup:resourceGroup,Location:location}" -o table 2>/dev/null)
    
    if [[ -n "$all_resources" ]]; then
        echo "$all_resources"
    else
        echo "⚠️  No resources found or access denied"
        return 1
    fi
    
    echo ""
    echo "🎯 CosmosDB resources:"
    local cosmos_resources=$(az resource list --resource-type "Microsoft.DocumentDB/databaseAccounts" --query "[].{Name:name,ResourceGroup:resourceGroup,Location:location}" -o table 2>/dev/null)
    if [[ -n "$cosmos_resources" ]]; then
        echo "$cosmos_resources"
    else
        echo "❌ No CosmosDB accounts found"
    fi
    
    echo ""
    echo "🧠 Cognitive Services resources:"
    local cognitive_resources=$(az resource list --resource-type "Microsoft.CognitiveServices/accounts" --query "[].{Name:name,ResourceGroup:resourceGroup,Location:location,Kind:kind}" -o table 2>/dev/null)
    if [[ -n "$cognitive_resources" ]]; then
        echo "$cognitive_resources"
    else
        echo "❌ No Cognitive Services accounts found"
    fi
}

# Function to list resources in specific resource group
list_resource_group_resources() {
    echo "📁 Listing resources in resource group: $AZURE_RESOURCE_GROUP"
    echo "============================================================="
    
    # Check if resource group exists
    local rg_exists=$(az group show --name "$AZURE_RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$rg_exists" ]]; then
        echo "❌ Error: Resource group '$AZURE_RESOURCE_GROUP' not found"
        echo ""
        echo "Available resource groups:"
        az group list --query "[].{Name:name,Location:location}" -o table 2>/dev/null
        return 1
    fi
    
    echo "✅ Resource group '$AZURE_RESOURCE_GROUP' found"
    echo ""
    
    # List all resources in the resource group
    local rg_resources=$(az resource list --resource-group "$AZURE_RESOURCE_GROUP" --query "[].{Name:name,Type:type,Location:location}" -o table 2>/dev/null)
    
    if [[ -n "$rg_resources" ]]; then
        echo "$rg_resources"
    else
        echo "⚠️  No resources found in resource group '$AZURE_RESOURCE_GROUP'"
    fi
}

# Function to list CosmosDB databases
list_cosmos_databases() {
    echo "📊 Listing CosmosDB databases for account: $COSMOS_ACCOUNT_NAME"
    echo "=================================================="
    
    # Get the resource group name first (use the one from .env)
    local resource_group="$AZURE_RESOURCE_GROUP"
    
    # Verify the resource group exists and contains our CosmosDB account
    local account_exists=$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$account_exists" ]]; then
        echo "❌ Error: Could not find CosmosDB account '$COSMOS_ACCOUNT_NAME' in resource group '$resource_group'"
        echo ""
        echo "🔍 Searching for CosmosDB accounts in subscription..."
        local found_accounts=$(az cosmosdb list --query "[].{Name:name,ResourceGroup:resourceGroup,Location:location}" -o table 2>/dev/null)
        if [[ -n "$found_accounts" ]]; then
            echo "$found_accounts"
        else
            echo "❌ No CosmosDB accounts found in subscription"
        fi
        return 1
    fi
    
    echo "📍 Resource Group: $resource_group"
    echo ""
    
    # List all databases
    local databases=$(az cosmosdb sql database list --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --query "[].{Name:id,Throughput:options.throughput}" -o table 2>/dev/null)
    
    if [[ -n "$databases" ]]; then
        echo "$databases"
    else
        echo "⚠️  No databases found or access denied"
    fi
    
    echo ""
    echo "🎯 Expected database: $COSMOS_DB_DATABASE_NAME"
    
    # Check if expected database exists
    local db_exists=$(az cosmosdb sql database show --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --name "$COSMOS_DB_DATABASE_NAME" --query "id" -o tsv 2>/dev/null || echo "")
    
    if [[ -n "$db_exists" ]]; then
        echo "✅ Database '$COSMOS_DB_DATABASE_NAME' exists"
        
        # List containers in the database
        echo ""
        echo "📦 Containers in database '$COSMOS_DB_DATABASE_NAME':"
        local containers=$(az cosmosdb sql container list --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --database-name "$COSMOS_DB_DATABASE_NAME" --query "[].{Name:id,PartitionKey:partitionKey.paths[0]}" -o table 2>/dev/null)
        
        if [[ -n "$containers" ]]; then
            echo "$containers"
            echo ""
            echo "🎯 Expected container: $COSMOS_DB_CONTAINER_NAME"
            
            # Check if expected container exists
            local container_exists=$(az cosmosdb sql container show --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --database-name "$COSMOS_DB_DATABASE_NAME" --name "$COSMOS_DB_CONTAINER_NAME" --query "id" -o tsv 2>/dev/null || echo "")
            
            if [[ -n "$container_exists" ]]; then
                echo "✅ Container '$COSMOS_DB_CONTAINER_NAME' exists"
            else
                echo "❌ Container '$COSMOS_DB_CONTAINER_NAME' NOT found"
            fi
        else
            echo "⚠️  No containers found in database"
        fi
    else
        echo "❌ Database '$COSMOS_DB_DATABASE_NAME' NOT found"
    fi
    
    # Display CosmosDB keys
    echo ""
    echo "🔑 CosmosDB Connection Information:"
    echo "--------------------------------"
    echo "📍 Endpoint: $COSMOS_DB_ENDPOINT"
    
    # Get and display keys
    local primary_key=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --query "primaryMasterKey" -o tsv 2>/dev/null || echo "")
    local secondary_key=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --query "secondaryMasterKey" -o tsv 2>/dev/null || echo "")
    local primary_readonly=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --query "primaryReadonlyMasterKey" -o tsv 2>/dev/null || echo "")
    
    if [[ -n "$primary_key" ]]; then
        echo "🔐 Primary Key: ${primary_key:0:20}...${primary_key: -10}"
        echo "🔐 Secondary Key: ${secondary_key:0:20}...${secondary_key: -10}"
        echo "🔍 Primary ReadOnly Key: ${primary_readonly:0:20}...${primary_readonly: -10}"
        
        # Compare with .env key
        local env_key_start="${COSMOS_DB_KEY:0:20}"
        local env_key_end="${COSMOS_DB_KEY: -10}"
        echo ""
        echo "💾 Key from .env file: ${env_key_start}...${env_key_end}"
        
        if [[ "$COSMOS_DB_KEY" == "$primary_key" ]]; then
            echo "✅ .env key matches PRIMARY key"
        elif [[ "$COSMOS_DB_KEY" == "$secondary_key" ]]; then
            echo "✅ .env key matches SECONDARY key"
        elif [[ "$COSMOS_DB_KEY" == "$primary_readonly" ]]; then
            echo "✅ .env key matches PRIMARY READONLY key"
        else
            echo "❌ .env key does NOT match any Azure keys"
        fi
    else
        echo "❌ Could not retrieve CosmosDB keys (permission denied)"
    fi
    
    # Get connection strings
    local connection_strings=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT_NAME" --resource-group "$resource_group" --type connection-strings --query "connectionStrings[0].connectionString" -o tsv 2>/dev/null || echo "")
    if [[ -n "$connection_strings" ]]; then
        echo ""
        echo "🔗 Primary Connection String: ${connection_strings:0:50}...${connection_strings: -20}"
    fi
}

# Function to list OpenAI deployments
list_openai_deployments() {
    echo "🤖 Listing OpenAI deployments for account: $OPENAI_ACCOUNT_NAME"
    echo "================================================="
    
    # Get the resource group name first (use the one from .env)
    local resource_group="$AZURE_RESOURCE_GROUP"
    
    # Verify the resource group exists and contains our OpenAI account
    local account_exists=$(az cognitiveservices account show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$account_exists" ]]; then
        echo "❌ Error: Could not find OpenAI account '$OPENAI_ACCOUNT_NAME' in resource group '$resource_group'"
        echo ""
        echo "🔍 Searching for Cognitive Services accounts in subscription..."
        local found_accounts=$(az cognitiveservices account list --query "[?kind=='OpenAI'].{Name:name,ResourceGroup:resourceGroup,Location:location,Kind:kind}" -o table 2>/dev/null)
        if [[ -n "$found_accounts" ]]; then
            echo "$found_accounts"
        else
            echo "❌ No OpenAI accounts found in subscription"
        fi
        return 1
    fi
    
    echo "📍 Resource Group: $resource_group"
    echo ""
    
    # List all deployments
    local deployments=$(az cognitiveservices account deployment list --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" --query "[].{Name:name,Model:properties.model.name,Version:properties.model.version,Status:properties.provisioningState}" -o table 2>/dev/null)
    
    if [[ -n "$deployments" ]]; then
        echo "$deployments"
    else
        echo "⚠️  No deployments found or access denied"
    fi
    
    echo ""
    echo "🎯 Expected deployments:"
    echo "  LLM: $OPENAI_LLM_DEPLOYMENT_NAME"
    echo "  Embedding: $OPENAI_EMBEDDING_DEPLOYMENT_NAME"
    
    # Check if expected deployments exist
    local llm_exists=$(az cognitiveservices account deployment show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" --deployment-name "$OPENAI_LLM_DEPLOYMENT_NAME" --query "name" -o tsv 2>/dev/null || echo "")
    local embedding_exists=$(az cognitiveservices account deployment show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" --deployment-name "$OPENAI_EMBEDDING_DEPLOYMENT_NAME" --query "name" -o tsv 2>/dev/null || echo "")
    
    if [[ -n "$llm_exists" ]]; then
        echo "✅ LLM deployment '$OPENAI_LLM_DEPLOYMENT_NAME' exists"
    else
        echo "❌ LLM deployment '$OPENAI_LLM_DEPLOYMENT_NAME' NOT found"
    fi
    
    if [[ -n "$embedding_exists" ]]; then
        echo "✅ Embedding deployment '$OPENAI_EMBEDDING_DEPLOYMENT_NAME' exists"
    else
        echo "❌ Embedding deployment '$OPENAI_EMBEDDING_DEPLOYMENT_NAME' NOT found"
    fi
    
    # Display OpenAI keys and connection information
    echo ""
    echo "🔑 OpenAI Connection Information:"
    echo "-------------------------------"
    echo "📍 LLM Endpoint: $OPENAI_LLM_ENDPOINT"
    echo "📍 Embedding Endpoint: $OPENAI_EMBEDDING_ENDPOINT"
    echo "📍 API Version (LLM): $OPENAI_LLM_API_VERSION"
    echo "📍 API Version (Embedding): $OPENAI_EMBEDDING_API_VERSION"
    
    # Get and display keys
    local openai_keys=$(az cognitiveservices account keys list --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" 2>/dev/null || echo "")
    
    if [[ -n "$openai_keys" ]]; then
        local key1=$(echo "$openai_keys" | jq -r '.key1' 2>/dev/null || echo "")
        local key2=$(echo "$openai_keys" | jq -r '.key2' 2>/dev/null || echo "")
        
        if [[ -n "$key1" && "$key1" != "null" ]]; then
            echo "🔐 Primary Key: ${key1:0:20}...${key1: -10}"
        fi
        
        if [[ -n "$key2" && "$key2" != "null" ]]; then
            echo "🔐 Secondary Key: ${key2:0:20}...${key2: -10}"
        fi
        
        # Compare with .env keys
        echo ""
        local llm_env_key_start="${OPENAI_LLM_KEY:0:20}"
        local llm_env_key_end="${OPENAI_LLM_KEY: -10}"
        local embedding_env_key_start="${OPENAI_EMBEDDING_KEY:0:20}"
        local embedding_env_key_end="${OPENAI_EMBEDDING_KEY: -10}"
        
        echo "💾 LLM Key from .env: ${llm_env_key_start}...${llm_env_key_end}"
        echo "💾 Embedding Key from .env: ${embedding_env_key_start}...${embedding_env_key_end}"
        
        # Check if .env keys match Azure keys
        if [[ "$OPENAI_LLM_KEY" == "$key1" ]]; then
            echo "✅ LLM .env key matches PRIMARY key"
        elif [[ "$OPENAI_LLM_KEY" == "$key2" ]]; then
            echo "✅ LLM .env key matches SECONDARY key"
        else
            echo "❌ LLM .env key does NOT match any Azure keys"
        fi
        
        if [[ "$OPENAI_EMBEDDING_KEY" == "$key1" ]]; then
            echo "✅ Embedding .env key matches PRIMARY key"
        elif [[ "$OPENAI_EMBEDDING_KEY" == "$key2" ]]; then
            echo "✅ Embedding .env key matches SECONDARY key"
        else
            echo "❌ Embedding .env key does NOT match any Azure keys"
        fi
        
        # Check if both .env keys are the same (which is expected for same account)
        if [[ "$OPENAI_LLM_KEY" == "$OPENAI_EMBEDDING_KEY" ]]; then
            echo "✅ LLM and Embedding keys are identical (as expected for same account)"
        else
            echo "⚠️  LLM and Embedding keys are different (unusual for same account)"
        fi
    else
        echo "❌ Could not retrieve OpenAI keys (permission denied)"
    fi
    
    # Get account details for additional info
    local account_details=$(az cognitiveservices account show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$resource_group" --query "{SKU:sku.name,Kind:kind,Location:location,ProvisioningState:properties.provisioningState}" -o json 2>/dev/null || echo "")
    
    if [[ -n "$account_details" ]]; then
        echo ""
        echo "📊 Account Details:"
        local sku=$(echo "$account_details" | jq -r '.SKU' 2>/dev/null || echo "")
        local kind=$(echo "$account_details" | jq -r '.Kind' 2>/dev/null || echo "")
        local location=$(echo "$account_details" | jq -r '.Location' 2>/dev/null || echo "")
        local provisioning_state=$(echo "$account_details" | jq -r '.ProvisioningState' 2>/dev/null || echo "")
        
        echo "  SKU: $sku"
        echo "  Kind: $kind"
        echo "  Location: $location" 
        echo "  Provisioning State: $provisioning_state"
    fi
}

# Command line argument handling
show_help() {
    echo "🚀 Azure Resource Checker"
    echo "========================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --validate          Validate .env configuration against Azure resources (default)"
    echo "  -t, --test-api          Test API connectivity and suggest fixes"
    echo "  -a, --all               Show all resource information"
    echo "  -r, --resource-group    List resources in specific resource group"
    echo "  -c, --cosmos            List CosmosDB databases only"
    echo "  -o, --openai            List OpenAI deployments only"
    echo "  -s, --summary           Show summary of all resources"
    echo ""
    echo "Examples:"
    echo "  $0                      # Validate configuration and test API connectivity"
    echo "  $0 --validate           # Validate .env against Azure resources"
    echo "  $0 --test-api           # Test API endpoints and suggest fixes"
    echo "  $0 --cosmos             # Show only CosmosDB information"
    echo "  $0 --openai             # Show only OpenAI information"
    echo ""
}

# Parse command line arguments
SHOW_VALIDATE=true
SHOW_TEST_API=false
SHOW_ALL=false
SHOW_SUBSCRIPTION=false
SHOW_RESOURCE_GROUP=false
SHOW_COSMOS=false
SHOW_OPENAI=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--validate)
            SHOW_VALIDATE=true
            SHOW_TEST_API=false
            SHOW_ALL=false
            shift
            ;;
        -t|--test-api)
            SHOW_VALIDATE=false
            SHOW_TEST_API=true
            SHOW_ALL=false
            shift
            ;;
        -a|--all)
            SHOW_VALIDATE=false
            SHOW_TEST_API=false
            SHOW_ALL=true
            SHOW_SUBSCRIPTION=true
            SHOW_RESOURCE_GROUP=true
            SHOW_COSMOS=true
            SHOW_OPENAI=true
            shift
            ;;
        -r|--resource-group)
            SHOW_VALIDATE=false
            SHOW_TEST_API=false
            SHOW_ALL=false
            SHOW_RESOURCE_GROUP=true
            shift
            ;;
        -c|--cosmos)
            SHOW_VALIDATE=false
            SHOW_TEST_API=false
            SHOW_ALL=false
            SHOW_COSMOS=true
            shift
            ;;
        -o|--openai)
            SHOW_VALIDATE=false
            SHOW_TEST_API=false
            SHOW_ALL=false
            SHOW_OPENAI=true
            shift
            ;;
        -s|--summary)
            SHOW_VALIDATE=false
            SHOW_TEST_API=false
            SHOW_ALL=false
            SHOW_SUBSCRIPTION=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default behavior: validate configuration and test API connectivity
if [[ "$SHOW_VALIDATE" == true ]]; then
    SHOW_TEST_API=true
fi

# Main execution
echo "🚀 Azure Resource Configuration Validator"
echo "========================================"
echo ""

# Check if Azure CLI is logged in
if ! az account show >/dev/null 2>&1; then
    echo "❌ Error: Azure CLI is not logged in"
    echo "Please run: az login"
    exit 1
fi

echo "👤 Current Azure account: $(az account show --query "name" -o tsv)"
echo "📋 Subscription: $(az account show --query "id" -o tsv)"
echo ""

# Track overall issues
TOTAL_ISSUES=0

# Execute functions based on arguments
if [[ "$SHOW_VALIDATE" == true ]]; then
    validate_configuration
    VALIDATION_ISSUES=$?
    TOTAL_ISSUES=$((TOTAL_ISSUES + VALIDATION_ISSUES))
    echo ""
fi

if [[ "$SHOW_TEST_API" == true ]]; then
    if [[ "$SHOW_VALIDATE" == true ]]; then
        echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" 
        echo ""
    fi
    test_api_connectivity
    API_ISSUES=$?
    TOTAL_ISSUES=$((TOTAL_ISSUES + API_ISSUES))
    echo ""
fi

if [[ "$SHOW_SUBSCRIPTION" == true ]]; then
    if [[ "$SHOW_VALIDATE" == true || "$SHOW_TEST_API" == true ]]; then
        echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" 
        echo ""
    fi
    list_all_subscription_resources
    echo ""
fi

if [[ "$SHOW_RESOURCE_GROUP" == true ]]; then
    if [[ "$SHOW_SUBSCRIPTION" == true || "$SHOW_VALIDATE" == true || "$SHOW_TEST_API" == true ]]; then
        echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" 
        echo ""
    fi
    list_resource_group_resources
    echo ""
fi

if [[ "$SHOW_COSMOS" == true ]]; then
    if [[ "$SHOW_RESOURCE_GROUP" == true || "$SHOW_SUBSCRIPTION" == true || "$SHOW_VALIDATE" == true || "$SHOW_TEST_API" == true ]]; then
        echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" 
        echo ""
    fi
    list_cosmos_databases
    echo ""
fi

if [[ "$SHOW_OPENAI" == true ]]; then
    if [[ "$SHOW_COSMOS" == true || "$SHOW_RESOURCE_GROUP" == true || "$SHOW_SUBSCRIPTION" == true || "$SHOW_VALIDATE" == true || "$SHOW_TEST_API" == true ]]; then
        echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" 
        echo ""
    fi
    list_openai_deployments
    echo ""
fi

# Final summary
echo "🏁 VALIDATION COMPLETED!"
echo "========================"
if [[ $TOTAL_ISSUES -eq 0 ]]; then
    echo "✅ All checks passed! Your configuration is working correctly."
else
    echo "❌ Found $TOTAL_ISSUES total issue(s) that need attention."
    echo "Please review the recommendations above and apply the suggested fixes."
fi

exit $TOTAL_ISSUES