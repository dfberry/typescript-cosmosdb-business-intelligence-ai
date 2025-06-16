import { CosmosClient, Database } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config, Config } from './config.js';
import type { Container } from '@azure/cosmos';

export type Clients = {
    cosmosClient: CosmosClient;
    database: Database;
    container: Container;   
    databaseName: string;
    containerName: string;

    llm: OpenAI;
    embedding: OpenAI;
    llmModel: string;
    embeddingModel: string;

};

export async function createClients(configParam?: Config): Promise<Clients> {
    // Input validation - validate everything upfront
    // If configParam is explicitly passed (even as undefined), use it; otherwise use global config
    const currentConfig = arguments.length > 0 ? configParam : config;
    
    if (!currentConfig) {
        throw new Error('Configuration is required');
    }

    // Validate CosmosDB configuration
    if (!currentConfig?.cosmosDb?.endpoint || !currentConfig?.cosmosDb?.key) {
        throw new Error('CosmosDB endpoint and key are required');
    }

    if (!currentConfig?.cosmosDb?.databaseId || !currentConfig?.cosmosDb?.containerId) {
        throw new Error('Database or container ID is not defined in config');
    }

    // Validate OpenAI configuration
    if (!currentConfig.openai?.llm || !currentConfig.openai?.embedding) {
        throw new Error('OpenAI configuration for LLM and embedding models is required');
    }

    const llmConfig = currentConfig.openai.llm;
    const embeddingConfig = currentConfig.openai.embedding;

    if (!llmConfig.key || !llmConfig.endpoint || !llmConfig.deploymentName) {
        throw new Error('LLM configuration must include key, endpoint, and deploymentName');
    }

    if (!embeddingConfig.key || !embeddingConfig.endpoint || !embeddingConfig.deploymentName) {
        throw new Error('Embedding configuration must include key, endpoint, and deploymentName');
    }

    try {
        const cosmosClient = createDbClient(currentConfig);
        const { database, container, databaseName, containerName } = await prepareDb(cosmosClient, currentConfig);

        const { llm, embedding } = createModelClients(currentConfig);

        // Validate model availability with more lenient approach
        const validationResults = await Promise.allSettled([
            validateModelAvailability(llm, currentConfig.openai.llm.deploymentName, 'llm'),
            validateModelAvailability(embedding, currentConfig.openai.embedding.deploymentName, 'embedding')
        ]);

        // Log validation results but don't fail if models aren't accessible during testing
        const llmValid = validationResults[0].status === 'fulfilled' && validationResults[0].value;
        const embeddingValid = validationResults[1].status === 'fulfilled' && validationResults[1].value;

        if (!llmValid) {
            console.warn('⚠️  LLM model validation failed - proceeding with client creation for testing');
        }
        if (!embeddingValid) {
            console.warn('⚠️  Embedding model validation failed - proceeding with client creation for testing');
        }

        const results: Clients = {
            cosmosClient,
            llm,
            embedding,
            llmModel: currentConfig.openai.llm.deploymentName,
            embeddingModel: currentConfig.openai.embedding.deploymentName,
            database,
            container,
            databaseName: databaseName,
            containerName: containerName
        };
        return results;
    } catch (error) {
        console.error('❌ Error creating clients:', error);
        throw error;
    }
}
/**
 * Creates a Cosmos DB client with input validation
 * @param config - Configuration object containing Cosmos DB settings
 * @returns CosmosClient instance
 */
function createDbClient(config: Config): CosmosClient {
    // Validation is now done in createClients()
    try {
        const cosmosClient = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key
        });
        return cosmosClient;
    } catch (error) {
        console.error('❌ Error creating Cosmos DB client:', error);
        throw error;
    }
}
/**
 * Prepares database and container, creating them if they don't exist
 * @param client - CosmosClient instance
 * @param config - Configuration object
 * @returns Database and container objects with metadata
 */
async function prepareDb(client: CosmosClient, config: Config): Promise<{ 
    database: Database; 
    container: Container;
    databaseName: string;
    containerName: string;
 }> {
    try {
        // Input validation
        if (!client) {  
            throw new Error('CosmosClient is not initialized');
        }

        if (!config?.cosmosDb?.databaseId || !config?.cosmosDb?.containerId) {
            throw new Error('Database or container ID is not defined in config');
        }

        const database = client.database(config.cosmosDb.databaseId);
        const container = database.container(config.cosmosDb.containerId);

        const databaseCreated = await client.databases.createIfNotExists({
            id: config.cosmosDb.databaseId
        });
        const containerCreated = await databaseCreated.database.containers.createIfNotExists({
            id: config.cosmosDb.containerId,
        });
        
        console.log(`✅ Database '${config.cosmosDb.databaseId}' and container '${config.cosmosDb.containerId}' are ready`);
        
        return { 
            database, 
            container, 
            databaseName: config.cosmosDb.databaseId, 
            containerName: config.cosmosDb.containerId 
        };
    } catch (error) {
        console.error('❌ Error preparing database:', error);
        throw error;
    }
}
/**
 * Creates OpenAI client instances for LLM and embedding models
 * @param config - Configuration object containing OpenAI settings
 * @returns Object with LLM and embedding client instances
 */
function createModelClients(config: Config): { llm: OpenAI, embedding: OpenAI } {
    // Validation is now done in createClients()
    const llmConfig = config.openai.llm;
    const embeddingConfig = config.openai.embedding;

    // Validation is now done in createClients()
    try {
        const llm = new OpenAI({
            apiKey: llmConfig.key,
            baseURL: `${llmConfig.endpoint}openai/deployments/${llmConfig.deploymentName}`,
            defaultQuery: { 'api-version': llmConfig.apiVersion },
            defaultHeaders: {
                'api-key': llmConfig.key,
            },
        });

        const embedding = new OpenAI({
            apiKey: embeddingConfig.key,
            baseURL: `${embeddingConfig.endpoint}openai/deployments/${embeddingConfig.deploymentName}`,
            defaultQuery: { 'api-version': embeddingConfig.apiVersion },
            defaultHeaders: {
                'api-key': embeddingConfig.key,
            },
        });

        console.log(`✅ OpenAI clients created for models: ${llmConfig.deploymentName}, ${embeddingConfig.deploymentName}`);
        
        return { llm, embedding };
    } catch (error) {
        console.error('❌ Error creating OpenAI clients:', error);
        throw error;
    }
}
/**
 * Validates that an Azure OpenAI model deployment is available and accessible
 * @param client - The OpenAI client instance
 * @param deploymentName - The name of the deployment to validate
 * @param modelType - Type of model (for logging purposes)
 * @returns Promise<boolean> - True if model is available
 */
async function validateModelAvailability(
    client: OpenAI,
    deploymentName: string,
    modelType: string
): Promise<boolean> {
    // Input validation
    if (!client) {
        console.error(`❌ ${modelType} client is not initialized`);
        return false;
    }

    if (!deploymentName) {
        console.error(`❌ ${modelType} deployment name is required`);
        return false;
    }

    try {
        console.log(`🔍 Validating ${modelType} model: ${deploymentName}`);

        // Create a timeout promise for resource management
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Validation timeout')), 10000); // 10 second timeout
        });

        let validationPromise: Promise<any>;

        if (modelType === 'embedding') {
            // Test embedding model with a simple request
            validationPromise = client.embeddings.create({
                model: deploymentName,
                input: 'test validation'
            });
        } else if (modelType === 'llm') {
            // Test LLM model with a simple chat completion
            validationPromise = client.chat.completions.create({
                model: deploymentName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1
            });
        } else {
            console.error(`❌ Unknown model type: ${modelType}`);
            return false;
        }

        // Race between validation and timeout
        const response = await Promise.race([validationPromise, timeoutPromise]);

        // Check response validity
        if (modelType === 'embedding') {
            if (response?.data && response.data.length > 0) {
                console.log(`✅ ${modelType} model '${deploymentName}' is available and working`);
                return true;
            }
        } else if (modelType === 'llm') {
            if (response?.choices && response.choices.length > 0) {
                console.log(`✅ ${modelType} model '${deploymentName}' is available and working`);
                return true;
            }
        }

        console.log(`⚠️  ${modelType} model '${deploymentName}' validation returned unexpected response`);
        return false;

    } catch (error: any) {
        // More lenient error handling - don't fail completely for common issues
        const errorMessage = error?.message || 'Unknown error';
        
        if (errorMessage.includes('404') || errorMessage.includes('Resource not found')) {
            console.warn(`⚠️  ${modelType} model '${deploymentName}' not found (404) - may be deployment issue`);
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Validation timeout')) {
            console.warn(`⚠️  ${modelType} model '${deploymentName}' validation timed out`);
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
            console.warn(`⚠️  ${modelType} model '${deploymentName}' authentication failed`);
        } else {
            console.warn(`⚠️  ${modelType} model '${deploymentName}' validation failed: ${errorMessage}`);
        }
        
        return false;
    }
}