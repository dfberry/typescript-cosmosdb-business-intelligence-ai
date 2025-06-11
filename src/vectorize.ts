import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config } from './config.js';
import { Movie } from './types.js';

async function vectorizeData() {
  console.log('Starting data vectorization...');
  
  try {
    // Initialize Azure Cosmos DB client
    const cosmosClient = new CosmosClient({ 
      endpoint: config.cosmosDb.endpoint, 
      key: config.cosmosDb.key 
    });
    
    const database = cosmosClient.database(config.cosmosDb.databaseId);
    const container = database.container(config.cosmosDb.containerId);
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: config.openai.key,
      baseURL: `${config.openai.endpoint}/openai/deployments/${config.openai.embeddingModel}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: {
        'api-key': config.openai.key,
      },
    });
    
    // Fetch all movies from Cosmos DB
    const { resources: movies } = await container.items
      .query<Movie>('SELECT * FROM c')
      .fetchAll();
    
    console.log(`Found ${movies.length} movies to vectorize`);
    
    // Process movies in batches to avoid rate limits
    const batchSize = 5;
    let processedCount = 0;
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (movie) => {
        try {
          // Skip if already has embedding
          if (movie.embedding && movie.embedding.length > 0) {
            console.log(`Movie "${movie.title}" already has embedding, skipping`);
            return;
          }
          
          // Create text representation of the movie for embedding
          const movieText = [
            movie.title,
            movie.description,
            movie.genre,
            `Year: ${movie.year}`,
            `Actors: ${movie.actors?.join(', ') || 'Unknown'}`,
            movie.reviews?.map(r => r.review).join(' ') || ''
          ].filter(Boolean).join(' ');
          
          console.log(`Generating embedding for: ${movie.title}`);
          
          // Generate embedding using Azure OpenAI
          const embeddingResponse = await openai.embeddings.create({
            input: movieText,
            model: config.openai.embeddingModel,
          });
          
          const embedding = embeddingResponse.data[0].embedding;
          
          // Update the movie with embedding
          const updatedMovie: Movie = {
            ...movie,
            embedding: embedding
          };
          
          // Replace the document in Cosmos DB
          await container.item(movie.id, movie.id).replace(updatedMovie);
          
          processedCount++;
          console.log(`✓ Processed ${movie.title} (${processedCount}/${movies.length})`);
          
        } catch (error) {
          console.error(`Failed to process movie "${movie.title}":`, error);
        }
      }));
      
      // Add a small delay between batches
      if (i + batchSize < movies.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Vectorization complete! Processed ${processedCount} movies.`);
    console.log('Movies now have embeddings for semantic search.');
    
  } catch (error) {
    console.error('Error during vectorization:', error);
    throw error;
  }
}

vectorizeData().catch(console.error);
