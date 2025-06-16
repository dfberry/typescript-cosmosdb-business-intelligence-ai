import { OpenAI } from 'openai';
import { Movie } from './types.js';
import { createClients } from './clients.js';

async function vectorizeMovie(embedding: OpenAI, embeddingModelname: string, movie: Movie): Promise<Movie> {
  // Ensure all necessary fields are present
  const movieText = [
    movie.title,
    movie.description,
    movie.genre,
    `Year: ${movie.year}`,
    `Actors: ${movie.actors?.join(', ') || 'Unknown'}`,
    movie.reviews?.map(r => r.review).join(' ') || ''
  ].filter(Boolean).join(' ');;
  const embeddingResponse = await embedding.embeddings.create({
    input: movieText,
    model: embeddingModelname,
  });
  const embeddingResult = embeddingResponse.data[0].embedding;
  const movieWithEmbedding: Movie = {
    ...movie,
    embedding: embeddingResult
  };
  return movieWithEmbedding;
}
export async function createMovieContext(movies: Movie[]): Promise<string> {

  return movies.map((movie:Movie) => 
      `Title: ${movie.title} (${movie.year})
Genre: ${movie.genre}
Actors: ${movie.actors.join(', ')}
Description: ${movie.description}
Reviews: ${movie.reviews.map((r: any) => `${r.reviewer}: ${r.review}`).join('; ')}`
    ).join('\n\n');
}

export async function upsertMovie(movie: Movie): Promise<Movie> {
  console.log(`Vectorizing movie: ${movie.title}`);

  try {
    const { embedding, container, embeddingModel} = await createClients();

    const vectoredMovie = await vectorizeMovie(embedding, embeddingModel, movie);
    const { resource: upsertedMovie } = await container.items.upsert<Movie>(vectoredMovie);

    if (!upsertedMovie) {
      throw new Error(`Failed to upsert movie: ${movie.title}`);
    }
    console.log(`Successfully vectorized and upserted movie: ${upsertedMovie.title}`);
    return upsertedMovie as Movie;
  } catch (error) {
    console.error(`Error vectorizing movie "${movie.title}":`, error);
    throw error;
  }
}

export async function vectorizeData() {
  console.log('Starting data vectorization...');

  try {
    const { container, embedding, llm } = await createClients();

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

      await Promise.all(batch.map(async (movie: Movie) => {
        try {
          // Skip if already has embedding
          if (movie.embedding && movie.embedding.length > 0) {
            console.log(`Movie "${movie.title}" already has embedding, skipping`);
            return;
          }

          console.log(`Processing movie: ${movie.title}`);
          const upsertedMovie = await upsertMovie(movie);

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
