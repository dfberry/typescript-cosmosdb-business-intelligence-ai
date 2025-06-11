import { describe, it, expect } from 'vitest';
import type { Movie, Review } from '../../src/types.js';

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
  });
});
