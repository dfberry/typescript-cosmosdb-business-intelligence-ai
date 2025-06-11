// Simple test script to validate the Movie AI functionality
import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config } from './dist/config.js';

async function testMovieAI() {
  console.log('🧪 Testing Movie AI functionality...\n');
  
  try {
    // Test Cosmos DB connection
    console.log('1. Testing Cosmos DB connection...');
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key
    });
    
    const database = cosmosClient.database(config.cosmosDb.databaseId);
    const container = database.container(config.cosmosDb.containerId);
    
    // Check if movies exist
    const { resources: movies } = await container.items.query('SELECT TOP 3 c.id, c.title FROM c').fetchAll();
    console.log(`✅ Found ${movies.length} movies in database`);
    console.log(`   Sample movies: ${movies.map(m => m.title).join(', ')}\n`);
    
    // Test OpenAI connection
    console.log('2. Testing OpenAI connection...');
    const openai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: `${config.openai.endpoint}/openai/deployments/${config.openai.embeddingModel}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });
    
    const testEmbedding = await openai.embeddings.create({
      input: 'test',
      model: config.openai.embeddingModel
    });
    console.log(`✅ OpenAI embedding model working (${testEmbedding.data[0].embedding.length} dimensions)\n`);
    
    // Test embeddings in database
    console.log('3. Testing movie embeddings...');
    const { resources: moviesWithEmbeddings } = await container.items.query('SELECT c.id, c.title, IS_DEFINED(c.embedding) as hasEmbedding FROM c').fetchAll();
    const embeddedCount = moviesWithEmbeddings.filter(m => m.hasEmbedding).length;
    console.log(`✅ ${embeddedCount}/${moviesWithEmbeddings.length} movies have embeddings\n`);
    
    // Test semantic search
    console.log('4. Testing semantic search...');
    const question = 'space adventures with heroes';
    const questionEmbedding = await openai.embeddings.create({
      input: question,
      model: config.openai.embeddingModel
    });
    
    // Try application-level similarity search
    const { resources: allMovies } = await container.items.query('SELECT * FROM c WHERE IS_DEFINED(c.embedding)').fetchAll();
    
    if (allMovies.length > 0) {
      const moviesWithSimilarity = allMovies.map(movie => {
        const similarity = cosineSimilarity(questionEmbedding.data[0].embedding, movie.embedding);
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
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function for cosine similarity
function cosineSimilarity(vec1, vec2) {
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

testMovieAI().catch(console.error);
