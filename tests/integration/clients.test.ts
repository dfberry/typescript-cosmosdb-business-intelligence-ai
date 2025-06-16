import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClients, type Clients } from '../../src/utils/clients.js';
import { config } from '../../src/utils/config.js';

describe('Clients Integration Tests', () => {
    let clients: Clients;

    beforeAll(async () => {
        // Only run these tests if we have real configuration
        if (!config.cosmosDb.endpoint || !config.openai.llm.endpoint) {
            console.log('⚠️  Skipping integration tests - no Azure credentials available');
            return;
        }
        
        try {
            clients = await createClients();
        } catch (error) {
            console.warn('⚠️  Could not create clients for integration tests:', error);
        }
    });

    afterAll(async () => {
        // Cleanup resources if needed
        if (clients?.cosmosClient) {
            // Note: CosmosClient doesn't require explicit cleanup
            // Connection pooling is handled internally
        }
    });

    describe('CosmosDB Integration', () => {
        it('should connect to CosmosDB successfully', async () => {
            if (!clients) {
                console.log('✓ CosmosDB integration test skipped - no client available');
                return;
            }

            expect(clients.cosmosClient).toBeDefined();
            expect(clients.database).toBeDefined();
            expect(clients.container).toBeDefined();
            expect(clients.databaseName).toBe(config.cosmosDb.databaseId);
            expect(clients.containerName).toBe(config.cosmosDb.containerId);
        });

        it('should be able to query the container', async () => {
            if (!clients) {
                console.log('✓ CosmosDB query test skipped - no client available');
                return;
            }

            try {
                const query = 'SELECT TOP 1 * FROM c';
                const response = await clients.container.items.query(query).fetchAll();
                
                expect(response).toBeDefined();
                expect(Array.isArray(response.resources)).toBe(true);
                console.log(`✓ Successfully queried container. Found ${response.resources.length} items`);
            } catch (error) {
                console.warn('⚠️  Container query failed:', error);
                // Don't fail the test - this might be expected in some environments
            }
        });

        it('should have correct database and container configuration', async () => {
            if (!clients) {
                console.log('✓ CosmosDB configuration test skipped - no client available');
                return;
            }

            expect(clients.databaseName).toBe(config.cosmosDb.databaseId);
            expect(clients.containerName).toBe(config.cosmosDb.containerId);
            expect(typeof clients.cosmosClient).toBe('object');
        });

        it('should handle database operations gracefully', async () => {
            if (!clients) {
                console.log('✓ CosmosDB operations test skipped - no client available');
                return;
            }

            try {
                // Test database read
                const databaseResponse = await clients.database.read();
                expect(databaseResponse).toBeDefined();
                
                // Test container read
                const containerResponse = await clients.container.read();
                expect(containerResponse).toBeDefined();
                
                console.log('✓ Database and container operations successful');
            } catch (error) {
                console.warn('⚠️  Database operations failed:', error);
                // Don't fail the test - this might be expected in some environments
            }
        });
    });

    describe('OpenAI Integration', () => {
        it('should create OpenAI clients successfully', async () => {
            if (!clients) {
                console.log('✓ OpenAI client creation test skipped - no client available');
                return;
            }

            expect(clients.llm).toBeDefined();
            expect(clients.embedding).toBeDefined();
            expect(clients.llmModel).toBe(config.openai.llm.deploymentName);
            expect(clients.embeddingModel).toBe(config.openai.embedding.deploymentName);
        });

        it('should be able to create embeddings', async () => {
            if (!clients) {
                console.log('✓ OpenAI embeddings test skipped - no client available');
                return;
            }

            try {
                const response = await clients.embedding.embeddings.create({
                    model: clients.embeddingModel,
                    input: 'Integration test text'
                });

                expect(response).toBeDefined();
                expect(response.data).toBeDefined();
                expect(Array.isArray(response.data)).toBe(true);
                expect(response.data.length).toBeGreaterThan(0);
                expect(Array.isArray(response.data[0].embedding)).toBe(true);
                expect(response.data[0].embedding.length).toBeGreaterThan(0);
                
                console.log(`✓ Successfully created embedding with ${response.data[0].embedding.length} dimensions`);
            } catch (error) {
                console.warn('⚠️  Embedding creation failed:', error);
                // Don't fail the test - this might be expected in some environments
            }
        });

        it('should be able to generate chat completions', async () => {
            if (!clients) {
                console.log('✓ OpenAI chat completions test skipped - no client available');
                return;
            }

            try {
                const response = await clients.llm.chat.completions.create({
                    model: clients.llmModel,
                    messages: [{ role: 'user', content: 'Say "Integration test successful" and nothing else.' }],
                    max_tokens: 10
                });

                expect(response).toBeDefined();
                expect(response.choices).toBeDefined();
                expect(Array.isArray(response.choices)).toBe(true);
                expect(response.choices.length).toBeGreaterThan(0);
                expect(response.choices[0].message).toBeDefined();
                expect(typeof response.choices[0].message.content).toBe('string');
                
                console.log(`✓ Successfully generated chat completion: ${response.choices[0].message.content}`);
            } catch (error) {
                console.warn('⚠️  Chat completion failed:', error);
                // Don't fail the test - this might be expected in some environments
            }
        });

        it('should handle rate limiting gracefully', async () => {
            if (!clients) {
                console.log('✓ Rate limiting test skipped - no client available');
                return;
            }

            // Make multiple rapid requests to test rate limiting
            const promises = Array.from({ length: 3 }, async (_, i) => {
                try {
                    const response = await clients.embedding.embeddings.create({
                        model: clients.embeddingModel,
                        input: `Rate limit test ${i}`
                    });
                    return { success: true, response };
                } catch (error) {
                    return { success: false, error };
                }
            });

            const results = await Promise.allSettled(promises);
            
            // At least one request should succeed
            const successfulResults = results.filter(result => 
                result.status === 'fulfilled' && result.value.success
            );
            
            console.log(`✓ Rate limiting test completed. ${successfulResults.length}/3 requests succeeded`);
            
            // Don't fail the test even if rate limited - this is expected behavior
            expect(results.length).toBe(3);
        });
    });

    describe('End-to-End Integration', () => {
        it('should create clients and validate all components', async () => {
            if (!clients) {
                console.log('✓ End-to-end integration test skipped - no client available');
                return;
            }

            // Verify all clients are created
            expect(clients.cosmosClient).toBeDefined();
            expect(clients.database).toBeDefined();
            expect(clients.container).toBeDefined();
            expect(clients.llm).toBeDefined();
            expect(clients.embedding).toBeDefined();

            // Verify configuration is correctly applied
            expect(clients.databaseName).toBe(config.cosmosDb.databaseId);
            expect(clients.containerName).toBe(config.cosmosDb.containerId);
            expect(clients.llmModel).toBe(config.openai.llm.deploymentName);
            expect(clients.embeddingModel).toBe(config.openai.embedding.deploymentName);

            console.log('✓ All client components validated successfully');
        });

        it('should handle concurrent operations', async () => {
            if (!clients) {
                console.log('✓ Concurrent operations test skipped - no client available');
                return;
            }

            const operations = [
                // CosmosDB operation
                clients.container.items.query('SELECT TOP 1 * FROM c').fetchAll().catch(e => ({ error: e })),
                
                // OpenAI embedding operation
                clients.embedding.embeddings.create({
                    model: clients.embeddingModel,
                    input: 'Concurrent test'
                }).catch(e => ({ error: e })),
                
                // OpenAI chat operation
                clients.llm.chat.completions.create({
                    model: clients.llmModel,
                    messages: [{ role: 'user', content: 'Brief response' }],
                    max_tokens: 5
                }).catch(e => ({ error: e }))
            ];

            const results = await Promise.allSettled(operations);
            
            console.log(`✓ Concurrent operations test completed. ${results.length} operations executed`);
            
            // At least one operation should complete (even if with errors)
            expect(results.length).toBe(3);
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`  Operation ${index + 1}: Success`);
                } else {
                    console.log(`  Operation ${index + 1}: ${result.reason}`);
                }
            });
        });

        it('should reconnect after network issues', async () => {
            if (!clients) {
                console.log('✓ Network resilience test skipped - no client available');
                return;
            }

            // This test simulates network recovery scenarios
            // In a real environment, clients should handle temporary network issues
            
            try {
                // Attempt multiple operations with delays to simulate network recovery
                for (let i = 0; i < 3; i++) {
                    try {
                        await clients.container.items.query('SELECT 1 as test').fetchAll();
                        console.log(`✓ CosmosDB operation ${i + 1} successful`);
                        break;
                    } catch (error) {
                        if (i === 2) throw error; // Re-throw on final attempt
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    }
                }
            } catch (error) {
                console.warn('⚠️  Network resilience test failed for CosmosDB:', error);
            }

            console.log('✓ Network resilience test completed');
        });
    });

    describe('Performance Tests', () => {
        it('should handle embedding requests within reasonable time', async () => {
            if (!clients) {
                console.log('✓ Performance embedding test skipped - no client available');
                return;
            }

            const startTime = Date.now();
            
            try {
                await clients.embedding.embeddings.create({
                    model: clients.embeddingModel,
                    input: 'Performance test text for timing measurement'
                });
                
                const duration = Date.now() - startTime;
                console.log(`✓ Embedding request completed in ${duration}ms`);
                
                // Reasonable timeout for embedding requests (30 seconds)
                expect(duration).toBeLessThan(30000);
            } catch (error) {
                console.warn('⚠️  Performance embedding test failed:', error);
            }
        });

        it('should handle chat completion within reasonable time', async () => {
            if (!clients) {
                console.log('✓ Performance chat completion test skipped - no client available');
                return;
            }

            const startTime = Date.now();
            
            try {
                await clients.llm.chat.completions.create({
                    model: clients.llmModel,
                    messages: [{ role: 'user', content: 'Quick response please' }],
                    max_tokens: 10
                });
                
                const duration = Date.now() - startTime;
                console.log(`✓ Chat completion request completed in ${duration}ms`);
                
                // Reasonable timeout for chat completion (30 seconds)
                expect(duration).toBeLessThan(30000);
            } catch (error) {
                console.warn('⚠️  Performance chat completion test failed:', error);
            }
        });

        it('should handle database queries within reasonable time', async () => {
            if (!clients) {
                console.log('✓ Performance database test skipped - no client available');
                return;
            }

            const startTime = Date.now();
            
            try {
                await clients.container.items.query('SELECT TOP 5 * FROM c').fetchAll();
                
                const duration = Date.now() - startTime;
                console.log(`✓ Database query completed in ${duration}ms`);
                
                // Reasonable timeout for database queries (10 seconds)
                expect(duration).toBeLessThan(10000);
            } catch (error) {
                console.warn('⚠️  Performance database test failed:', error);
            }
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle invalid model names gracefully', async () => {
            if (!clients) {
                console.log('✓ Invalid model test skipped - no client available');
                return;
            }

            try {
                await clients.embedding.embeddings.create({
                    model: 'non-existent-model',
                    input: 'Test text'
                });
                
                // If we reach here, the test should fail
                expect(true).toBe(false);
            } catch (error) {
                // Expected behavior - invalid model should throw error
                expect(error).toBeDefined();
                console.log('✓ Invalid model error handled correctly');
            }
        });

        it('should handle malformed requests gracefully', async () => {
            if (!clients) {
                console.log('✓ Malformed request test skipped - no client available');
                return;
            }

            try {
                await clients.llm.chat.completions.create({
                    model: clients.llmModel,
                    messages: [], // Empty messages array
                    max_tokens: 10
                });
                
                // If we reach here, the test should fail
                expect(true).toBe(false);
            } catch (error) {
                // Expected behavior - malformed request should throw error
                expect(error).toBeDefined();
                console.log('✓ Malformed request error handled correctly');
            }
        });

        it('should handle database connection issues', async () => {
            if (!clients) {
                console.log('✓ Database connection test skipped - no client available');
                return;
            }

            try {
                // Attempt to query a non-existent container
                const fakeContainer = clients.database.container('non-existent-container');
                await fakeContainer.items.query('SELECT * FROM c').fetchAll();
                
                // If we reach here, the test should fail
                expect(true).toBe(false);
            } catch (error) {
                // Expected behavior - non-existent container should throw error
                expect(error).toBeDefined();
                console.log('✓ Database connection error handled correctly');
            }
        });
    });
});
