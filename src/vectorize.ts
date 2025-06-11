import { CosmosClient } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { config } from './config.js';
import { Movie } from './types.js';

async function vectorizeData() {
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosDb.endpoint,
    key: config.cosmosDb.key
  });

  const openai = new OpenAI({
    apiKey: config.openai.key,
    baseURL: `${config.openai.endpoint}openai/deployments/${config.openai.embeddingModel}`,
    defaultQuery: { 'api-version': '2024-02-01' },
    defaultHeaders: {
      'api-key': config.openai.key,
    },
  });

  const database = cosmosClient.database(config.cosmosDb.databaseId);
  const container = database.container(config.cosmosDb.containerId);

  console.log('Starting vectorization process...');

  // Get all movies
  const { resources: movies } = await container.items.readAll<Movie>().fetchAll();

  for (const movie of movies) {
    console.log(`Vectorizing: ${movie.title}`);

    // Create embeddings for each field
    const titleEmbedding = await openai.embeddings.create({
      input: movie.title,
      model: 'text-embedding-ada-002'
    });

    const descriptionEmbedding = await openai.embeddings.create({
      input: movie.description,
      model: 'text-embedding-ada-002'
    });

    const genreEmbedding = await openai.embeddings.create({
      input: movie.genre,
      model: 'text-embedding-ada-002'
    });

    const yearEmbedding = await openai.embeddings.create({
      input: movie.year.toString(),
      model: 'text-embedding-ada-002'
    });

    const actorsEmbedding = await openai.embeddings.create({
      input: movie.actors.join(', '),
      model: 'text-embedding-ada-002'
    });

    const reviewsEmbedding = await openai.embeddings.create({
      input: movie.reviews,
      model: 'text-embedding-ada-002'
    });

    // Update movie with vectors
    const updatedMovie = {
      ...movie,
      titleVector: titleEmbedding.data[0].embedding,
      descriptionVector: descriptionEmbedding.data[0].embedding,
      genreVector: genreEmbedding.data[0].embedding,
      yearVector: yearEmbedding.data[0].embedding,
      actorsVector: actorsEmbedding.data[0].embedding,
      reviewsVector: reviewsEmbedding.data[0].embedding
    };

    await container.item(movie.id, movie.id).replace(updatedMovie);
    console.log(`Vectorized: ${movie.title}`);
  }

  console.log('Vectorization complete!');
}

vectorizeData().catch(console.error);
