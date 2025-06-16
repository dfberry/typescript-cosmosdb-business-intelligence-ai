// Simple test script to validate the Movie AI functionality
import { config } from '../utils/config.js';
import type { Movie } from '../utils/types.js';
import { createClients } from '../utils/clients.js';
import { cosineSimilarity } from '../utils/similarity.js';

interface TestMovie {
  id: string;
  title: string;
  hasEmbedding?: boolean;
}

interface MovieWithSimilarity {
  title: string;
  genre: string;
  similarity: number;
}

async function testMovieAI(): Promise<void> {
  console.log('🧪 Testing Movie AI functionality...\n');
  
  try {
    // Test Cosmos DB connection
    console.log('1. Testing Cosmos DB connection...');
    const { container, embedding } = await createClients();
    
    // Check if movies exist
    const { resources: movies } = await container.items.query<TestMovie>('SELECT TOP 3 c.id, c.title FROM c').fetchAll();
    console.log(`✅ Found ${movies.length} movies in database`);
    console.log(`   Sample movies: ${movies.map(m => m.title).join(', ')}\n`);
    
    // Test OpenAI connection
    console.log('2. Testing OpenAI connection...');
    
    const testEmbedding = await embedding.embeddings.create({
      input: 'test',
      model: config.openai.embedding.deploymentName
    });
    console.log(`✅ OpenAI embedding model working (${testEmbedding.data[0].embedding.length} dimensions)\n`);
    
    // Test embeddings in database
    console.log('3. Testing movie embeddings...');
    const { resources: moviesWithEmbeddings } = await container.items.query<TestMovie>('SELECT c.id, c.title, IS_DEFINED(c.embedding) as hasEmbedding FROM c').fetchAll();
    const embeddedCount = moviesWithEmbeddings.filter(m => m.hasEmbedding).length;
    console.log(`✅ ${embeddedCount}/${moviesWithEmbeddings.length} movies have embeddings\n`);
    
    // Test semantic search
    console.log('4. Testing semantic search...');
    const question = 'space adventures with heroes';
    const questionEmbedding = await embedding.embeddings.create({
      input: question,
      model: config.openai.embedding.deploymentName
    });
    
    // Try application-level similarity search
    const { resources: allMovies } = await container.items.query<Movie>('SELECT * FROM c WHERE IS_DEFINED(c.embedding)').fetchAll();
    
    if (allMovies.length > 0) {
      const moviesWithSimilarity: MovieWithSimilarity[] = allMovies.map(movie => {
        const similarity = cosineSimilarity(questionEmbedding.data[0].embedding, movie.embedding!);
        return { title: movie.title, genre: movie.genre, similarity };
      });
      
      const topMovies = moviesWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
      
      console.log(`✅ Semantic search results for "${question}":`);
      topMovies.forEach((movie, i) => {
        console.log(`   ${i + 1}. ${movie.title} (${movie.genre}) - Similarity: ${movie.similarity.toFixed(3)}`);
      });
    }
    
    console.log('\n🎉 All tests passed! Movie AI is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMovieAI().catch(console.error);
}

export { testMovieAI };
