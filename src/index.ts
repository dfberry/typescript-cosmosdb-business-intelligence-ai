import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { createInterface } from 'readline';
import { config } from './config.js';
import { Movie } from './types.js';

class MovieAI {
  private cosmosClient: CosmosClient;
  private openai: OpenAI;
  private container: any;

  constructor() {
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key
    });

    this.openai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: config.openai.endpoint,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });

    const database = this.cosmosClient.database(config.cosmosDb.databaseId);
    this.container = database.container(config.cosmosDb.containerId);
  }

  async searchMovies(question: string): Promise<Movie[]> {
    try {
      // Create embedding for the question using the embedding model
      const embeddingResponse = await this.openai.embeddings.create({
        input: question,
        model: config.openai.embeddingModel
      });

      const queryVector = embeddingResponse.data[0].embedding;

      // First try vector search with simpler query
      try {
        const vectorQuery = `
          SELECT c.*, VectorDistance(c.embedding, @queryVector) AS SimilarityScore
          FROM c
          WHERE IS_DEFINED(c.embedding)
          ORDER BY VectorDistance(c.embedding, @queryVector)
          OFFSET 0 LIMIT 5
        `;

        const { resources: vectorMovies } = await this.container.items.query({
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
        const { resources: allMovies } = await this.container.items.query(simpleQuery).fetchAll();
        
        if (allMovies.length > 0 && allMovies[0].embedding) {
          // Calculate cosine similarity in application
          const moviesWithSimilarity = allMovies.map((movie: any) => {
            const similarity = this.cosineSimilarity(queryVector, movie.embedding);
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
      const { resources: allMovies } = await this.container.items.query(query).fetchAll();

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

  // Helper function to calculate cosine similarity
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
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

  async answerQuestion(question: string): Promise<string> {
    // Get relevant movies using vector search
    const relevantMovies = await this.searchMovies(question);

    // Create context from search results
    const context = relevantMovies.map(movie => 
      `Title: ${movie.title} (${movie.year})
Genre: ${movie.genre}
Actors: ${movie.actors.join(', ')}
Description: ${movie.description}
Reviews: ${movie.reviews.map((r: any) => `${r.reviewer}: ${r.review}`).join('; ')}`
    ).join('\n\n');

    // Generate answer using GPT
    const completion = await this.openai.chat.completions.create({
      model: config.openai.gptModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions about movies. Use the provided movie data to answer questions accurately and concisely.'
        },
        {
          role: 'user',
          content: `Based on the following movie data, please answer this question: ${question}

Movie Data:
${context}`
        }
      ]
    });

    return completion.choices[0].message.content || 'Sorry, I could not generate an answer.';
  }

  async startConversation() {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🎬 Welcome to Movie AI! Ask me anything about movies.');
    console.log('Type "exit" to quit.\n');

    const askQuestion = () => {
      rl.question('Ask me about movies: ', async (question: string) => {
        if (question.toLowerCase() === 'exit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }

        try {
          console.log('\nThinking...\n');
          const answer = await this.answerQuestion(question);
          console.log(`🤖 ${answer}\n`);
        } catch (error) {
          console.log('Sorry, there was an error processing your question.\n');
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

// Start the application
async function main() {
  const movieAI = new MovieAI();
  await movieAI.startConversation();
}

main().catch(console.error);
