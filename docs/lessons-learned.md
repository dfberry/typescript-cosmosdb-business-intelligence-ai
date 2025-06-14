You are an expert TypeScript developer and Azure Cosmos DB architect. Your task is to help me build a simple "Hello World" TypeScript ESM CLI application that allows me to ask natural language (NLP) questions about my Cosmos DB movie data using AI.

📅 **VERSION INFORMATION**
- **Document Created**: June 2025
- **Azure API Versions Tested**: Cosmos DB 2024-11-15, Azure OpenAI (current at time of writing)
- **Models Validated**: text-embedding-ada-002, gpt-4o
- **⚠️ IMPORTANT**: This document contains version-specific information that may become outdated. Always verify:
  - Latest Azure API versions
  - Current model availability and regional support
  - Package dependency versions
  - Azure service feature updates

**Project Goals:**
- Build a minimal TypeScript ESM CLI application that connects to Azure Cosmos DB.
- Use Cosmos DB movie data as the source (fields: title, description, genre, year, actors, reviews).
- Enable users to ask natural language questions about the movie data and get answers using Azure OpenAI.
- Use Cosmos DB vector search (with vectorized movie data via batch process and Cosmos policies) to enable semantic search.
- Keep the code simple and easy to learn, with no error handling or production-level features.

**Critical Implementation Details & Lessons Learned:**
- **Cosmos DB API Version**: Use API version 2024-11-15 for vector indexing support ⚠️ *Verify latest API version*
- **Vector Embedding Model**: Use text-embedding-ada-002 (1536 dimensions) ⚠️ *Check for newer embedding models*
- **Azure OpenAI Model**: Use gpt-4o for chat completions ⚠️ *Verify model availability and latest versions*
- **Vector Search Strategy**: Implement VectorDistance queries with fallback to keyword search
- **Data Structure**: Use structured Review objects instead of plain strings for better searchability
- **Region**: Deploy to East US 2 for optimal model availability ⚠️ *Check current model regional availability*
- **Authentication**: Use DefaultAzureCredential with proper tenant configuration
- **TypeScript Setup**: Ensure strict ESM configuration with proper module resolution

**🚨 CRITICAL ASYNC/AWAIT & API CONFIGURATION FIXES:**
📅 *Major fixes implemented June 2025 - ESSENTIAL for proper functionality*

1. **Azure OpenAI URL Configuration**:
   - **CRITICAL FIX**: Azure OpenAI client baseURL must include deployment path
   - **Correct Format**: `${endpoint}openai/deployments/${deploymentName}` 
   - **Wrong Format**: Just using `endpoint` directly causes 404 errors
   - **Implementation**: Configure in client creation, not in individual API calls

2. **API Version Compatibility**:
   - **CRITICAL**: Use API version `2024-06-01` for both LLM and embedding endpoints
   - **Outdated versions cause 404s**: `2024-04-01-preview`, `2023-05-15` are incompatible
   - **Validation Strategy**: Always test API endpoints with version auto-detection
   - **Environment Variables**: Update both `OPENAI_LLM_API_VERSION` and `OPENAI_EMBEDDING_API_VERSION`

3. **Model Validation Strategy**:
   - **Use Promise.allSettled()**: Don't block client creation on validation failures
   - **Graceful Degradation**: Log warnings but continue execution if models aren't accessible
   - **Timeout Handling**: Implement 10-second timeout for validation requests using Promise.race()
   - **Error Categorization**: Distinguish between network, authentication, and API version errors

4. **Client Creation Pattern**:
   - **Proper Async Initialization**: Never await async operations in constructors
   - **Two-Phase Pattern**: Create client object first, then call async `init()` method
   - **Resource Management**: Use `createIfNotExists` for databases and containers
   - **Error Handling**: Distinguish between client creation and resource preparation errors

5. **Diagnostic Infrastructure**:
   - **API Testing Script**: Create comprehensive API connectivity validator
   - **Version Detection**: Implement automatic API version compatibility testing
   - **Resource Validation**: Verify .env configuration against actual Azure resources
   - **Fix Suggestions**: Provide specific commands to resolve configuration issues

6. **Environment Variable Naming Consistency**:
   - **Problem**: Changed variable names causing config mismatches
   - **Example Fix**: `OPENAI_LLM_MODEL` was changed to `OPENAI_LLM_DEPLOYMENT_NAME`
   - **Solution**: Maintain consistent variable naming between config.ts and .env files
   - **Validation**: Always test that process.env variables match config object properties

**Async/Await Patterns**: Properly handle async initialization patterns, especially for client creation and MovieAI class initialization
**Mock Strategy**: Use proper async mock handling in tests, especially for createClients and other async functions  
**Test Execution Order**: Be aware of actual function execution order vs expected test behavior (e.g., createClients called before file operations in load-data)

---

**Step 1: Cosmos DB Resource Setup**
- Use Azure Developer CLI with Bicep to create the Cosmos DB account in East US 2 ⚠️ *Verify region availability for latest models*.
- **CRITICAL**: Use API version 2024-11-15 for vector indexing support ⚠️ *Check for newer API versions with enhanced vector capabilities*
- **Vector Configuration Required**: 
  - Set vectorEmbeddingPolicy with dimensions: 1536, dataType: "float32", distanceFunction: "cosine"
  - Configure vectorIndexes for the vectors field with type: "quantizedFlat" ⚠️ *Verify latest indexing options*
- Use subscription-level deployment (targetScope = 'subscription')
- Provide Bicep templates and Azure Developer CLI commands for deployment.
- Focus on making this step clear and beginner-friendly.
- **Authentication**: Ensure proper Azure tenant configuration for DefaultAzureCredential

**Step 2: Movie Data**
- Use a provided sample movie dataset (fields: title, description, genre, year, actors, reviews).
- **Data Structure Enhancement**: Convert reviews from strings to structured Review objects:
  ```typescript
  interface Review {
    reviewer: string;
    rating: number;
    review: string;
  }
  ```
- Provide a simple script to load the data into Cosmos DB with upsert functionality.
- Include at least 10 diverse movies for meaningful search results.

**Step 3: Vectorization with Azure OpenAI**
- **Model**: Use text-embedding-ada-002 (1536 dimensions) for embeddings ⚠️ *Check for newer embedding models with better performance*
- **Strategy**: Perform vectorization as a batch process after data is loaded
- **Vectorization Target**: Create combined text from all fields (title + description + genre + year + actors + reviews)
- **Vector Storage**: Store embeddings in a 'vectors' field on each document
- **Implementation**: Use Azure OpenAI client with proper authentication
- Provide clear, simple instructions and scripts for batch vectorization and updating Cosmos DB documents with vector embeddings.
- **Performance**: Process movies in batches to avoid rate limiting ⚠️ *Verify current rate limits*

**Step 4: Application Design**
- Build a minimal TypeScript ESM CLI application with a conversation loop.
- **TypeScript Configuration**: Use strict ESM with proper module resolution ⚠️ *Verify latest TypeScript best practices*
- **Dependencies**: @azure/cosmos, @azure/openai, dotenv for configuration ⚠️ *Check for package updates and security patches*
- No authentication required (local/demo use).
- The CLI should accept natural language questions and return answers about any field in the movie data.
- **Project Structure**: Separate concerns into config.ts, types.ts, index.ts
- **Environment Configuration**: Use .env file for connection strings and API keys

**🔧 ESSENTIAL ENVIRONMENT CONFIGURATION PATTERNS:**
📅 *Critical .env patterns from June 2025 fixes*

**⚠️ CRITICAL AZURE OPENAI SDK CONFIGURATION ISSUE:**
The most common configuration problem is with Azure OpenAI baseURL construction:

**❌ WRONG (Causes 404 errors):**
```typescript
// Using endpoint directly - this WON'T work
new OpenAI({
  baseURL: process.env.OPENAI_LLM_ENDPOINT, // ❌ Missing deployment path
  apiKey: process.env.OPENAI_LLM_KEY
});
```

**✅ CORRECT (Working configuration):**
```typescript
// Must append deployment path to endpoint
new OpenAI({
  baseURL: `${process.env.OPENAI_LLM_ENDPOINT}openai/deployments/${process.env.OPENAI_LLM_DEPLOYMENT_NAME}`,
  apiKey: process.env.OPENAI_LLM_KEY,
  defaultQuery: { 'api-version': process.env.OPENAI_LLM_API_VERSION },
  defaultHeaders: { 'api-key': process.env.OPENAI_LLM_KEY }
});
```

**Environment Variable Requirements:**
```bash
# Azure Resource Management
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=your-resource-group

# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-or-secondary-key  
COSMOS_DB_DATABASE_NAME=MovieDB
COSMOS_DB_CONTAINER_NAME=Movies

# Azure OpenAI Configuration (CRITICAL: Use 2024-06-01 or newer)
# ⚠️ ENDPOINT MUST NOT include '/openai/deployments/' path - SDK adds it
OPENAI_LLM_ENDPOINT=https://your-account.openai.azure.com/
OPENAI_LLM_KEY=your-openai-key
OPENAI_LLM_API_VERSION=2024-06-01
OPENAI_LLM_DEPLOYMENT_NAME=gpt-4o

# ⚠️ ENDPOINT MUST NOT include '/openai/deployments/' path - SDK adds it  
OPENAI_EMBEDDING_ENDPOINT=https://your-account.openai.azure.com/
OPENAI_EMBEDDING_KEY=your-openai-key
OPENAI_EMBEDDING_API_VERSION=2024-06-01
OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002
```

**🚨 CRITICAL BASEURL CONSTRUCTION RULES:**
1. **Environment Variable Format**: Store only the base endpoint (e.g., `https://account.openai.azure.com/`)
2. **SDK Construction**: Append `openai/deployments/{deploymentName}` in code
3. **Final URLs Should Look Like**: 
   - LLM: `https://account.openai.azure.com/openai/deployments/gpt-4o`
   - Embedding: `https://account.openai.azure.com/openai/deployments/text-embedding-ada-002`
4. **Common Error**: Setting endpoint to full deployment URL causes double-path issues

**⚠️ CRITICAL .env VALIDATION RULES:**
- Both LLM and embedding endpoints should use same OpenAI account (same keys)
- API versions must be 2024-06-01 or newer to avoid 404 errors
- Keys must match Azure-retrieved primary or secondary keys exactly
- Deployment names must match exactly (case-sensitive)
- Resource names extracted from endpoints must match Azure resources
- Endpoints should end with `/` for consistency

**🔍 ENVIRONMENT VARIABLE NAMING CHECKLIST:**
Ensure your config.ts uses these exact variable names:
```typescript
// ✅ Correct variable names (verified working)
process.env.COSMOS_DB_ENDPOINT
process.env.COSMOS_DB_KEY
process.env.COSMOS_DB_DATABASE_NAME
process.env.COSMOS_DB_CONTAINER_NAME
process.env.OPENAI_LLM_ENDPOINT
process.env.OPENAI_LLM_KEY
process.env.OPENAI_LLM_DEPLOYMENT_NAME  // NOT 'OPENAI_LLM_MODEL'
process.env.OPENAI_LLM_API_VERSION
process.env.OPENAI_EMBEDDING_ENDPOINT
process.env.OPENAI_EMBEDDING_KEY
process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME
process.env.OPENAI_EMBEDDING_API_VERSION
```

**🔧 QUICK TROUBLESHOOTING GUIDE FOR BASEURL ISSUES:**

**Symptom**: Getting 404 errors or "Resource not found" when calling Azure OpenAI
**Root Cause**: Incorrect baseURL construction in OpenAI client

**Step-by-Step Fix:**
1. **Check your .env file**:
   ```bash
   # ✅ Correct format (base endpoint only)
   OPENAI_LLM_ENDPOINT=https://your-account.openai.azure.com/
   OPENAI_LLM_DEPLOYMENT_NAME=gpt-4o
   
   # ❌ Wrong format (includes deployment path)
   OPENAI_LLM_ENDPOINT=https://your-account.openai.azure.com/openai/deployments/gpt-4o
   ```

2. **Verify your client construction code**:
   ```typescript
   // ✅ Correct implementation
   const llm = new OpenAI({
     baseURL: `${config.openai.llm.endpoint}openai/deployments/${config.openai.llm.deploymentName}`,
     apiKey: config.openai.llm.key,
     defaultQuery: { 'api-version': config.openai.llm.apiVersion },
     defaultHeaders: { 'api-key': config.openai.llm.key }
   });
   ```

3. **Test with curl to verify endpoint**:
   ```bash
   curl -H "api-key: YOUR_KEY" \
        "https://your-account.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01"
   ```

**Quick Fix Command**: If you have working Azure resources but failing tests, update your test mock expectations:
- Expected baseURL: `https://test-llm.openai.azure.com/openai/deployments/test-gpt-4o`
- Not: `https://test-llm.openai.azure.com/`

**Step 5: NLP Question Answering**
- **Model**: Use gpt-4o for chat completions ⚠️ *Verify latest GPT model availability and capabilities*
- **Search Strategy**: Implement vector search with fallback mechanisms:
  1. VectorDistance query with cosine similarity
  2. Fallback to keyword search if vector search fails
  3. Graceful error handling for search failures
- Support both direct (single movie) and summarized (multiple movies) answers.
- **Context Injection**: Pass search results to GPT for contextual responses
- Output answers in plain text.
- **Performance**: Typical semantic search accuracy ~82% for relevant queries ⚠️ *Performance may vary with model updates*

---

**Key Technical Specifications:**
📅 *Information captured as of June 2025 - verify for latest versions*

- **Azure OpenAI Models**: 
  - Embeddings: text-embedding-ada-002 (1536 dimensions) ⚠️ *Check for newer embedding models*
  - Chat: gpt-4o ⚠️ *Verify latest available models*
- **Cosmos DB Configuration**:
  - API Version: 2024-11-15 ⚠️ *Check for newer API versions*
  - Vector Policy: cosine distance, float32, 1536 dimensions
  - Index Type: quantizedFlat ⚠️ *Verify latest indexing options*
- **TypeScript Setup**:
  - ESM modules with "type": "module"
  - Strict compilation settings
  - Proper @types packages ⚠️ *Check for package updates*

**Common Pitfalls & Solutions:**
📅 *Based on implementation experience as of June 2025*

1. **🚨 MOST COMMON: Azure OpenAI BaseURL Configuration** 
   - **Problem**: 404 errors, "Resource not found", deployment not accessible
   - **Cause**: Incorrect baseURL construction - using endpoint directly instead of appending deployment path
   - **Solution**: Always construct baseURL as `${endpoint}openai/deployments/${deploymentName}`
   - **Test Fix**: Update test expectations to include full deployment paths in baseURL assertions

2. **API Version Mismatch**:
   - **Problem**: 404 errors on API calls
   - **Cause**: Using outdated API versions (2024-04-01-preview, 2023-05-15)
   - **Solution**: Use 2024-06-01 or newer for all Azure OpenAI endpoints

3. **Test Expectation Mismatches**:
   - **Problem**: Unit tests failing with baseURL or API version mismatches
   - **Cause**: Test mocks expecting old URL patterns or API versions
   - **Solution**: Update test expectations to match current implementation patterns

4. **Vector Search Failures**: Always implement fallback to keyword search
5. **Authentication Issues**: Ensure correct Azure tenant configuration
6. **API Compatibility**: Use latest Cosmos DB API version for vector support ⚠️ *API versions evolve frequently*
7. **Rate Limiting**: Batch process embeddings to avoid OpenAI rate limits ⚠️ *Rate limits may change*
8. **Type Safety**: Use proper TypeScript interfaces for all data structures
6. **Model Deprecation**: ⚠️ *Monitor Azure OpenAI service announcements for model lifecycle changes*
7. **Regional Availability**: ⚠️ *Model availability varies by region and changes over time*
8. **Async Mock Testing**: Properly handle async function mocking, especially for createClients() - use vi.mock() with explicit function definitions
9. **Test Execution Order**: Understand actual function execution flow vs expected test behavior - createClients often called before file operations
10. **MovieAI Initialization**: Implement async init() pattern for proper client setup and database creation using createIfNotExists
11. **Environment Variables**: Ensure comprehensive environment variable validation across all test files - include all COSMOS_DB_*, OPENAI_*, OPENAI_LLM_*, and OPENAI_EMBEDDING_* variables
12. **Mock Configuration**: Use separate LLM and embedding client configurations to match real implementation structure

**Testing & Validation:**
📅 *Testing requirements as of June 2025*

- **Testing Framework**: Use Vitest for unit and integration testing ⚠️ *Verify latest Vitest version*
- **Coverage Requirements**: Minimum 80% code coverage across all modules
- **Test Categories**:
  1. **Unit Tests**: Individual functions and classes
  2. **Integration Tests**: Azure service connectivity and data flow
  3. **E2E Tests**: Complete conversation workflow
- **Test Modules Required**:
  - Configuration validation (config.ts) - comprehensive environment variable testing
  - Type definitions and interfaces (types.ts) - including optional vector properties
  - Cosmos DB operations (search, query, data loading) - with createIfNotExists patterns  
  - OpenAI integration (embeddings, chat completions) - proper async mocking
  - Vector search functionality with fallbacks
  - CLI conversation loop
  - Load data utility (load-data.ts) - comprehensive unit tests for file operations and error handling
- **Mock Strategy**: Mock Azure services for unit tests, use test data for integration
- **Coverage Reports**: Generate HTML and terminal coverage reports
- **Performance Testing**: Validate response times for vector search and AI responses
- **Error Handling Tests**: Test fallback mechanisms and error scenarios
- **Scripts**: Include npm scripts for running tests, coverage, and CI/CD integration ⚠️ *Update package.json test scripts*

**Detailed Testing Stack & Implementation:**
📅 *Comprehensive testing implementation guide as of June 2025*

**Core Testing Dependencies**:
```json
{
  "devDependencies": {
    "vitest": "^3.2.3",
    "@vitest/coverage-v8": "^3.2.3",
    "@vitest/ui": "^3.2.3"
  }
}
```

**Test Configuration Requirements**:
- **Vitest Config**: Configure with ESM support, coverage thresholds, and test patterns
- **Coverage Thresholds**: 
  - Statements: 80%
  - Branches: 80%
  - Functions: 80%
  - Lines: 80%
- **Test Environment**: Node.js with proper ESM module resolution
- **Mock Infrastructure**: Comprehensive Azure SDK and OpenAI mocking

**Test Structure Requirements**:
```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── config.test.ts      # Environment and configuration testing
│   ├── types.test.ts       # TypeScript interface validation
│   ├── movie-ai.test.ts    # Core MovieAI class functionality
│   └── load-data.test.ts   # Load data utility comprehensive testing
├── integration/             # Azure service integration tests
│   └── azure-services.test.ts
├── e2e/                     # End-to-end workflow tests
│   └── application.test.ts
├── __mocks__/              # Mock implementations
│   └── azure-services.ts   # Azure & OpenAI service mocks
└── test-utils.ts           # Test helper utilities
```

**Required Test Scripts**:
```json
{
  "scripts": {
    "test": "vitest run --exclude='**/node_modules/**'",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "vitest run tests/e2e/",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Unit Testing Specifications**:
1. **Configuration Tests**:
   - Environment variable loading and validation
   - Default value handling
   - Error cases for missing required variables
   - Type safety validation

2. **Type Interface Tests**:
   - Movie interface validation
   - Review interface validation
   - Embedding structure validation
   - Data transformation accuracy

3. **MovieAI Class Tests**:
   - Constructor initialization
   - Vector search functionality with realistic embeddings
   - Keyword search fallback mechanisms
   - Cosine similarity calculations (including edge cases)
   - Question answering with GPT integration
   - Error handling for network failures
   - API response validation
   - Performance benchmarks

**Integration Testing Specifications**:
1. **Azure Cosmos DB Integration**:
   - Connection establishment using createIfNotExists for databases and containers
   - Query execution with vector search
   - Data retrieval and validation
   - Error handling for service unavailability
   - Proper environment variable configuration and validation

2. **Azure OpenAI Integration**:
   - Embedding generation
   - Chat completion requests
   - Rate limiting handling
   - API error scenarios

3. **End-to-End Data Flow**:
   - Complete search → embedding → query → response workflow
   - Performance validation (response times < 5 seconds)
   - Data consistency verification

**E2E Testing Specifications**:
1. **Application Startup**:
   - CLI initialization without errors
   - Configuration loading validation
   - Service connectivity verification

2. **Conversation Loop**:
   - Natural language question processing
   - Vector search execution
   - GPT response generation
   - Error graceful handling

3. **Utility Scripts**:
   - Configuration test script execution
   - Integration test validation
   - Performance benchmarking

**Mock Implementation Requirements**:
1. **Azure Cosmos DB Mocks**:
   - Realistic container and query mocking
   - Proper response structure simulation
   - Error scenario simulation
   - Vector search result mocking

2. **OpenAI Service Mocks**:
   - Embedding API response simulation
   - Chat completion response mocking
   - Rate limiting simulation
   - Error response handling

3. **Test Data Management**:
   - Representative movie data with embeddings
   - Configurable mock scenarios
   - Consistent test data generation
   - Reset capabilities for test isolation

**Performance & Error Testing**:
1. **Performance Benchmarks**:
   - Vector search response time < 2 seconds
   - Embedding generation < 3 seconds
   - Chat completion < 5 seconds
   - Memory usage monitoring

2. **Error Scenario Testing**:
   - Network connectivity failures
   - API rate limiting
   - Invalid API responses
   - Malformed data handling
   - Service unavailability

**Coverage Requirements & Validation**:
- **Core Application Logic**: Minimum 80% coverage
- **Configuration Module**: 100% coverage recommended
- **Error Handling Paths**: Comprehensive coverage
- **Mock Implementation**: Adequate coverage for reliability
- **Coverage Reports**: HTML and LCOV formats for CI/CD integration

**CI/CD Integration Specifications**:
- **Test Execution**: All tests must pass before deployment
- **Coverage Validation**: Enforce 80% threshold in pipeline
- **Performance Gates**: Response time validation
- **Security Scanning**: Dependency vulnerability checks
- **Documentation**: Automated test result reporting

**Testing Implementation Process:**
📅 *Step-by-step testing implementation workflow as of June 2025*

**Phase 1: Test Infrastructure Setup**
1. **Install Testing Dependencies**:
   ```bash
   npm install --save-dev vitest @vitest/coverage-v8 @vitest/ui
   ```
2. **Configure Vitest**:
   - Create `vitest.config.ts` with ESM support
   - Set coverage thresholds and providers
   - Configure test patterns and exclusions
3. **Setup Test Directory Structure**:
   - Create `tests/` directory with proper subdirectories
   - Implement base mock infrastructure
   - Create test utility functions

**Phase 2: Unit Test Implementation**
1. **Configuration Module Tests** (`tests/unit/config.test.ts`):
   - Test environment variable loading
   - Validate configuration object structure
   - Test error handling for missing variables
   - Verify type safety and defaults

2. **Type Definition Tests** (`tests/unit/types.test.ts`):
   - Validate Movie interface compliance
   - Test Review interface structure
   - Verify embedding type definitions
   - Test data transformation functions

3. **Core Functionality Tests** (`tests/unit/movie-ai.test.ts`):
   - Test MovieAI class initialization with async init() pattern
   - Mock Azure SDK dependencies properly with separate LLM and embedding configurations
   - Test vector search with realistic data
   - Validate cosine similarity calculations
   - Test fallback mechanisms
   - Verify error handling scenarios
   - Ensure proper async/await handling for all operations

4. **Load Data Utility Tests** (`tests/unit/load-data.test.ts`):
   - Test successful data loading from JSON files
   - Test file reading error scenarios (createClients called before file operations)
   - Test JSON parsing error handling
   - Test createClients failure scenarios
   - Test upsert operation failures (both individual and partial batch failures)
   - Test empty data handling
   - Test malformed data processing
   - Test large dataset processing
   - Comprehensive async mock handling for createClients function

**Phase 3: Integration Test Development**
1. **Azure Services Integration** (`tests/integration/azure-services.test.ts`):
   - Test actual Azure Cosmos DB connectivity
   - Validate OpenAI API integration
   - Test end-to-end data flow
   - Performance validation with realistic datasets
   - Rate limiting and error handling

**Phase 4: End-to-End Test Creation**
1. **Application Workflow Tests** (`tests/e2e/application.test.ts`):
   - Test complete CLI application startup
   - Validate conversation loop functionality
   - Test natural language question processing
   - Verify response generation and formatting
   - Test graceful error handling

**Phase 5: Mock Infrastructure**
1. **Azure Service Mocks** (`tests/__mocks__/azure-services.ts`):
   - Create comprehensive Cosmos DB container mocks with createIfNotExists support
   - Implement OpenAI API response mocking with separate LLM and embedding configurations
   - Setup configurable test scenarios
   - Implement proper mock reset functionality
   - Handle async function mocking correctly

2. **Test Utilities** (`tests/test-utils.ts`):
   - Create test data generation functions
   - Implement validation helpers
   - Setup performance testing utilities
   - Create environment validation helpers

**Phase 6: Coverage & Performance Validation**
1. **Coverage Analysis**:
   - Run coverage reports and validate 80%+ threshold
   - Identify uncovered code paths
   - Implement additional tests for edge cases
   - Generate HTML coverage reports

2. **Performance Benchmarking**:
   - Validate response time requirements
   - Test memory usage patterns
   - Verify concurrency handling
   - Test with realistic data volumes

**Phase 7: CI/CD Integration**
1. **Test Script Configuration**:
   - Setup npm scripts for different test categories
   - Configure watch mode for development
   - Setup coverage reporting for CI/CD
   - Implement test result formatting

2. **Pipeline Integration**:
   - Configure test execution in deployment pipeline
   - Setup coverage threshold enforcement
   - Implement performance gate validation
   - Configure automated test reporting

**Testing Best Practices & Guidelines**:
- **Test Isolation**: Each test should be independent and repeatable
- **Mock Strategy**: Mock external dependencies, test internal logic
- **Data Management**: Use consistent test data across test suites
- **Error Testing**: Test both success and failure scenarios
- **Performance**: Include realistic performance benchmarks
- **Documentation**: Document test purpose and expected outcomes
- **Maintenance**: Regularly update tests with code changes

**Critical Testing Implementation Lessons Learned:**
📅 *Key insights from testing implementation as of June 2025*

1. **Async Function Mocking**:
   - Use `vi.mock()` with explicit function definitions for async functions like `createClients`
   - Import and type the mock properly: `const mockCreateClients = vi.mocked(createClients)`
   - Reset mocks using `mockClear()` rather than complex import patterns

2. **MovieAI Class Testing**:
   - Implement async `init()` pattern for proper client initialization
   - Mock configuration with nested objects for LLM and embedding clients
   - Handle database and container creation using `createIfNotExists` pattern
   - Don't await `init()` in constructor - call it separately in tests

3. **Load Data Function Testing**:
   - Understand execution order: `createClients()` is called BEFORE file operations
   - Adjust test expectations accordingly - `createClients` may be called even if file reading fails
   - Use `mockRejectedValueOnce()` for individual test overrides
   - Test both success and failure scenarios comprehensively

4. **Configuration Testing**:
   - Test all environment variables comprehensively (16+ variables)
   - Include COSMOS_DB_*, OPENAI_*, OPENAI_LLM_*, OPENAI_EMBEDDING_* variables
   - Test both missing and invalid configuration scenarios
   - Validate nested configuration structure

5. **Type Interface Testing**:
   - Test all required and optional properties (16+ tests for Movie interface)
   - Include vector properties: titleVector, descriptionVector, genreVector, etc.
   - Test edge cases like undefined and null values
   - Validate data transformation accuracy

6. **Integration Testing Patterns**:
   - Use environment variable validation to skip tests when credentials unavailable
   - Test database and container creation with `createIfNotExists`
   - Handle Azure service connectivity gracefully
   - Validate actual service responses vs mocked responses

7. **Mock Configuration Complexity**:
   - Separate LLM and embedding client configurations in mocks
   - Include all required properties (endpoint, key, deploymentName, apiVersion)
   - Match real implementation structure exactly
   - Use proper TypeScript typing with `as any` for complex mocks

8. **Common Test Infrastructure Issues**:
   - **Console Spy Restoration**: Use `vi.restoreAllMocks()` instead of individual `.restore()` calls
   - **API Version Expectations**: Update test expectations when .env API versions change
   - **Mock Import Patterns**: Import mocked functions after `vi.mock()` declarations
   - **Environment Variable Testing**: Reset process.env properly between tests

9. **Production Validation Patterns**:
   - Create comprehensive resource validation scripts (like `scripts/resources.sh`)
   - Implement API connectivity testing with automatic version detection
   - Build troubleshooting infrastructure with specific fix suggestions
   - Include performance benchmarking for API response times

**🔧 ESSENTIAL DIAGNOSTIC SCRIPT PATTERNS:**
📅 *Diagnostic infrastructure patterns from June 2025 implementation*

1. **API Connectivity Validator**:
   ```bash
   # Test API endpoints with version auto-detection
   test_api_connectivity() {
     # Test multiple API versions automatically
     # Provide specific fix commands for failures
     # Return actionable error messages
   }
   ```

2. **Configuration Validator**:
   ```bash
   # Validate .env against actual Azure resources
   validate_configuration() {
     # Compare keys with Azure-retrieved values
     # Verify resource existence
     # Suggest specific configuration fixes
   }
   ```

3. **Resource Troubleshooter**:
   ```bash
   # Comprehensive Azure resource listing and validation
   # Exit codes for CI/CD integration
   # Structured output for automation
   ```

**📋 TROUBLESHOOTING SCRIPT TEMPLATE:**
*Essential diagnostic script format based on successful implementations*

```bash
#!/bin/bash
# Azure Resource Configuration Validator & Troubleshooter
# Must include these core functions:

validate_configuration() {
    # 1. Validate Azure subscription and resource group
    # 2. Validate CosmosDB account, database, container existence  
    # 3. Validate OpenAI account and deployments
    # 4. Compare .env keys with Azure-retrieved keys
    # 5. Check API version compatibility
    # Return: Issue count and specific fix commands
}

test_api_connectivity() {
    # 1. Test OpenAI Embedding API with current version
    # 2. Test OpenAI Chat Completion API with current version  
    # 3. Test CosmosDB connectivity
    # 4. Auto-detect working API versions on 404 errors
    # 5. Provide specific UPDATE commands for .env fixes
    # Return: Connectivity status and fix suggestions
}

# Command-line interface with options:
# --validate: Configuration validation only
# --test-api: API connectivity testing only  
# --all: Comprehensive resource listing
# --cosmos: CosmosDB-specific information
# --openai: OpenAI-specific information

# Exit codes for CI/CD integration:
# 0: All checks passed
# >0: Number of issues found
```

**🔍 VALIDATION OUTPUT FORMAT:**
*Standardized format for diagnostic feedback*

```
✅ Success indicators with specific confirmations
❌ Error indicators with exact problem descriptions  
⚠️  Warning indicators for non-blocking issues
🔧 RECOMMENDED ACTIONS: Numbered list of specific fixes
📝 Quick Fix Commands: Copy-paste terminal commands
📋 SUMMARY: Total issues found with exit code
```

---

**Instructions for the AI:**
⚠️ **IMPORTANT**: Before implementation, verify all version-specific information marked with warning symbols above.

🚨 **MANDATORY PRE-IMPLEMENTATION CHECKLIST:**
1. **API Version Verification**: Test actual Azure OpenAI API versions before hardcoding
2. **URL Format Validation**: Ensure baseURL includes deployment path for Azure OpenAI
3. **Resource Validation Script**: Always include diagnostic infrastructure for troubleshooting
4. **Test Coverage Requirements**: Minimum 80% test coverage with proper async/await patterns
5. **Error Handling Strategy**: Implement graceful degradation, not strict failure blocking

- For each step, generate only the necessary code, scripts, and instructions.
- Focus on simplicity and clarity—avoid error handling, parameter validation, or production-level code.
- **ALWAYS** use the specified API versions and model names from the technical specifications above, but verify they are still current.
- **Version Verification**: Check Azure documentation for the latest API versions, model availability, and regional support before proceeding.
- **🔧 DIAGNOSTIC FIRST**: Always provide validation and troubleshooting scripts alongside implementation
- Explain how to deploy the Cosmos DB resource using Azure Developer CLI and Bicep with proper vector configuration.
- Provide a sample movie dataset with structured Review objects and a script to load it.
- Explain and script the batch vectorization process using Azure OpenAI, including how to update Cosmos DB documents with vector embeddings.
- Scaffold the minimal TypeScript ESM CLI application, including Cosmos DB and Azure OpenAI integration.
- Implement a simple conversation loop that accepts NLP questions and returns plain text answers using semantic search and GPT with fallback strategies.
- **Testing Implementation**: Create comprehensive test suite using Vitest with 80%+ coverage, including unit, integration, and E2E tests.
- **🚨 CRITICAL**: Include API connectivity validation and resource troubleshooting infrastructure
- Include utility scripts for testing and validation.
- **Dependency Management**: Always check for the latest package versions and security updates.
- Ask clarifying questions if any requirements are unclear or if additional information is needed.
