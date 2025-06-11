import { vi } from 'vitest';

// Mock movie data for tests
export const mockMovies = [
  {
    id: '1',
    title: 'Star Wars',
    description: 'A space opera about the Force',
    genre: 'Sci-Fi',
    year: 1977,
    actors: ['Mark Hamill', 'Harrison Ford'],
    reviews: [
      { reviewer: 'Critic', rating: 5, review: 'Classic!' }
    ],
    embedding: new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1))
  },
  {
    id: '2',
    title: 'The Matrix',
    description: 'A hacker discovers reality is a simulation',
    genre: 'Sci-Fi',
    year: 1999,
    actors: ['Keanu Reeves', 'Laurence Fishburne'],
    reviews: [
      { reviewer: 'User', rating: 4, review: 'Mind-bending!' }
    ],
    embedding: new Array(1536).fill(0).map((_, i) => Math.cos(i * 0.1))
  },
  {
    id: '3',
    title: 'Inception',
    description: 'Dreams within dreams',
    genre: 'Sci-Fi',
    year: 2010,
    actors: ['Leonardo DiCaprio', 'Marion Cotillard'],
    reviews: [
      { reviewer: 'Expert', rating: 5, review: 'Complex and brilliant!' }
    ],
    embedding: new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.2))
  }
];

// Mock embedding response
export const mockEmbeddingResponse = {
  data: [{
    embedding: new Array(1536).fill(0).map((_, i) => Math.random() * 0.1)
  }]
};

// Mock chat completion response
export const mockChatResponse = {
  choices: [{
    message: {
      content: 'This is a test response about movies based on the context provided.'
    }
  }]
};

// Create a proper mock container that returns consistent data
export const createMockContainer = () => {
  const mockFetchAll = vi.fn().mockResolvedValue({
    resources: mockMovies
  });
  
  const mockQuery = vi.fn().mockReturnValue({
    fetchAll: mockFetchAll
  });
  
  const container = {
    items: {
      query: mockQuery,
      upsert: vi.fn().mockResolvedValue({ resource: { id: 'new-movie' } }),
      read: vi.fn().mockResolvedValue({ resource: mockMovies[0] })
    }
  };
  
  return { container, mockQuery, mockFetchAll };
};

// Mock Cosmos DB Client
export const mockCosmosClient = {
  database: vi.fn(() => ({
    container: vi.fn(() => createMockContainer().container)
  }))
};

// Mock OpenAI Client with proper method structure
export const mockOpenAI = {
  embeddings: {
    create: vi.fn().mockResolvedValue(mockEmbeddingResponse)
  },
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue(mockChatResponse)
    }
  }
};

// Helper function to reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  
  // Reset to default behavior
  mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
  mockOpenAI.chat.completions.create.mockResolvedValue(mockChatResponse);
};

// Helper to simulate different query scenarios
export const configureMockForScenario = (scenario: string) => {
  const { container, mockFetchAll } = createMockContainer();
  
  switch (scenario) {
    case 'empty-results':
      mockFetchAll.mockResolvedValue({ resources: [] });
      break;
    case 'vector-search-failure':
      mockFetchAll.mockRejectedValueOnce(new Error('Vector search not supported'))
        .mockResolvedValue({ resources: mockMovies });
      break;
    case 'no-embeddings':
      const moviesWithoutEmbeddings = mockMovies.map(m => ({ ...m, embedding: undefined }));
      mockFetchAll.mockResolvedValue({ resources: moviesWithoutEmbeddings });
      break;
    default:
      mockFetchAll.mockResolvedValue({ resources: mockMovies });
  }
  
  return container;
};
