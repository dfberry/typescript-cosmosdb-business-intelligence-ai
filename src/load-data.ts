import { CosmosClient } from '@azure/cosmos';
import { readFileSync } from 'fs';
import { config } from './config.js';
import { Movie } from './types.js';

async function loadMovieData() {
  const client = new CosmosClient({
    endpoint: config.cosmosDb.endpoint,
    key: config.cosmosDb.key
  });

  const database = client.database(config.cosmosDb.databaseId);
  const container = database.container(config.cosmosDb.containerId);

  // Read movie data from JSON file
  const movieData = JSON.parse(readFileSync('./data/movies.json', 'utf-8')) as Movie[];

  console.log(`Loading ${movieData.length} movies into Cosmos DB...`);

  for (const movie of movieData) {
    await container.items.upsert(movie);
    console.log(`✓ Loaded/Updated: ${movie.title}`);
  }

  console.log('Movie data loading complete!');
}

loadMovieData().catch(console.error);
