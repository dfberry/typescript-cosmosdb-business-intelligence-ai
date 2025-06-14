import { Movie } from './types.js';
import type { Container } from '@azure/cosmos';
import type { OpenAI } from 'openai';
import { cosineSimilarity } from './similarity.js';

export async function getEmbeddings(
    config: any,
    container: Container,
    llm: OpenAI,
    embedding: OpenAI,
    question: string): Promise<Movie[]> {
    try {
      console.log(`Create embbedding for input: ${question}`);
      // Create embedding for the question using the embedding model
      const embeddingResponse = await embedding.embeddings.create({
        input: question,
        model: config.openai.embedding.deploymentName
      });

      console.log(`Embedding received`);
      const queryVector = embeddingResponse.data[0].embedding;

      // First try vector search with simpler query
      try {
        console.log('Trying vector search with VectorDistance function...');
        const vectorQuery = `
          SELECT c.*, VectorDistance(c.embedding, @queryVector) AS SimilarityScore
          FROM c
          WHERE IS_DEFINED(c.embedding)
          ORDER BY VectorDistance(c.embedding, @queryVector)
          OFFSET 0 LIMIT 5
        `;

        const { resources: vectorMovies } = await container.items.query({
          query: vectorQuery,
          parameters: [
            {
              name: '@queryVector',
              value: queryVector
            }
          ]
        }).fetchAll();

        if (vectorMovies.length > 0) {
          console.log('✅ Using vector search');
          return vectorMovies;
        }
      } catch (vectorError) {
        console.log('Vector search not available, trying without VectorDistance function...');
        
        // Try without vector distance function
        const simpleQuery = `SELECT * FROM c WHERE IS_DEFINED(c.embedding)`;
        const { resources: allMovies } = await container.items.query(simpleQuery).fetchAll();
        
        if (allMovies.length > 0 && allMovies[0].embedding) {
          // Calculate cosine similarity in application
          const moviesWithSimilarity = allMovies.map((movie: any) => {
            const similarity = cosineSimilarity(queryVector, movie.embedding);
            return { ...movie, SimilarityScore: similarity };
          });
          
          // Sort by similarity and return top 5
          const sortedMovies = moviesWithSimilarity
            .sort((a: any, b: any) => b.SimilarityScore - a.SimilarityScore)
            .slice(0, 5);
          
          console.log('✅ Using application-level vector similarity');
          return sortedMovies;
        }
      }

      // Fallback to keyword search if vector search completely fails
      console.log('Vector search failed, falling back to keyword search...');
      
      const query = `SELECT * FROM c`;
      const { resources: allMovies } = await container.items.query(query).fetchAll();

      // Calculate similarity scores using keyword matching
      const moviesWithScores = allMovies.map((movie: Movie) => {
        let score = 0;
        const questionLower = question.toLowerCase();
        
        // Simple keyword matching for fallback
        if (movie.title.toLowerCase().includes(questionLower)) score += 10;
        if (movie.description.toLowerCase().includes(questionLower)) score += 5;
        if (movie.genre.toLowerCase().includes(questionLower)) score += 3;
        if (movie.actors.some((actor: string) => actor.toLowerCase().includes(questionLower))) score += 7;
        if (movie.reviews.some((review: any) => review.review.toLowerCase().includes(questionLower))) score += 2;
        
        return { ...movie, score };
      });

      // Return top 5 most relevant movies
      return moviesWithScores
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .filter((movie: any) => movie.score > 0);
        
    } catch (error) {
      console.log('Search error:', error);
      throw error;
    }
  }