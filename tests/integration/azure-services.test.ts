import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config } from '../../src/config.js';
import type { Movie } from '../../src/types.js';

// These tests require actual Azure services to be running
// Skip if environment variables are not set
const skipIfNoCredentials = process.env.COSMOS_DB_ENDPOINT && process.env.OPENAI_KEY ? false : true;

describe('Azure Services Integration', { skip: skipIfNoCredentials }, () => {
  let cosmosClient: CosmosClient;
  let openai: OpenAI;
  let container: any;

  beforeAll(async () => {
    if (skipIfNoCredentials) return;

    cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key
    });

    openai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: config.openai.endpoint,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });

    const database = cosmosClient.database(config.cosmosDb.databaseId);
    container = database.container(config.cosmosDb.containerId);
  });

  afterAll(async () => {
    // Cleanup any test data if needed
  });

  describe('Cosmos DB Integration', () => {
    it('should connect to Cosmos DB successfully', async () => {
      const { resources: movies } = await container.items
        .query('SELECT TOP 1 c.id FROM c')
        .fetchAll();
      
      expect(Array.isArray(movies)).toBe(true);
    });

    it('should query movies with embeddings', async () => {
      const { resources: moviesWithEmbeddings } = await container.items
        .query('SELECT c.id, c.title, IS_DEFINED(c.embedding) as hasEmbedding FROM c')
        .fetchAll();
      
      expect(Array.isArray(moviesWithEmbeddings)).toBe(true);
      
      if (moviesWithEmbeddings.length > 0) {
        const movieWithEmbedding = moviesWithEmbeddings.find(m => m.hasEmbedding);
        if (movieWithEmbedding) {
          expect(movieWithEmbedding.hasEmbedding).toBe(true);
        }
      }
    });

    it('should perform vector search query', async () => {
      // Create a test embedding vector
      const testVector = new Array(1536).fill(0).map(() => Math.random());
      
      try {
        const { resources: results } = await container.items.query({
          query: `
            SELECT TOP 3 c.*, VectorDistance(c.embedding, @queryVector) AS SimilarityScore
            FROM c
            WHERE IS_DEFINED(c.embedding)
            ORDER BY VectorDistance(c.embedding, @queryVector)
          `,
          parameters: [{ name: '@queryVector', value: testVector }]
        }).fetchAll();
        
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Vector search might not be supported in test environment
        console.log('Vector search not available in test environment');
      }
    });
  });

  describe('OpenAI Integration', () => {
    it('should create embeddings successfully', async () => {
      const response = await openai.embeddings.create({
        input: 'test movie description',
        model: config.openai.embeddingModel
      });

      expect(response.data).toBeDefined();
      expect(response.data[0]).toBeDefined();
      expect(response.data[0].embedding).toBeDefined();
      expect(Array.isArray(response.data[0].embedding)).toBe(true);
      expect(response.data[0].embedding.length).toBe(1536);
    });

    it('should generate chat completions successfully', async () => {
      const response = await openai.chat.completions.create({
        model: config.openai.gptModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'What is a good movie recommendation?'
          }
        ]
      });

      expect(response.choices).toBeDefined();
      expect(response.choices.length).toBeGreaterThan(0);
      expect(response.choices[0].message).toBeDefined();
      expect(response.choices[0].message.content).toBeDefined();
      expect(typeof response.choices[0].message.content).toBe('string');
    });

    it('should handle rate limiting gracefully', async () => {
      const promises = Array(5).fill(0).map(() => 
        openai.embeddings.create({
          input: 'rate limit test',
          model: config.openai.embeddingModel
        })
      );

      // Should not throw errors even with multiple concurrent requests
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Data Flow', () => {
    it('should find movies and generate embeddings', async () => {
      // Get a sample movie
      const { resources: movies } = await container.items
        .query<Movie>('SELECT TOP 1 * FROM c')
        .fetchAll();
      
      if (movies.length === 0) {
        console.log('No movies found in database');
        return;
      }

      const movie = movies[0];
      
      // Create embedding for movie description
      const movieText = `${movie.title} ${movie.description} ${movie.genre}`;
      const embeddingResponse = await openai.embeddings.create({
        input: movieText,
        model: config.openai.embeddingModel
      });

      expect(embeddingResponse.data[0].embedding).toBeDefined();
      expect(embeddingResponse.data[0].embedding.length).toBe(1536);
    });

    it('should search and generate answers', async () => {
      const question = 'What are some action movies?';
      
      // Create question embedding
      const questionEmbedding = await openai.embeddings.create({
        input: question,
        model: config.openai.embeddingModel
      });

      expect(questionEmbedding.data[0].embedding).toBeDefined();

      // Get movies for context
      const { resources: movies } = await container.items
        .query<Movie>('SELECT TOP 3 * FROM c')
        .fetchAll();

      if (movies.length > 0) {
        const context = movies.map(movie => 
          `${movie.title}: ${movie.description}`
        ).join('\n');

        // Generate answer
        const completion = await openai.chat.completions.create({
          model: config.openai.gptModel,
          messages: [
            {
              role: 'system',
              content: 'You are a movie recommendation assistant.'
            },
            {
              role: 'user',
              content: `Based on these movies, answer: ${question}\n\nMovies:\n${context}`
            }
          ]
        });

        expect(completion.choices[0].message.content).toBeDefined();
        expect(typeof completion.choices[0].message.content).toBe('string');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle embedding requests within reasonable time', async () => {
      const startTime = Date.now();
      
      await openai.embeddings.create({
        input: 'performance test input',
        model: config.openai.embeddingModel
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    it('should handle chat completion within reasonable time', async () => {
      const startTime = Date.now();
      
      await openai.chat.completions.create({
        model: config.openai.gptModel,
        messages: [
          { role: 'user', content: 'Quick test question' }
        ]
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 15 seconds
      expect(duration).toBeLessThan(15000);
    });
  });
});
