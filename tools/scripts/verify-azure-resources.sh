#!/bin/bash

# Azure Resource Verification Script
# This script verifies that all required Azure resources exist and are properly configured

set -e  # Exit on any error

echo "🔍 Azure Resource Verification Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if Azure CLI is logged in
check_azure_login() {
    print_status "INFO" "Checking Azure CLI login status..."
    if az account show &>/dev/null; then
        local account_name=$(az account show --query name -o tsv)
        local subscription_id=$(az account show --query id -o tsv)
        print_status "SUCCESS" "Logged in to Azure subscription: $account_name ($subscription_id)"
        return 0
    else
        print_status "ERROR" "Not logged in to Azure CLI. Please run 'az login' first."
        return 1
    fi
}

# Function to extract configuration from environment or defaults
get_config() {
    # CosmosDB Configuration
    COSMOS_ENDPOINT="${COSMOS_ENDPOINT:-https://cosmos-nosql-bizintell.documents.azure.com:443/}"
    COSMOS_KEY="${COSMOS_KEY}"
    COSMOS_DATABASE_ID="${COSMOS_DATABASE_ID:-MovieDB}"
    COSMOS_CONTAINER_ID="${COSMOS_CONTAINER_ID:-Movies}"
    
    # OpenAI Configuration
    OPENAI_ENDPOINT="${OPENAI_ENDPOINT:-https://openai-intell.openai.azure.com/}"
    OPENAI_KEY="${OPENAI_KEY}"
    LLM_DEPLOYMENT_NAME="${LLM_DEPLOYMENT_NAME:-gpt-4o}"
    EMBEDDING_DEPLOYMENT_NAME="${EMBEDDING_DEPLOYMENT_NAME:-text-embedding-ada-002}"
    
    print_status "INFO" "Using configuration:"
    echo "  CosmosDB Endpoint: $COSMOS_ENDPOINT"
    echo "  CosmosDB Database: $COSMOS_DATABASE_ID"
    echo "  CosmosDB Container: $COSMOS_CONTAINER_ID"
    echo "  OpenAI Endpoint: $OPENAI_ENDPOINT"
    echo "  LLM Deployment: $LLM_DEPLOYMENT_NAME"
    echo "  Embedding Deployment: $EMBEDDING_DEPLOYMENT_NAME"
    echo ""
}

# Function to extract resource details from URLs
extract_resource_details() {
    # Extract CosmosDB account name from endpoint
    COSMOS_ACCOUNT_NAME=$(echo "$COSMOS_ENDPOINT" | sed -n 's/https:\/\/\([^.]*\)\.documents\.azure\.com.*/\1/p')
    
    # Extract OpenAI service name from endpoint
    OPENAI_SERVICE_NAME=$(echo "$OPENAI_ENDPOINT" | sed -n 's/https:\/\/\([^.]*\)\.openai\.azure\.com.*/\1/p')
    
    print_status "INFO" "Extracted resource names:"
    echo "  CosmosDB Account: $COSMOS_ACCOUNT_NAME"
    echo "  OpenAI Service: $OPENAI_SERVICE_NAME"
    echo ""
}

# Function to find resource group for a resource
find_resource_group() {
    local resource_name=$1
    local resource_type=$2
    
    print_status "INFO" "Finding resource group for $resource_type: $resource_name"
    
    case $resource_type in
        "cosmosdb")
            local rg=$(az cosmosdb list --query "[?name=='$resource_name'].resourceGroup" -o tsv 2>/dev/null | head -1)
            ;;
        "openai")
            local rg=$(az cognitiveservices account list --query "[?name=='$resource_name'].resourceGroup" -o tsv 2>/dev/null | head -1)
            ;;
    esac
    
    if [ -n "$rg" ]; then
        print_status "SUCCESS" "Found $resource_type in resource group: $rg"
        echo "$rg"
    else
        print_status "WARNING" "Could not find resource group for $resource_type: $resource_name"
        echo ""
    fi
}

# Function to verify CosmosDB account
verify_cosmosdb_account() {
    print_status "INFO" "Verifying CosmosDB account: $COSMOS_ACCOUNT_NAME"
    
    local rg=$(find_resource_group "$COSMOS_ACCOUNT_NAME" "cosmosdb")
    if [ -z "$rg" ]; then
        print_status "ERROR" "CosmosDB account '$COSMOS_ACCOUNT_NAME' not found"
        return 1
    fi
    
    # Get account details
    local account_info=$(az cosmosdb show --name "$COSMOS_ACCOUNT_NAME" --resource-group "$rg" 2>/dev/null)
    if [ $? -eq 0 ]; then
        local location=$(echo "$account_info" | jq -r '.location')
        local kind=$(echo "$account_info" | jq -r '.kind')
        local provisioning_state=$(echo "$account_info" | jq -r '.provisioningState')
        
        print_status "SUCCESS" "CosmosDB account found"
        echo "  Location: $location"
        echo "  Kind: $kind"
        echo "  Provisioning State: $provisioning_state"
        
        # Check if NoSQL API is enabled
        local capabilities=$(echo "$account_info" | jq -r '.capabilities[].name' 2>/dev/null)
        if echo "$capabilities" | grep -q "EnableCassandra\|EnableMongo\|EnableGremlin\|EnableTable" && [ "$kind" != "GlobalDocumentDB" ]; then
            print_status "WARNING" "CosmosDB account may not have NoSQL API enabled"
        else
            print_status "SUCCESS" "CosmosDB NoSQL API appears to be enabled"
        fi
        
        return 0
    else
        print_status "ERROR" "Failed to get CosmosDB account details"
        return 1
    fi
}

# Function to verify CosmosDB database and container
verify_cosmosdb_database() {
    print_status "INFO" "Verifying CosmosDB database: $COSMOS_DATABASE_ID"
    
    local rg=$(find_resource_group "$COSMOS_ACCOUNT_NAME" "cosmosdb")
    if [ -z "$rg" ]; then
        return 1
    fi
    
    # Check if database exists
    local db_exists=$(az cosmosdb sql database exists --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$rg" --name "$COSMOS_DATABASE_ID" 2>/dev/null)
    if [ "$db_exists" == "true" ]; then
        print_status "SUCCESS" "Database '$COSMOS_DATABASE_ID' exists"
        
        # Check if container exists
        local container_exists=$(az cosmosdb sql container exists --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$rg" --database-name "$COSMOS_DATABASE_ID" --name "$COSMOS_CONTAINER_ID" 2>/dev/null)
        if [ "$container_exists" == "true" ]; then
            print_status "SUCCESS" "Container '$COSMOS_CONTAINER_ID' exists"
            
            # Get container details
            local container_info=$(az cosmosdb sql container show --account-name "$COSMOS_ACCOUNT_NAME" --resource-group "$rg" --database-name "$COSMOS_DATABASE_ID" --name "$COSMOS_CONTAINER_ID" 2>/dev/null)
            if [ $? -eq 0 ]; then
                local partition_key=$(echo "$container_info" | jq -r '.resource.partitionKey.paths[0]' 2>/dev/null)
                print_status "INFO" "Container partition key: $partition_key"
            fi
        else
            print_status "WARNING" "Container '$COSMOS_CONTAINER_ID' does not exist"
        fi
    else
        print_status "WARNING" "Database '$COSMOS_DATABASE_ID' does not exist"
    fi
}

# Function to verify OpenAI service
verify_openai_service() {
    print_status "INFO" "Verifying OpenAI service: $OPENAI_SERVICE_NAME"
    
    local rg=$(find_resource_group "$OPENAI_SERVICE_NAME" "openai")
    if [ -z "$rg" ]; then
        print_status "ERROR" "OpenAI service '$OPENAI_SERVICE_NAME' not found"
        return 1
    fi
    
    # Get service details
    local service_info=$(az cognitiveservices account show --name "$OPENAI_SERVICE_NAME" --resource-group "$rg" 2>/dev/null)
    if [ $? -eq 0 ]; then
        local location=$(echo "$service_info" | jq -r '.location')
        local kind=$(echo "$service_info" | jq -r '.kind')
        local provisioning_state=$(echo "$service_info" | jq -r '.provisioningState')
        local sku=$(echo "$service_info" | jq -r '.sku.name')
        
        print_status "SUCCESS" "OpenAI service found"
        echo "  Location: $location"
        echo "  Kind: $kind"
        echo "  SKU: $sku"
        echo "  Provisioning State: $provisioning_state"
        
        if [ "$kind" != "OpenAI" ]; then
            print_status "WARNING" "Service kind is '$kind', expected 'OpenAI'"
        fi
        
        return 0
    else
        print_status "ERROR" "Failed to get OpenAI service details"
        return 1
    fi
}

# Function to verify OpenAI deployments
verify_openai_deployments() {
    print_status "INFO" "Verifying OpenAI deployments"
    
    local rg=$(find_resource_group "$OPENAI_SERVICE_NAME" "openai")
    if [ -z "$rg" ]; then
        return 1
    fi
    
    # List all deployments
    local deployments=$(az cognitiveservices account deployment list --name "$OPENAI_SERVICE_NAME" --resource-group "$rg" 2>/dev/null)
    if [ $? -eq 0 ]; then
        local deployment_names=$(echo "$deployments" | jq -r '.[].name' 2>/dev/null)
        
        print_status "INFO" "Available deployments:"
        echo "$deployment_names" | while read -r dep_name; do
            if [ -n "$dep_name" ]; then
                echo "  - $dep_name"
            fi
        done
        
        # Check specific deployments
        if echo "$deployment_names" | grep -q "^$LLM_DEPLOYMENT_NAME$"; then
            print_status "SUCCESS" "LLM deployment '$LLM_DEPLOYMENT_NAME' found"
            
            # Get deployment details
            local llm_deployment=$(az cognitiveservices account deployment show --name "$OPENAI_SERVICE_NAME" --resource-group "$rg" --deployment-name "$LLM_DEPLOYMENT_NAME" 2>/dev/null)
            if [ $? -eq 0 ]; then
                local model=$(echo "$llm_deployment" | jq -r '.properties.model.name')
                local version=$(echo "$llm_deployment" | jq -r '.properties.model.version')
                local capacity=$(echo "$llm_deployment" | jq -r '.properties.currentCapacity')
                local provisioning_state=$(echo "$llm_deployment" | jq -r '.properties.provisioningState')
                
                echo "  Model: $model"
                echo "  Version: $version"
                echo "  Capacity: $capacity"
                echo "  Provisioning State: $provisioning_state"
                
                if [ "$provisioning_state" != "Succeeded" ]; then
                    print_status "WARNING" "LLM deployment provisioning state is '$provisioning_state'"
                fi
            fi
        else
            print_status "ERROR" "LLM deployment '$LLM_DEPLOYMENT_NAME' not found"
        fi
        
        if echo "$deployment_names" | grep -q "^$EMBEDDING_DEPLOYMENT_NAME$"; then
            print_status "SUCCESS" "Embedding deployment '$EMBEDDING_DEPLOYMENT_NAME' found"
            
            # Get deployment details
            local emb_deployment=$(az cognitiveservices account deployment show --name "$OPENAI_SERVICE_NAME" --resource-group "$rg" --deployment-name "$EMBEDDING_DEPLOYMENT_NAME" 2>/dev/null)
            if [ $? -eq 0 ]; then
                local model=$(echo "$emb_deployment" | jq -r '.properties.model.name')
                local version=$(echo "$emb_deployment" | jq -r '.properties.model.version')
                local capacity=$(echo "$emb_deployment" | jq -r '.properties.currentCapacity')
                local provisioning_state=$(echo "$emb_deployment" | jq -r '.properties.provisioningState')
                
                echo "  Model: $model"
                echo "  Version: $version"
                echo "  Capacity: $capacity"
                echo "  Provisioning State: $provisioning_state"
                
                if [ "$provisioning_state" != "Succeeded" ]; then
                    print_status "WARNING" "Embedding deployment provisioning state is '$provisioning_state'"
                fi
            fi
        else
            print_status "ERROR" "Embedding deployment '$EMBEDDING_DEPLOYMENT_NAME' not found"
        fi
    else
        print_status "ERROR" "Failed to list OpenAI deployments"
        return 1
    fi
}

# Function to test CosmosDB connectivity
test_cosmosdb_connectivity() {
    print_status "INFO" "Testing CosmosDB connectivity"
    
    if [ -z "$COSMOS_KEY" ]; then
        print_status "WARNING" "COSMOS_KEY not provided, skipping connectivity test"
        return 0
    fi
    
    # Test connection using curl
    local endpoint_base=$(echo "$COSMOS_ENDPOINT" | sed 's|/$||')
    local test_url="$endpoint_base/dbs"
    
    local response=$(curl -s -w "%{http_code}" -H "Authorization: $COSMOS_KEY" -H "x-ms-version: 2018-12-31" "$test_url" -o /dev/null)
    
    if [ "$response" -eq 200 ] || [ "$response" -eq 401 ] || [ "$response" -eq 403 ]; then
        if [ "$response" -eq 200 ]; then
            print_status "SUCCESS" "CosmosDB endpoint is reachable and key is valid"
        else
            print_status "WARNING" "CosmosDB endpoint is reachable but authentication failed (HTTP $response)"
        fi
    else
        print_status "ERROR" "CosmosDB endpoint connectivity test failed (HTTP $response)"
    fi
}

# Function to test OpenAI connectivity
test_openai_connectivity() {
    print_status "INFO" "Testing OpenAI connectivity"
    
    if [ -z "$OPENAI_KEY" ]; then
        print_status "WARNING" "OPENAI_KEY not provided, skipping connectivity test"
        return 0
    fi
    
    # Test connection using curl
    local endpoint_base=$(echo "$OPENAI_ENDPOINT" | sed 's|/$||')
    local test_url="$endpoint_base/openai/deployments?api-version=2023-05-15"
    
    local response=$(curl -s -w "%{http_code}" -H "api-key: $OPENAI_KEY" "$test_url" -o /dev/null)
    
    if [ "$response" -eq 200 ]; then
        print_status "SUCCESS" "OpenAI endpoint is reachable and key is valid"
        
        # Test specific deployments
        local llm_url="$endpoint_base/openai/deployments/$LLM_DEPLOYMENT_NAME/chat/completions?api-version=2024-04-01-preview"
        local llm_response=$(curl -s -w "%{http_code}" -H "api-key: $OPENAI_KEY" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"test"}],"max_tokens":1}' "$llm_url" -o /dev/null)
        
        if [ "$llm_response" -eq 200 ]; then
            print_status "SUCCESS" "LLM deployment '$LLM_DEPLOYMENT_NAME' is accessible"
        else
            print_status "ERROR" "LLM deployment '$LLM_DEPLOYMENT_NAME' is not accessible (HTTP $llm_response)"
        fi
        
        local emb_url="$endpoint_base/openai/deployments/$EMBEDDING_DEPLOYMENT_NAME/embeddings?api-version=2023-05-15"
        local emb_response=$(curl -s -w "%{http_code}" -H "api-key: $OPENAI_KEY" -H "Content-Type: application/json" -d '{"input":"test"}' "$emb_url" -o /dev/null)
        
        if [ "$emb_response" -eq 200 ]; then
            print_status "SUCCESS" "Embedding deployment '$EMBEDDING_DEPLOYMENT_NAME' is accessible"
        else
            print_status "ERROR" "Embedding deployment '$EMBEDDING_DEPLOYMENT_NAME' is not accessible (HTTP $emb_response)"
        fi
        
    elif [ "$response" -eq 401 ] || [ "$response" -eq 403 ]; then
        print_status "WARNING" "OpenAI endpoint is reachable but authentication failed (HTTP $response)"
    else
        print_status "ERROR" "OpenAI endpoint connectivity test failed (HTTP $response)"
    fi
}

# Function to generate summary report
generate_summary() {
    echo ""
    print_status "INFO" "Verification Summary"
    echo "===================="
    
    echo ""
    echo "Configuration Used:"
    echo "  CosmosDB Endpoint: $COSMOS_ENDPOINT"
    echo "  CosmosDB Account: $COSMOS_ACCOUNT_NAME"
    echo "  Database: $COSMOS_DATABASE_ID"
    echo "  Container: $COSMOS_CONTAINER_ID"
    echo "  OpenAI Endpoint: $OPENAI_ENDPOINT"
    echo "  OpenAI Service: $OPENAI_SERVICE_NAME"
    echo "  LLM Deployment: $LLM_DEPLOYMENT_NAME"
    echo "  Embedding Deployment: $EMBEDDING_DEPLOYMENT_NAME"
    
    echo ""
    echo "Next Steps:"
    echo "1. If any resources are missing, check your Azure subscription and resource groups"
    echo "2. If deployments are missing, create them in the Azure OpenAI Studio"
    echo "3. If connectivity tests fail, verify your API keys and network access"
    echo "4. If deployments exist but are not accessible, check their provisioning state"
    
    echo ""
    print_status "INFO" "To run individual resource checks:"
    echo "  az cosmosdb show --name $COSMOS_ACCOUNT_NAME --resource-group <rg-name>"
    echo "  az cognitiveservices account show --name $OPENAI_SERVICE_NAME --resource-group <rg-name>"
    echo "  az cognitiveservices account deployment list --name $OPENAI_SERVICE_NAME --resource-group <rg-name>"
}

# Main execution
main() {
    echo ""
    
    # Check prerequisites
    if ! command -v az &> /dev/null; then
        print_status "ERROR" "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_status "ERROR" "jq is not installed. Please install it first: sudo apt-get install jq"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_status "ERROR" "curl is not installed. Please install it first."
        exit 1
    fi
    
    # Execute verification steps
    check_azure_login || exit 1
    
    echo ""
    get_config
    extract_resource_details
    
    echo ""
    verify_cosmosdb_account
    verify_cosmosdb_database
    
    echo ""
    verify_openai_service
    verify_openai_deployments
    
    echo ""
    test_cosmosdb_connectivity
    test_openai_connectivity
    
    generate_summary
}

# Run the script
main "$@"
