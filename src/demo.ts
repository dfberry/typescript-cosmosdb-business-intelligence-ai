// Demo script to show Movie AI functionality
import { config } from './utils/config.js';
import { Movie } from './utils/types.js';
import { createClients } from './utils/clients.js';
import { cosineSimilarity } from './utils/similarity.js';

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
    const { container, embedding, llm } = await createClients();
    
    // Test question
    const question = "What are some good science fiction movies with space adventures?";
    console.log(`Question: ${question}\n`);
    
    // Get question embedding
    console.log('Generating question embedding...');
    const embeddingResponse = await embedding.embeddings.create({
      input: question,
      model: config.openai.embedding.deploymentName
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
    
    const completion = await llm.chat.completions.create({
      model: config.openai.llm.deploymentName,
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



// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoMovieAI().catch(console.error);
}

export { demoMovieAI };
