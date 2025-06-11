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
    // Create embedding for the question using the embedding model
    const embeddingResponse = await this.openai.embeddings.create({
      input: question,
      model: 'text-embedding-ada-002'
    });

    const queryVector = embeddingResponse.data[0].embedding;

    // Vector search query using Cosmos DB
    const query = `
      SELECT TOP 5 c.id, c.title, c.description, c.genre, c.year, c.actors, c.reviews,
        VectorDistance(c.titleVector, @queryVector) as titleDistance,
        VectorDistance(c.descriptionVector, @queryVector) as descriptionDistance,
        VectorDistance(c.genreVector, @queryVector) as genreDistance,
        VectorDistance(c.actorsVector, @queryVector) as actorsDistance,
        VectorDistance(c.reviewsVector, @queryVector) as reviewsDistance
      FROM c
      ORDER BY VectorDistance(c.descriptionVector, @queryVector)
    `;

    const { resources } = await this.container.items.query({
      query,
      parameters: [{ name: '@queryVector', value: queryVector }]
    }).fetchAll();

    return resources;
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
Reviews: ${movie.reviews}`
    ).join('\n\n');

    // Generate answer using GPT
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
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
