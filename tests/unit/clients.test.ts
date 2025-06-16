import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CosmosClient, Database, Container } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { createClients, type Clients } from '../../src/utils/clients.js';
import * as configModule from '../../src/utils/config.js';

// Mock the config module
vi.mock('../../src/utils/config.js', () => ({
    config: {
        cosmosDb: {
            endpoint: 'https://test-cosmos.documents.azure.com:443/',
            key: 'test-cosmos-key',
            databaseId: 'TestDB',
            containerId: 'TestContainer'
        },
        openai: {
            llm: {
                endpoint: 'https://test-llm.openai.azure.com/',
                key: 'test-llm-key',
                deploymentName: 'test-gpt-4o',
                apiVersion: '2024-06-01'
            },
            embedding: {
                endpoint: 'https://test-embedding.openai.azure.com/',
                key: 'test-embedding-key',
                deploymentName: 'test-embedding-ada-002',
                apiVersion: '2024-06-01'
            }
        }
    }
}));

// Mock Azure Cosmos DB SDK
vi.mock('@azure/cosmos', () => ({
    CosmosClient: vi.fn().mockImplementation(() => ({
        database: vi.fn().mockReturnValue({
            container: vi.fn().mockReturnValue({
                // Mock container methods
                items: {
                    query: vi.fn().mockReturnValue({
                        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
                    }),
                    create: vi.fn().mockResolvedValue({ resource: {} })
                }
            }),
            containers: {
                createIfNotExists: vi.fn().mockResolvedValue({ 
                    database: {
                        containers: {
                            createIfNotExists: vi.fn().mockResolvedValue({ container: {} })
                        }
                    }
                })
            }
        }),
        databases: {
            createIfNotExists: vi.fn().mockResolvedValue({ 
                database: {
                    containers: {
                        createIfNotExists: vi.fn().mockResolvedValue({ container: {} })
                    }
                }
            })
        }
    }))
}));

// Mock OpenAI SDK
vi.mock('openai', () => ({
    OpenAI: vi.fn().mockImplementation(() => ({
        embeddings: {
            create: vi.fn().mockResolvedValue({
                data: [{ embedding: [0.1, 0.2, 0.3] }]
            })
        },
        chat: {
            completions: {
                create: vi.fn().mockResolvedValue({
                    choices: [{ message: { content: 'test response' } }]
                })
            }
        }
    }))
}));

// Capture the original mock implementations
const originalCosmosClientMock = vi.mocked(CosmosClient).getMockImplementation();
const originalOpenAIMock = vi.mocked(OpenAI).getMockImplementation();

describe('Clients Module', () => {
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let consoleWarnSpy: any;

    beforeEach(() => {
        // Clear all mocks first
        vi.clearAllMocks();
        
        // Reset mocks to their original implementations
        if (originalCosmosClientMock) {
            vi.mocked(CosmosClient).mockImplementation(originalCosmosClientMock);
        }
        if (originalOpenAIMock) {
            vi.mocked(OpenAI).mockImplementation(originalOpenAIMock);
        }
        
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        if (consoleSpy && typeof consoleSpy.mockRestore === 'function') {
            consoleSpy.mockRestore();
        }
        if (consoleErrorSpy && typeof consoleErrorSpy.mockRestore === 'function') {
            consoleErrorSpy.mockRestore();
        }
        if (consoleWarnSpy && typeof consoleWarnSpy.mockRestore === 'function') {
            consoleWarnSpy.mockRestore();
        }
    });

    describe('createClients', () => {
        it('should create all clients successfully', async () => {
            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(clients).toHaveProperty('cosmosClient');
            expect(clients).toHaveProperty('database');
            expect(clients).toHaveProperty('container');
            expect(clients).toHaveProperty('llm');
            expect(clients).toHaveProperty('embedding');
            expect(clients).toHaveProperty('llmModel', 'test-gpt-4o');
            expect(clients).toHaveProperty('embeddingModel', 'test-embedding-ada-002');
            expect(clients).toHaveProperty('databaseName', 'TestDB');
            expect(clients).toHaveProperty('containerName', 'TestContainer');
        });

        it('should validate models successfully', async () => {
            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleSpy).toHaveBeenCalledWith('🔍 Validating llm model: test-gpt-4o');
            expect(consoleSpy).toHaveBeenCalledWith('🔍 Validating embedding model: test-embedding-ada-002');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ llm model'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ embedding model'));
        });

        it('should handle model validation failures gracefully', async () => {
            // Mock OpenAI to throw 404 errors
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockRejectedValue(new Error('404 Resource not found'))
                },
                chat: {
                    completions: {
                        create: vi.fn().mockRejectedValue(new Error('404 Resource not found'))
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  LLM model validation failed'));
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Embedding model validation failed'));
        });

        it('should handle missing configuration', async () => {
            // Test with undefined config parameter
            await expect(createClients(undefined)).rejects.toThrow('Configuration is required');
        });

        it('should handle CosmosDB client creation errors', async () => {
            // Mock CosmosClient to throw error
            const mockCosmosClient = vi.mocked(CosmosClient);
            mockCosmosClient.mockImplementation(() => {
                throw new Error('Invalid endpoint');
            });

            await expect(createClients()).rejects.toThrow();
        });

        it('should handle database preparation errors', async () => {
            // Mock database operations to fail
            const mockCosmosClient = vi.mocked(CosmosClient);
            mockCosmosClient.mockImplementation(() => ({
                database: vi.fn().mockReturnValue({
                    container: vi.fn().mockReturnValue({})
                }),
                databases: {
                    createIfNotExists: vi.fn().mockRejectedValue(new Error('Database creation failed'))
                }
            } as any));

            await expect(createClients()).rejects.toThrow();
        });

        it('should create OpenAI clients with correct configuration', async () => {
            const clients = await createClients();

            expect(OpenAI).toHaveBeenCalledTimes(2);
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: 'test-llm-key',
                baseURL: 'https://test-llm.openai.azure.com/openai/deployments/test-gpt-4o',
                defaultQuery: { 'api-version': '2024-06-01' },
                defaultHeaders: {
                    'api-key': 'test-llm-key',
                },
            });
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: 'test-embedding-key',
                baseURL: 'https://test-embedding.openai.azure.com/openai/deployments/test-embedding-ada-002',
                defaultQuery: { 'api-version': '2024-06-01' },
                defaultHeaders: {
                    'api-key': 'test-embedding-key',
                },
            });
        });

        it('should create CosmosDB client with correct configuration', async () => {
            const clients = await createClients();

            expect(CosmosClient).toHaveBeenCalledWith({
                endpoint: 'https://test-cosmos.documents.azure.com:443/',
                key: 'test-cosmos-key'
            });
        });

        it('should log success messages for client creation', async () => {
            const clients = await createClients();

            expect(consoleSpy).toHaveBeenCalledWith('✅ Database \'TestDB\' and container \'TestContainer\' are ready');
            expect(consoleSpy).toHaveBeenCalledWith('✅ OpenAI clients created for models: test-gpt-4o, test-embedding-ada-002');
        });

        it('should handle timeout during model validation', async () => {
            // Mock OpenAI to take longer than timeout
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockImplementation(() => 
                        new Promise(resolve => setTimeout(resolve, 11000)) // 11 seconds - longer than 10 sec timeout
                    )
                },
                chat: {
                    completions: {
                        create: vi.fn().mockImplementation(() => 
                            new Promise(resolve => setTimeout(resolve, 11000))
                        )
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('validation timed out'));
        });

        it('should handle authentication errors', async () => {
            // Mock OpenAI to throw 401 errors
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockRejectedValue(new Error('401 Unauthorized'))
                },
                chat: {
                    completions: {
                        create: vi.fn().mockRejectedValue(new Error('403 Forbidden'))
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('authentication failed'));
        });

        it('should validate input parameters for createModelClients', async () => {
            // Test with invalid OpenAI configuration
            const invalidConfig = {
                cosmosDb: {
                    endpoint: 'https://test-cosmos.documents.azure.com:443/',
                    key: 'test-cosmos-key',
                    databaseId: 'TestDB',
                    containerId: 'TestContainer'
                },
                openai: undefined
            };

            await expect(createClients(invalidConfig as any)).rejects.toThrow('OpenAI configuration for LLM and embedding models is required');
        });

        it('should validate CosmosDB configuration', async () => {
            // Test with missing CosmosDB configuration
            const invalidConfig = {
                cosmosDb: {
                    endpoint: '',
                    key: '',
                    databaseId: 'TestDB',
                    containerId: 'TestContainer'
                },
                openai: {
                    llm: {
                        endpoint: 'https://test-llm.openai.azure.com/',
                        key: 'test-llm-key',
                        deploymentName: 'test-gpt-4o',
                        apiVersion: '2024-06-01'
                    },
                    embedding: {
                        endpoint: 'https://test-embedding.openai.azure.com/',
                        key: 'test-embedding-key',
                        deploymentName: 'test-embedding-ada-002',
                        apiVersion: '2024-06-01'
                    }
                }
            };

            await expect(createClients(invalidConfig as any)).rejects.toThrow('CosmosDB endpoint and key are required');
        });

        it('should handle model validation with invalid responses', async () => {
            // Mock OpenAI to return unexpected responses
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockResolvedValue({ data: [] }) // Empty data array
                },
                chat: {
                    completions: {
                        create: vi.fn().mockResolvedValue({ choices: [] }) // Empty choices array
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  llm model'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  embedding model'));
        });
    });

    describe('Error Handling', () => {
        it('should log errors consistently', async () => {
            // Mock CosmosClient to throw error
            const mockCosmosClient = vi.mocked(CosmosClient);
            mockCosmosClient.mockImplementation(() => {
                throw new Error('Connection failed');
            });

            await expect(createClients()).rejects.toThrow();
            // Should log both specific error and general error
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error creating Cosmos DB client:', expect.any(Error));
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error creating clients:', expect.any(Error));
        });

        it('should handle network errors during validation', async () => {
            // Mock OpenAI to throw network errors
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
                },
                chat: {
                    completions: {
                        create: vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  llm model'));
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  embedding model'));
        });
    });

    describe('Input Validation', () => {
        it('should validate required OpenAI configuration fields', async () => {
            // Test with incomplete OpenAI configuration
            const invalidConfig = {
                cosmosDb: {
                    endpoint: 'https://test-cosmos.documents.azure.com:443/',
                    key: 'test-cosmos-key',
                    databaseId: 'TestDB',
                    containerId: 'TestContainer'
                },
                openai: {
                    llm: {
                        endpoint: 'https://test-llm.openai.azure.com/',
                        key: '', // Missing key
                        deploymentName: 'test-gpt-4o',
                        apiVersion: '2024-06-01'
                    },
                    embedding: {
                        endpoint: 'https://test-embedding.openai.azure.com/',
                        key: 'test-embedding-key',
                        deploymentName: 'test-embedding-ada-002',
                        apiVersion: '2024-06-01'
                    }
                }
            };

            await expect(createClients(invalidConfig as any)).rejects.toThrow('LLM configuration must include key, endpoint, and deploymentName');
        });

        it('should validate database IDs', async () => {
            // Test with missing database IDs
            const invalidConfig = {
                cosmosDb: {
                    endpoint: 'https://test-cosmos.documents.azure.com:443/',
                    key: 'test-cosmos-key',
                    databaseId: '', // Missing database ID
                    containerId: 'TestContainer'
                },
                openai: {
                    llm: {
                        endpoint: 'https://test-llm.openai.azure.com/',
                        key: 'test-llm-key',
                        deploymentName: 'test-gpt-4o',
                        apiVersion: '2024-06-01'
                    },
                    embedding: {
                        endpoint: 'https://test-embedding.openai.azure.com/',
                        key: 'test-embedding-key',
                        deploymentName: 'test-embedding-ada-002',
                        apiVersion: '2024-06-01'
                    }
                }
            };

            await expect(createClients(invalidConfig as any)).rejects.toThrow('Database or container ID is not defined in config');
        });
    });

    describe('Resource Management', () => {
        it('should handle Promise.allSettled correctly for model validation', async () => {
            // Mock one successful and one failed validation
            const mockOpenAI = vi.mocked(OpenAI);
            let callCount = 0;
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockResolvedValue({
                        data: [{ embedding: [0.1, 0.2, 0.3] }]
                    })
                },
                chat: {
                    completions: {
                        create: vi.fn().mockImplementation(() => {
                            callCount++;
                            if (callCount === 1) {
                                return Promise.reject(new Error('404 Resource not found'));
                            }
                            return Promise.resolve({
                                choices: [{ message: { content: 'test response' } }]
                            });
                        })
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  LLM model validation failed'));
        });

        it('should not fail when both validations fail', async () => {
            // Mock both validations to fail
            const mockOpenAI = vi.mocked(OpenAI);
            mockOpenAI.mockImplementation(() => ({
                embeddings: {
                    create: vi.fn().mockRejectedValue(new Error('Service unavailable'))
                },
                chat: {
                    completions: {
                        create: vi.fn().mockRejectedValue(new Error('Service unavailable'))
                    }
                }
            } as any));

            const clients = await createClients();

            expect(clients).toBeDefined();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  LLM model validation failed'));
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Embedding model validation failed'));
        });
    });
});
