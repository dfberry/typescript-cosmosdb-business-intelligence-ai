import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { loadMovieData } from '../../src/utils/load-data.js';
import type { Movie } from '../../src/utils/types.js';

// Mock dependencies
vi.mock('fs');
vi.mock('../../src/utils/clients.js', () => ({
  createClients: vi.fn()
}));

// Import the mocked function
import { createClients } from '../../src/utils/clients.js';
const mockCreateClients = vi.mocked(createClients);

// Mock data
const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'Test Movie 1',
    description: 'A test movie description',
    genre: 'Action',
    year: 2023,
    actors: ['Actor 1', 'Actor 2'],
    reviews: [
      {
        reviewer: 'Test Reviewer',
        rating: 5,
        review: 'Great movie!'
      }
    ]
  },
  {
    id: '2',
    title: 'Test Movie 2',
    description: 'Another test movie description',
    genre: 'Drama',
    year: 2024,
    actors: ['Actor 3', 'Actor 4'],
    reviews: []
  },
  {
    id: '3',
    title: 'Test Movie 3',
    description: 'Third test movie description',
    genre: 'Comedy',
    year: 2022,
    actors: ['Actor 5'],
    reviews: [
      {
        reviewer: 'Another Reviewer',
        rating: 4,
        review: 'Pretty good!'
      },
      {
        reviewer: 'Third Reviewer',
        rating: 3,
        review: 'Okay movie'
      }
    ]
  }
];

// Mock container
const mockContainer = {
  items: {
    upsert: vi.fn().mockResolvedValue({ resource: { id: 'test' } })
  }
} as any; // Type assertion to avoid Container type mismatch

describe('load-data Module', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    // Clear all mocks including call history
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset the container mock to default behavior
    mockContainer.items.upsert.mockClear();
    mockContainer.items.upsert.mockResolvedValue({ resource: { id: 'test' } });
    
    // Reset readFileSync to default behavior
    const mockReadFileSync = vi.mocked(readFileSync);
    mockReadFileSync.mockClear();
    mockReadFileSync.mockReturnValue(JSON.stringify(mockMovies));
    
    // Reset createClients to default successful behavior
    mockCreateClients.mockClear();
    mockCreateClients.mockResolvedValue({
      container: mockContainer,
      cosmosClient: {} as any,
      llm: {} as any,
      embedding: {} as any,
      database: {} as any,
      databaseName: 'TestDB',
      containerName: 'TestContainer',
      llmModel: 'test-model',
      embeddingModel: 'test-embedding'
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('loadMovieData', () => {
    it('should successfully load movie data from JSON file', async () => {
      await loadMovieData();

      // Verify file was read
      expect(readFileSync).toHaveBeenCalledWith('./data/movies.json', 'utf-8');
      
      // Verify createClients was called
      expect(mockCreateClients).toHaveBeenCalledOnce();
      
      // Verify all movies were upserted
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(3);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(1, mockMovies[0]);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(2, mockMovies[1]);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(3, mockMovies[2]);
      
      // Verify console output
      expect(consoleLogSpy).toHaveBeenCalledWith('Loading 3 movies into Cosmos DB...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('Movie data loading complete!');
    });

    it('should handle empty movie data', async () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      await loadMovieData();

      expect(readFileSync).toHaveBeenCalledWith('./data/movies.json', 'utf-8');
      expect(mockCreateClients).toHaveBeenCalledOnce();
      expect(mockContainer.items.upsert).not.toHaveBeenCalled();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Loading 0 movies into Cosmos DB...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Movie data loading complete!');
    });

    it('should handle single movie', async () => {
      const singleMovie = [mockMovies[0]];
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(singleMovie));

      await loadMovieData();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(1);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(mockMovies[0]);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Loading 1 movies into Cosmos DB...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('Movie data loading complete!');
    });

    it('should handle file reading errors', async () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(loadMovieData()).rejects.toThrow('File not found');
      
      // createClients is called BEFORE readFileSync in the actual function
      expect(mockCreateClients).toHaveBeenCalledOnce();
      expect(readFileSync).toHaveBeenCalledWith('./data/movies.json', 'utf-8');
      expect(mockContainer.items.upsert).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON in file', async () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue('invalid json content');

      await expect(loadMovieData()).rejects.toThrow();
      
      // createClients is called BEFORE readFileSync/JSON.parse in the actual function
      expect(mockCreateClients).toHaveBeenCalledOnce();
      expect(readFileSync).toHaveBeenCalledWith('./data/movies.json', 'utf-8');
      expect(mockContainer.items.upsert).not.toHaveBeenCalled();
    });

    it('should handle createClients failure', async () => {
      // Clear the default setup and override the mock for this test to reject
      mockCreateClients.mockClear();
      mockCreateClients.mockRejectedValue(new Error('Failed to create clients'));

      await expect(loadMovieData()).rejects.toThrow('Failed to create clients');
      
      expect(mockCreateClients).toHaveBeenCalledOnce();
      // readFileSync should not be called if createClients fails
      expect(readFileSync).not.toHaveBeenCalled();
      expect(mockContainer.items.upsert).not.toHaveBeenCalled();
    });

    it('should handle upsert failures and continue processing', async () => {
      // Mock the first upsert to fail, others to succeed
      mockContainer.items.upsert
        .mockRejectedValueOnce(new Error('Upsert failed for movie 1'))
        .mockResolvedValueOnce({ resource: { id: '2' } })
        .mockResolvedValueOnce({ resource: { id: '3' } });

      await expect(loadMovieData()).rejects.toThrow('Upsert failed for movie 1');
      
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(1);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(mockMovies[0]);
      
      // Should have logged the initial message but not completion
      expect(consoleLogSpy).toHaveBeenCalledWith('Loading 3 movies into Cosmos DB...');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('Movie data loading complete!');
    });

    it('should handle partial upsert failures in the middle', async () => {
      // Reset and configure the mock for this specific test
      mockContainer.items.upsert.mockReset();
      mockContainer.items.upsert
        .mockResolvedValueOnce({ resource: { id: '1' } })
        .mockRejectedValueOnce(new Error('Upsert failed for movie 2'))
        .mockResolvedValueOnce({ resource: { id: '3' } });

      await expect(loadMovieData()).rejects.toThrow('Upsert failed for movie 2');
      
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 1');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 2');
    });

    it('should process movies with different structures correctly', async () => {
      // Reset the mock to default behavior for this test
      mockContainer.items.upsert.mockReset();
      mockContainer.items.upsert.mockResolvedValue({ resource: { id: 'test' } });

      const diverseMovies: Movie[] = [
        {
          id: '1',
          title: 'Movie with Reviews',
          description: 'Has reviews',
          genre: 'Action',
          year: 2023,
          actors: ['Actor 1'],
          reviews: [
            { reviewer: 'Reviewer 1', rating: 5, review: 'Great!' }
          ]
        },
        {
          id: '2',
          title: 'Movie without Reviews',
          description: 'No reviews',
          genre: 'Drama',
          year: 2024,
          actors: ['Actor 2', 'Actor 3'],
          reviews: []
        },
        {
          id: '3',
          title: 'Movie with Many Actors',
          description: 'Ensemble cast',
          genre: 'Comedy',
          year: 2022,
          actors: ['Actor 1', 'Actor 2', 'Actor 3', 'Actor 4', 'Actor 5'],
          reviews: [
            { reviewer: 'Reviewer 1', rating: 4, review: 'Good!' },
            { reviewer: 'Reviewer 2', rating: 3, review: 'Okay' }
          ]
        }
      ];

      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(diverseMovies));

      await loadMovieData();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(3);
      diverseMovies.forEach((movie, index) => {
        expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(index + 1, movie);
      });
    });

    it('should handle movies with optional properties', async () => {
      const moviesWithOptionals: Movie[] = [
        {
          id: '1',
          title: 'Movie with Embedding',
          description: 'Has embedding',
          genre: 'Sci-Fi',
          year: 2023,
          actors: ['Actor 1'],
          reviews: [],
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        },
        {
          id: '2',
          title: 'Movie with Vector Properties',
          description: 'Has various vectors',
          genre: 'Fantasy',
          year: 2024,
          actors: ['Actor 2'],
          reviews: [],
          titleVector: [0.1, 0.2],
          descriptionVector: [0.3, 0.4],
          genreVector: [0.5, 0.6]
        }
      ];

      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(moviesWithOptionals));

      await loadMovieData();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(1, moviesWithOptionals[0]);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(2, moviesWithOptionals[1]);
    });

    it('should maintain correct order when processing movies', async () => {
      const orderedMovies = mockMovies.slice().reverse(); // Reverse order
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(orderedMovies));

      await loadMovieData();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(3);
      orderedMovies.forEach((movie, index) => {
        expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(index + 1, movie);
      });
      
      // Verify console logs maintain order
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Loaded/Updated: Test Movie 1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed movie objects gracefully', async () => {
      const malformedData = [
        { id: '1', title: 'Incomplete Movie' }, // Missing required fields
        mockMovies[0] // Valid movie
      ];

      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(malformedData));

      await loadMovieData();

      // Should still attempt to upsert both objects
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(1, malformedData[0]);
      expect(mockContainer.items.upsert).toHaveBeenNthCalledWith(2, malformedData[1]);
    });

    it('should handle very large datasets', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 100 }, (_, index) => ({
        id: `${index + 1}`,
        title: `Movie ${index + 1}`,
        description: `Description for movie ${index + 1}`,
        genre: 'Action',
        year: 2023,
        actors: [`Actor ${index + 1}`],
        reviews: []
      }));

      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue(JSON.stringify(largeDataset));

      await loadMovieData();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(100);
      expect(consoleLogSpy).toHaveBeenCalledWith('Loading 100 movies into Cosmos DB...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Movie data loading complete!');
    });

    it('should handle network timeouts during upsert', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockContainer.items.upsert.mockRejectedValue(timeoutError);

      await expect(loadMovieData()).rejects.toThrow('Request timeout');
      
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
