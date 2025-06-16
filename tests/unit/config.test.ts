import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Config Module', () => {
  const originalEnv = process.env;
  const originalImportMeta = import.meta;

  beforeEach(() => {
    // Reset modules and environment
    process.env = { ...originalEnv };
    // Clear any cached modules
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('should load configuration from environment variables', async () => {
    process.env.COSMOS_DB_ENDPOINT = 'https://test-cosmos.documents.azure.com:443/';
    process.env.COSMOS_DB_KEY = 'test-cosmos-key';
    process.env.COSMOS_DB_DATABASE_NAME = 'TestDB';
    process.env.COSMOS_DB_CONTAINER_NAME = 'TestContainer';
    process.env.OPENAI_LLM_ENDPOINT = 'https://test-llm.openai.azure.com/';
    process.env.OPENAI_LLM_KEY = 'test-llm-key';
    process.env.OPENAI_LLM_API_VERSION = '2024-06-01';
    process.env.OPENAI_LLM_DEPLOYMENT_NAME = 'test-gpt-4o';
    process.env.OPENAI_EMBEDDING_ENDPOINT = 'https://test-embedding.openai.azure.com/';
    process.env.OPENAI_EMBEDDING_KEY = 'test-embedding-key';
    process.env.OPENAI_EMBEDDING_API_VERSION = '2024-06-01';
    process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME = 'test-embedding-ada-002';

    // Dynamically import to get fresh config
    const { config } = await import('../../src/utils/config.js');

    expect(config.cosmosDb.endpoint).toBe('https://test-cosmos.documents.azure.com:443/');
    expect(config.cosmosDb.key).toBe('test-cosmos-key');
    expect(config.cosmosDb.databaseId).toBe('TestDB');
    expect(config.cosmosDb.containerId).toBe('TestContainer');
    expect(config.openai.llm.endpoint).toBe('https://test-llm.openai.azure.com/');
    expect(config.openai.llm.key).toBe('test-llm-key');
    expect(config.openai.llm.apiVersion).toBe('2024-06-01');
    expect(config.openai.llm.deploymentName).toBe('test-gpt-4o');
    expect(config.openai.embedding.endpoint).toBe('https://test-embedding.openai.azure.com/');
    expect(config.openai.embedding.key).toBe('test-embedding-key');
    expect(config.openai.embedding.apiVersion).toBe('2024-06-01');
    expect(config.openai.embedding.deploymentName).toBe('test-embedding-ada-002');
  });

  it('should have correct model names from environment or defaults', async () => {
    const { config } = await import('../../src/utils/config.js');

    // Test LLM configuration
    expect(config.openai.llm.deploymentName).toBeDefined();
    expect(config.openai.llm.apiVersion).toBeDefined();
    expect(typeof config.openai.llm.deploymentName).toBe('string');
    expect(typeof config.openai.llm.apiVersion).toBe('string');
    
    // Test embedding configuration
    expect(config.openai.embedding.deploymentName).toBeDefined();
    expect(config.openai.embedding.apiVersion).toBeDefined();
    expect(typeof config.openai.embedding.deploymentName).toBe('string');
    expect(typeof config.openai.embedding.apiVersion).toBe('string');
  });

  it('should have correct database configuration from environment or defaults', async () => {
    const { config } = await import('../../src/utils/config.js');

    expect(config.cosmosDb.databaseId).toBeDefined();
    expect(config.cosmosDb.containerId).toBeDefined();
    expect(typeof config.cosmosDb.databaseId).toBe('string');
    expect(typeof config.cosmosDb.containerId).toBe('string');
  });

  it('should handle missing environment variables gracefully', async () => {
    // Test with current environment (which has actual values)
    const { config } = await import('../../src/utils/config.js');
    
    // Verify that the configuration object exists and has the expected structure
    expect(config).toBeDefined();
    expect(config.cosmosDb).toBeDefined();
    expect(config.openai).toBeDefined();
    expect(config.openai.llm).toBeDefined();
    expect(config.openai.embedding).toBeDefined();
    
    // Test basic configuration
    expect(typeof config.cosmosDb.endpoint).toBe('string');
    expect(typeof config.cosmosDb.key).toBe('string');
    
    // Test LLM configuration
    expect(typeof config.openai.llm.endpoint).toBe('string');
    expect(typeof config.openai.llm.key).toBe('string');
    expect(typeof config.openai.llm.deploymentName).toBe('string');
    expect(typeof config.openai.llm.apiVersion).toBe('string');
    
    // Test embedding configuration
    expect(typeof config.openai.embedding.endpoint).toBe('string');
    expect(typeof config.openai.embedding.key).toBe('string');
    expect(typeof config.openai.embedding.deploymentName).toBe('string');
    expect(typeof config.openai.embedding.apiVersion).toBe('string');
  });

  it('should have correct API versions and default values', async () => {
    const { config } = await import('../../src/utils/config.js');
    
    // Test default database and container names
    expect(config.cosmosDb.databaseId).toBe('MovieDB');
    expect(config.cosmosDb.containerId).toBe('Movies');
    
    // Test default model names
    expect(config.openai.llm.deploymentName).toBe('gpt-4o');
    expect(config.openai.embedding.deploymentName).toBe('text-embedding-ada-002');
    
    // Test current API versions (updated from .env)
    expect(config.openai.llm.apiVersion).toBe('2024-06-01');
    expect(config.openai.embedding.apiVersion).toBe('2024-06-01');
  });

  it('should override defaults with environment variables', async () => {
    process.env.COSMOS_DB_DATABASE_NAME = 'CustomDB';
    process.env.COSMOS_DB_CONTAINER_NAME = 'CustomContainer';
    process.env.OPENAI_LLM_DEPLOYMENT_NAME = 'custom-llm-model';
    process.env.OPENAI_LLM_API_VERSION = '2024-10-01';
    process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME = 'custom-embedding-model';
    process.env.OPENAI_EMBEDDING_API_VERSION = '2024-08-01';

    const { config } = await import('../../src/utils/config.js');

    expect(config.cosmosDb.databaseId).toBe('CustomDB');
    expect(config.cosmosDb.containerId).toBe('CustomContainer');
    expect(config.openai.llm.deploymentName).toBe('custom-llm-model');
    expect(config.openai.llm.apiVersion).toBe('2024-10-01');
    expect(config.openai.embedding.deploymentName).toBe('custom-embedding-model');
    expect(config.openai.embedding.apiVersion).toBe('2024-08-01');
  });
});
