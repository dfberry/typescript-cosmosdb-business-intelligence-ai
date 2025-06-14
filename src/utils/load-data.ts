import { readFileSync } from 'fs';
import { Movie } from './types.js';
import { createClients } from './clients.js';

export async function loadMovieData() {
  const { container } = await createClients();

  // Read movie data from JSON file
  const movieData = JSON.parse(readFileSync('./data/movies.json', 'utf-8')) as Movie[];

  console.log(`Loading ${movieData.length} movies into Cosmos DB...`);

  for (const movie of movieData) {
    await container.items.upsert(movie);
    console.log(`✓ Loaded/Updated: ${movie.title}`);
  }

  console.log('Movie data loading complete!');
}
