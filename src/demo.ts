// Demo script to show Movie AI functionality
import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config } from './config.js';
import { Movie } from './types.js';

interface MovieWithSimilarity {
  title: string;
  year: number;
  genre: string;
  description: string;
  similarity: number;
}

async function demoMovieAI(): Promise<void> {
  console.log('🎬 Movie AI Demo\n');
  
  try {
    // Initialize clients
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key
    });
    
    const database = cosmosClient.database(config.cosmosDb.databaseId);
    const container = database.container(config.cosmosDb.containerId);
    
    const openai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: `${config.openai.endpoint}/openai/deployments/${config.openai.embeddingModel}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });
    
    // Test question
    const question = "What are some good science fiction movies with space adventures?";
    console.log(`Question: ${question}\n`);
    
    // Get question embedding
    console.log('Generating question embedding...');
    const embeddingResponse = await openai.embeddings.create({
      input: question,
      model: config.openai.embeddingModel
    });
    const queryVector = embeddingResponse.data[0].embedding;
    console.log(`✅ Generated embedding (${queryVector.length} dimensions)\n`);
    
    // Get movies with embeddings
    console.log('Searching movies...');
    const { resources: movies } = await container.items.query<Movie>('SELECT * FROM c WHERE IS_DEFINED(c.embedding)').fetchAll();
    console.log(`Found ${movies.length} movies with embeddings\n`);
    
    // Calculate similarities
    const moviesWithSimilarity: MovieWithSimilarity[] = movies.map(movie => {
      const similarity = cosineSimilarity(queryVector, movie.embedding!);
      return {
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        description: movie.description,
        similarity: similarity
      };
    });
    
    // Get top 3 most similar movies
    const topMovies = moviesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    console.log('🔍 Most relevant movies:');
    topMovies.forEach((movie, i) => {
      console.log(`\n${i + 1}. ${movie.title} (${movie.year})`);
      console.log(`   Genre: ${movie.genre}`);
      console.log(`   Similarity: ${(movie.similarity * 100).toFixed(1)}%`);
      console.log(`   Description: ${movie.description.substring(0, 100)}...`);
    });
    
    // Generate AI response
    console.log('\n🤖 Generating AI response...');
    const context = topMovies.map(movie => 
      `${movie.title} (${movie.year}) - ${movie.genre}: ${movie.description}`
    ).join('\n\n');
    
    const gptOpenai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: `${config.openai.endpoint}/openai/deployments/${config.openai.gptModel}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });
    
    const completion = await gptOpenai.chat.completions.create({
      model: config.openai.gptModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful movie assistant. Answer questions about movies based on the provided context.'
        },
        {
          role: 'user',
          content: `Based on these movies, ${question}\n\nMovies:\n${context}`
        }
      ]
    });
    
    console.log('\n💬 AI Response:');
    console.log(completion.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Helper function for cosine similarity
function cosineSimilarity(vec1: number[], vec2: number[]): number {
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

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoMovieAI().catch(console.error);
}

export { demoMovieAI };
