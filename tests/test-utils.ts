import { vi } from 'vitest';
import type { Movie, Review } from '../src/utils/types.js';

/**
 * Create a test movie with optional properties
 */
export function createTestMovie(overrides: Partial<Movie> = {}): Movie {
  const defaultMovie: Movie = {
    id: 'test-movie-1',
    title: 'Test Movie',
    description: 'A test movie for unit testing',
    genre: 'Test',
    year: 2024,
    actors: ['Test Actor 1', 'Test Actor 2'],
    reviews: [
      {
        reviewer: 'Test Reviewer',
        rating: 5,
        review: 'Great test movie!'
      }
    ]
  };

  return { ...defaultMovie, ...overrides };
}

/**
 * Create a test review with optional properties
 */
export function createTestReview(overrides: Partial<Review> = {}): Review {
  const defaultReview: Review = {
    reviewer: 'Test Reviewer',
    rating: 4,
    review: 'Test review content'
  };

  return { ...defaultReview, ...overrides };
}

/**
 * Create a mock embedding vector
 */
export function createMockEmbedding(dimensions: number = 1536): number[] {
  return new Array(dimensions).fill(0).map(() => Math.random());
}

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test environment with mocked dependencies
 */
export function createTestEnvironment() {
  const mockCosmosClient = {
    database: vi.fn(() => ({
      container: vi.fn(() => ({
        items: {
          query: vi.fn(() => ({
            fetchAll: vi.fn()
          })),
          upsert: vi.fn(),
          read: vi.fn()
        }
      }))
    }))
  };

  const mockOpenAI = {
    embeddings: {
      create: vi.fn()
    },
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  };

  return {
    mockCosmosClient,
    mockOpenAI,
    resetMocks: () => {
      vi.clearAllMocks();
    }
  };
}

/**
 * Validate movie object structure
 */
export function validateMovieStructure(movie: any): boolean {
  const requiredFields = ['id', 'title', 'description', 'genre', 'year', 'actors', 'reviews'];
  
  for (const field of requiredFields) {
    if (!(field in movie)) {
      return false;
    }
  }

  if (!Array.isArray(movie.actors)) return false;
  if (!Array.isArray(movie.reviews)) return false;
  if (typeof movie.year !== 'number') return false;
  if (typeof movie.title !== 'string') return false;

  // Validate reviews structure
  for (const review of movie.reviews) {
    if (!validateReviewStructure(review)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate review object structure
 */
export function validateReviewStructure(review: any): boolean {
  const requiredFields = ['reviewer', 'rating', 'review'];
  
  for (const field of requiredFields) {
    if (!(field in review)) {
      return false;
    }
  }

  if (typeof review.reviewer !== 'string') return false;
  if (typeof review.rating !== 'number') return false;
  if (typeof review.review !== 'string') return false;

  return true;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Generate test data for performance testing
 */
export function generateTestData(count: number): Movie[] {
  const genres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance'];
  const movies: Movie[] = [];

  for (let i = 0; i < count; i++) {
    movies.push(createTestMovie({
      id: `test-movie-${i}`,
      title: `Test Movie ${i}`,
      genre: genres[i % genres.length],
      year: 2000 + (i % 24),
      embedding: createMockEmbedding()
    }));
  }

  return movies;
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const consoleMock = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  };

  vi.stubGlobal('console', consoleMock);

  return consoleMock;
}

/**
 * Check if environment is properly configured for testing
 */
export function isTestEnvironmentReady(): boolean {
  return !!(
    process.env.COSMOS_DB_ENDPOINT &&
    process.env.COSMOS_DB_KEY &&
    process.env.OPENAI_LLM_ENDPOINT &&
    process.env.OPENAI_LLM_KEY &&
    process.env.OPENAI_LLM_API_VERSION &&
    process.env.OPENAI_LLM_DEPLOYMENT_NAME &&
    process.env.OPENAI_EMBEDDING_ENDPOINT &&
    process.env.OPENAI_EMBEDDING_KEY &&
    process.env.OPENAI_EMBEDDING_API_VERSION &&
    process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME
  );
}

/**
 * Skip test if environment is not ready
 */
export function skipIfNotReady() {
  return !isTestEnvironmentReady();
}
