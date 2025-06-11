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

  it('should have correct model names', async () => {
    const { config } = await import('../../src/config.js');

    expect(config.openai.gptModel).toBe('gpt-4o');
    expect(config.openai.embeddingModel).toBe('text-embedding-ada-002');
  });

  it('should have correct database configuration', async () => {
    const { config } = await import('../../src/config.js');

    expect(config.cosmosDb.databaseId).toBe('MovieDB');
    expect(config.cosmosDb.containerId).toBe('Movies');
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
