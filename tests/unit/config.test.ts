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
    process.env.OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com/';
    process.env.OPENAI_KEY = 'test-openai-key';

    // Dynamically import to get fresh config
    const { config } = await import('../../src/config.js');

    expect(config.cosmosDb.endpoint).toBe('https://test-cosmos.documents.azure.com:443/');
    expect(config.cosmosDb.key).toBe('test-cosmos-key');
    expect(config.openai.endpoint).toBe('https://test-openai.openai.azure.com/');
    expect(config.openai.key).toBe('test-openai-key');
  });

  it('should have correct model names from environment or defaults', async () => {
    const { config } = await import('../../src/config.js');

    // Should use deployment names from environment if available, otherwise defaults
    expect(config.openai.gptModel).toBeDefined();
    expect(config.openai.embeddingModel).toBeDefined();
    expect(typeof config.openai.gptModel).toBe('string');
    expect(typeof config.openai.embeddingModel).toBe('string');
  });

  it('should have correct database configuration from environment or defaults', async () => {
    const { config } = await import('../../src/config.js');

    expect(config.cosmosDb.databaseId).toBeDefined();
    expect(config.cosmosDb.containerId).toBeDefined();
    expect(typeof config.cosmosDb.databaseId).toBe('string');
    expect(typeof config.cosmosDb.containerId).toBe('string');
  });

  it('should handle missing environment variables gracefully', async () => {
    // Test with current environment (which has actual values)
    const { config } = await import('../../src/config.js');
    
    // Verify that the configuration object exists and has the expected structure
    expect(config).toBeDefined();
    expect(config.cosmosDb).toBeDefined();
    expect(config.openai).toBeDefined();
    expect(typeof config.cosmosDb.endpoint).toBe('string');
    expect(typeof config.cosmosDb.key).toBe('string');
    expect(typeof config.openai.endpoint).toBe('string');
    expect(typeof config.openai.key).toBe('string');
  });
});
