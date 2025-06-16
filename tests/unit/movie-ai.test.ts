import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  mockOpenAI, 
  mockEmbeddingResponse, 
  mockChatResponse, 
  mockMovies, 
  createMockContainer,
  resetMocks,
  configureMockForScenario
} from '../__mocks__/azure-services.js';

// Mock the Azure SDK modules
vi.mock('@azure/cosmos', () => ({
  CosmosClient: vi.fn().mockImplementation(() => ({
    database: vi.fn(() => ({
      container: vi.fn(() => ({
        items: {
          query: vi.fn().mockReturnValue({
            fetchAll: vi.fn().mockResolvedValue({ resources: [] })
          })
        }
      }))
    })),
    databases: {
      createIfNotExists: vi.fn().mockResolvedValue({
        database: {
          id: 'TestDB',
          containers: {
            createIfNotExists: vi.fn().mockResolvedValue({
              container: {
                id: 'TestContainer'
              }
            })
          }
        }
      })
    }
  }))
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => mockOpenAI)
}));

vi.mock('../../src/utils/config.js', () => ({
  config: {
    cosmosDb: {
      endpoint: 'https://test.documents.azure.com:443/',
      key: 'test-key',
      databaseId: 'TestDB',
      containerId: 'TestContainer'
    },
    openai: {
      endpoint: 'https://test.openai.azure.com/',
      key: 'test-openai-key',
      apiVersion: '2025-01-01-preview',
      gptModel: 'gpt-4o',
      embeddingModel: 'text-embedding-ada-002',
      llm: {
        endpoint: 'https://test.openai.azure.com/',
        key: 'test-openai-llm-key',
        deploymentName: 'gpt-4o',
        apiVersion: '2024-04-01-preview'
      },
      embedding: {
        endpoint: 'https://test.openai.azure.com/',
        key: 'test-openai-embedding-key',
        deploymentName: 'text-embedding-ada-002',
        apiVersion: '2023-05-15'
      }
    }
  }
}));

// Import the class after mocking
const { MovieAI } = await import('../../src/index.js');

describe('MovieAI Class', () => {
  let movieAI: any;
  let mockContainer: any;

  beforeEach(async () => {
    resetMocks();
    const { container } = createMockContainer();
    mockContainer = container;
    movieAI = new MovieAI();
    // Replace the internal container with our mock
    (movieAI as any).container = mockContainer;
    (movieAI as any).llm = mockOpenAI;
    (movieAI as any).embedding = mockOpenAI;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize Cosmos DB and OpenAI clients', () => {
      expect(movieAI).toBeDefined();
      expect(movieAI.container).toBeDefined();
      expect(movieAI.llm).toBeDefined();
      expect(movieAI.embedding).toBeDefined();
    });
  });

  describe('searchMovies', () => {
    it('should perform vector search successfully', async () => {
      // Setup mocks for successful vector search
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });

      const result = await movieAI.searchMovies('space adventure');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        input: 'space adventure',
        model: 'text-embedding-ada-002'
      });
      expect(result).toEqual(mockMovies);
    });

    it('should fallback to keyword search when vector search fails', async () => {
      // Setup mocks - embedding succeeds but vector query fails
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValueOnce({
        fetchAll: vi.fn().mockRejectedValue(new Error('Vector search failed'))
      }).mockReturnValueOnce({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });

      const result = await movieAI.searchMovies('star wars');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle embedding creation failure', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API error'));

      await expect(movieAI.searchMovies('test query')).rejects.toThrow('OpenAI API error');
    });

    it('should filter movies by keyword relevance', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValueOnce({
        fetchAll: vi.fn().mockRejectedValue(new Error('Vector search failed'))
      }).mockReturnValueOnce({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });

      const result = await movieAI.searchMovies('matrix');

      // Should return filtered results based on keyword matching
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      
      const similarity = movieAI.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(1);
    });

    it('should return 0 for perpendicular vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      
      const similarity = movieAI.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it('should return 0 for vectors of different lengths', () => {
      const vec1 = [1, 0];
      const vec2 = [1, 0, 0];
      
      const similarity = movieAI.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 1, 1];
      
      const similarity = movieAI.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });

  describe('answerQuestion', () => {
    it('should generate answers using GPT', async () => {
      // Setup mocks
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });
      mockOpenAI.chat.completions.create.mockResolvedValue(mockChatResponse);

      const result = await movieAI.answerQuestion('What are some good sci-fi movies?');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ])
      });
      expect(result).toBe('This is a test response about movies based on the context provided.');
    });

    it('should handle GPT API failures', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('GPT API error'));

      await expect(movieAI.answerQuestion('test question')).rejects.toThrow('GPT API error');
    });

    it('should return default message when GPT returns empty response', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      const result = await movieAI.answerQuestion('test question');
      expect(result).toBe('Sorry, I could not generate an answer.');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('Network error'));

      await expect(movieAI.searchMovies('test')).rejects.toThrow('Network error');
    });

    it('should handle invalid API responses', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({ data: [] });

      await expect(movieAI.searchMovies('test')).rejects.toThrow();
    });
  });

  describe('Initialization', () => {
    it('should require init() to be called before using methods', async () => {
      const uninitializedMovieAI = new MovieAI();
      
      await expect(uninitializedMovieAI.searchMovies('test')).rejects.toThrow('MovieAI not initialized. Call init() first.');
      await expect(uninitializedMovieAI.answerQuestion('test')).rejects.toThrow('MovieAI not initialized. Call init() first.');
    });

    it('should initialize properly when init() is called', async () => {
      const movieAI = new MovieAI();
      await movieAI.init();
      
      // After init, the internal properties should be defined
      expect((movieAI as any).container).toBeDefined();
      expect((movieAI as any).llm).toBeDefined();
      expect((movieAI as any).embedding).toBeDefined();
    });

    it('should work correctly after initialization', async () => {
      const movieAI = new MovieAI();
      await movieAI.init();
      
      // Mock the container for this test
      const { container } = createMockContainer();
      (movieAI as any).container = container;
      (movieAI as any).llm = mockOpenAI;
      (movieAI as any).embedding = mockOpenAI;
      
      // Setup mocks
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      container.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockMovies })
      });
      
      // Should not throw an error
      const result = await movieAI.searchMovies('test query');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
