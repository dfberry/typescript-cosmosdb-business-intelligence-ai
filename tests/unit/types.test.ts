import { describe, it, expect } from 'vitest';
import type { Movie, Review } from '../../src/utils/types.js';

describe('Types Module', () => {
  describe('Review Interface', () => {
    it('should accept valid review objects', () => {
      const validReview: Review = {
        reviewer: 'John Doe',
        rating: 5,
        review: 'Excellent movie!'
      };

      expect(validReview.reviewer).toBe('John Doe');
      expect(validReview.rating).toBe(5);
      expect(validReview.review).toBe('Excellent movie!');
    });

    it('should enforce required properties', () => {
      // This test validates TypeScript compilation
      // If these properties weren't required, TypeScript would error
      const review: Review = {
        reviewer: 'Jane Smith',
        rating: 4,
        review: 'Good movie'
      };

      expect(typeof review.reviewer).toBe('string');
      expect(typeof review.rating).toBe('number');
      expect(typeof review.review).toBe('string');
    });
  });

  describe('Movie Interface', () => {
    it('should accept valid movie objects without embedding', () => {
      const validMovie: Movie = {
        id: '1',
        title: 'Test Movie',
        description: 'A test movie description',
        genre: 'Drama',
        year: 2024,
        actors: ['Actor 1', 'Actor 2'],
        reviews: [
          {
            reviewer: 'Critic 1',
            rating: 5,
            review: 'Amazing!'
          }
        ]
      };

      expect(validMovie.id).toBe('1');
      expect(validMovie.title).toBe('Test Movie');
      expect(validMovie.description).toBe('A test movie description');
      expect(validMovie.genre).toBe('Drama');
      expect(validMovie.year).toBe(2024);
      expect(Array.isArray(validMovie.actors)).toBe(true);
      expect(Array.isArray(validMovie.reviews)).toBe(true);
      expect(validMovie.embedding).toBeUndefined();
    });

    it('should accept valid movie objects with embedding', () => {
      const movieWithEmbedding: Movie = {
        id: '2',
        title: 'Test Movie 2',
        description: 'Another test movie',
        genre: 'Action',
        year: 2023,
        actors: ['Hero', 'Villain'],
        reviews: [],
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      };

      expect(movieWithEmbedding.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(Array.isArray(movieWithEmbedding.embedding)).toBe(true);
    });

    it('should handle empty reviews array', () => {
      const movieWithNoReviews: Movie = {
        id: '3',
        title: 'No Reviews Movie',
        description: 'A movie without reviews',
        genre: 'Comedy',
        year: 2022,
        actors: ['Comedian'],
        reviews: []
      };

      expect(movieWithNoReviews.reviews).toEqual([]);
      expect(Array.isArray(movieWithNoReviews.reviews)).toBe(true);
    });

    it('should handle multiple reviews', () => {
      const reviews: Review[] = [
        { reviewer: 'Critic 1', rating: 5, review: 'Excellent!' },
        { reviewer: 'Critic 2', rating: 4, review: 'Very good!' },
        { reviewer: 'User 1', rating: 3, review: 'Okay movie' }
      ];

      const movieWithMultipleReviews: Movie = {
        id: '4',
        title: 'Popular Movie',
        description: 'A well-reviewed movie',
        genre: 'Thriller',
        year: 2021,
        actors: ['Star 1', 'Star 2'],
        reviews
      };

      expect(movieWithMultipleReviews.reviews).toHaveLength(3);
      expect(movieWithMultipleReviews.reviews[0].rating).toBe(5);
      expect(movieWithMultipleReviews.reviews[1].rating).toBe(4);
      expect(movieWithMultipleReviews.reviews[2].rating).toBe(3);
    });

    it('should accept movie objects with all optional vector properties', () => {
      const movieWithAllVectors: Movie = {
        id: '5',
        title: 'Fully Vectorized Movie',
        description: 'A movie with all vector embeddings',
        genre: 'Sci-Fi',
        year: 2023,
        actors: ['AI Actor'],
        reviews: [],
        embedding: [0.1, 0.2, 0.3],
        titleVector: [0.4, 0.5, 0.6],
        descriptionVector: [0.7, 0.8, 0.9],
        genreVector: [0.1, 0.3, 0.5],
        yearVector: [0.2, 0.4, 0.6],
        actorsVector: [0.3, 0.6, 0.9],
        reviewsVector: [0.5, 0.7, 0.8]
      };

      expect(movieWithAllVectors.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(movieWithAllVectors.titleVector).toEqual([0.4, 0.5, 0.6]);
      expect(movieWithAllVectors.descriptionVector).toEqual([0.7, 0.8, 0.9]);
      expect(movieWithAllVectors.genreVector).toEqual([0.1, 0.3, 0.5]);
      expect(movieWithAllVectors.yearVector).toEqual([0.2, 0.4, 0.6]);
      expect(movieWithAllVectors.actorsVector).toEqual([0.3, 0.6, 0.9]);
      expect(movieWithAllVectors.reviewsVector).toEqual([0.5, 0.7, 0.8]);
      
      // Verify all vectors are arrays
      expect(Array.isArray(movieWithAllVectors.embedding)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.titleVector)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.descriptionVector)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.genreVector)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.yearVector)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.actorsVector)).toBe(true);
      expect(Array.isArray(movieWithAllVectors.reviewsVector)).toBe(true);
    });

    it('should accept movie objects with partial vector properties', () => {
      const movieWithPartialVectors: Movie = {
        id: '6',
        title: 'Partially Vectorized Movie',
        description: 'A movie with some vector embeddings',
        genre: 'Drama',
        year: 2024,
        actors: ['Actor One', 'Actor Two'],
        reviews: [{ reviewer: 'Test', rating: 4, review: 'Good' }],
        embedding: [1.0, 2.0, 3.0],
        titleVector: [4.0, 5.0, 6.0]
        // Other vector properties intentionally omitted
      };

      expect(movieWithPartialVectors.embedding).toEqual([1.0, 2.0, 3.0]);
      expect(movieWithPartialVectors.titleVector).toEqual([4.0, 5.0, 6.0]);
      expect(movieWithPartialVectors.descriptionVector).toBeUndefined();
      expect(movieWithPartialVectors.genreVector).toBeUndefined();
      expect(movieWithPartialVectors.yearVector).toBeUndefined();
      expect(movieWithPartialVectors.actorsVector).toBeUndefined();
      expect(movieWithPartialVectors.reviewsVector).toBeUndefined();
    });

    it('should enforce required string properties', () => {
      const movie: Movie = {
        id: '7',
        title: 'String Properties Test',
        description: 'Testing string type enforcement',
        genre: 'Test',
        year: 2024,
        actors: ['Test Actor'],
        reviews: []
      };

      expect(typeof movie.id).toBe('string');
      expect(typeof movie.title).toBe('string');
      expect(typeof movie.description).toBe('string');
      expect(typeof movie.genre).toBe('string');
      expect(movie.id.length).toBeGreaterThan(0);
      expect(movie.title.length).toBeGreaterThan(0);
      expect(movie.description.length).toBeGreaterThan(0);
      expect(movie.genre.length).toBeGreaterThan(0);
    });

    it('should enforce number type for year property', () => {
      const movie: Movie = {
        id: '8',
        title: 'Year Test Movie',
        description: 'Testing year property',
        genre: 'Test',
        year: 2024,
        actors: [],
        reviews: []
      };

      expect(typeof movie.year).toBe('number');
      expect(Number.isInteger(movie.year)).toBe(true);
      expect(movie.year).toBeGreaterThan(1800); // Reasonable year validation
    });

    it('should enforce array types for actors and reviews', () => {
      const movie: Movie = {
        id: '9',
        title: 'Array Types Test',
        description: 'Testing array type enforcement',
        genre: 'Test',
        year: 2024,
        actors: ['Actor 1', 'Actor 2', 'Actor 3'],
        reviews: [
          { reviewer: 'Reviewer 1', rating: 5, review: 'Great!' },
          { reviewer: 'Reviewer 2', rating: 3, review: 'Okay' }
        ]
      };

      expect(Array.isArray(movie.actors)).toBe(true);
      expect(Array.isArray(movie.reviews)).toBe(true);
      expect(movie.actors.every(actor => typeof actor === 'string')).toBe(true);
      expect(movie.reviews.every(review => 
        typeof review.reviewer === 'string' && 
        typeof review.rating === 'number' && 
        typeof review.review === 'string'
      )).toBe(true);
    });
  });

  describe('Review Interface - Extended Tests', () => {
    it('should enforce numeric rating type', () => {
      const review: Review = {
        reviewer: 'Test Reviewer',
        rating: 4.5,
        review: 'Good movie with decimal rating'
      };

      expect(typeof review.rating).toBe('number');
      expect(review.rating).toBeGreaterThanOrEqual(0);
      expect(review.rating).toBeLessThanOrEqual(10); // Assuming max rating of 10
    });

    it('should handle edge cases for review text', () => {
      const reviews: Review[] = [
        {
          reviewer: 'Minimalist',
          rating: 5,
          review: 'Good!'
        },
        {
          reviewer: 'Verbose Critic',
          rating: 3,
          review: 'This is a very long review that goes into great detail about every aspect of the movie, including the cinematography, acting, plot, soundtrack, and overall production quality.'
        },
        {
          reviewer: 'Silent Reviewer',
          rating: 4,
          review: ''
        }
      ];

      reviews.forEach(review => {
        expect(typeof review.reviewer).toBe('string');
        expect(typeof review.rating).toBe('number');
        expect(typeof review.review).toBe('string');
        expect(review.reviewer.length).toBeGreaterThan(0);
        expect(review.rating).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Type Safety and Validation', () => {
    it('should demonstrate TypeScript type enforcement at compile time', () => {
      // These tests verify that the types work correctly at runtime
      // TypeScript compilation errors would prevent incorrect types from being used
      
      const validMovie: Movie = {
        id: 'type-test-1',
        title: 'Type Safety Test',
        description: 'Testing TypeScript type enforcement',
        genre: 'Documentary',
        year: 2024,
        actors: ['Developer', 'Tester'],
        reviews: [
          { reviewer: 'Code Reviewer', rating: 5, review: 'Well-typed!' }
        ]
      };

      // Verify all required properties are present and correctly typed
      expect(validMovie).toHaveProperty('id');
      expect(validMovie).toHaveProperty('title');
      expect(validMovie).toHaveProperty('description');
      expect(validMovie).toHaveProperty('genre');
      expect(validMovie).toHaveProperty('year');
      expect(validMovie).toHaveProperty('actors');
      expect(validMovie).toHaveProperty('reviews');

      // Verify optional properties work correctly
      expect(validMovie.embedding).toBeUndefined();
      expect(validMovie.titleVector).toBeUndefined();
      expect(validMovie.descriptionVector).toBeUndefined();
      expect(validMovie.genreVector).toBeUndefined();
      expect(validMovie.yearVector).toBeUndefined();
      expect(validMovie.actorsVector).toBeUndefined();
      expect(validMovie.reviewsVector).toBeUndefined();
    });

    it('should handle empty and edge case values correctly', () => {
      const edgeCaseMovie: Movie = {
        id: '',  // Empty string (valid but unusual)
        title: 'A',  // Single character title
        description: 'Short',  // Very short description
        genre: 'Unknown',
        year: 1900,  // Old year
        actors: [],  // Empty actors array
        reviews: [],  // Empty reviews array
        embedding: [],  // Empty embedding array
      };

      expect(typeof edgeCaseMovie.id).toBe('string');
      expect(typeof edgeCaseMovie.title).toBe('string');
      expect(typeof edgeCaseMovie.description).toBe('string');
      expect(typeof edgeCaseMovie.genre).toBe('string');
      expect(typeof edgeCaseMovie.year).toBe('number');
      expect(Array.isArray(edgeCaseMovie.actors)).toBe(true);
      expect(Array.isArray(edgeCaseMovie.reviews)).toBe(true);
      expect(Array.isArray(edgeCaseMovie.embedding)).toBe(true);
      expect(edgeCaseMovie.actors).toHaveLength(0);
      expect(edgeCaseMovie.reviews).toHaveLength(0);
      expect(edgeCaseMovie.embedding).toHaveLength(0);
    });

    it('should maintain type consistency across vector properties', () => {
      const vectorMovie: Movie = {
        id: 'vector-test',
        title: 'Vector Consistency Test',
        description: 'Testing vector property consistency',
        genre: 'Tech',
        year: 2024,
        actors: ['Vector', 'Matrix'],
        reviews: [],
        embedding: [1, 2, 3],
        titleVector: [1.1, 2.2, 3.3],
        descriptionVector: [0.1, 0.2, 0.3],
        genreVector: [10, 20, 30],
        yearVector: [2024],
        actorsVector: [0.5, 0.5],
        reviewsVector: [0]
      };

      // All vector properties should be arrays of numbers
      const vectorProperties = [
        'embedding', 'titleVector', 'descriptionVector', 
        'genreVector', 'yearVector', 'actorsVector', 'reviewsVector'
      ];

      vectorProperties.forEach(prop => {
        const vectorData = vectorMovie[prop as keyof Movie] as number[];
        expect(Array.isArray(vectorData)).toBe(true);
        if (vectorData && vectorData.length > 0) {
          expect(vectorData.every(val => typeof val === 'number')).toBe(true);
        }
      });
    });
  });
});
