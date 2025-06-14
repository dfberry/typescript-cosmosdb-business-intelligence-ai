import type { Container } from '@azure/cosmos';
import { OpenAI } from 'openai';
import { createInterface } from 'readline';
import { config } from './utils/config.js';
import { createClients } from './utils/clients.js';
import { getEmbeddings } from './utils/query.js';
import { createMovieContext } from './utils/vectorize.js';
import type { Movie } from './utils/types.js';
import { cosineSimilarity as similarity } from './utils/similarity.js';

class MovieAI {
  private container: Container|undefined=undefined;
  private llm: OpenAI|undefined=undefined;
  private embedding: OpenAI|undefined=undefined;

  constructor() {

  }

  async init(){
    const { llm, embedding, container } = await createClients();

    this.container = container;
    this.embedding = embedding;
    this.llm = llm;
  }

  async searchMovies(query: string): Promise<Movie[]> {

    if (!this.container || !this.llm || !this.embedding) {
      throw new Error('MovieAI not initialized. Call init() first.');
    }

    return await getEmbeddings(config, this.container, this.llm, this.embedding, query);
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    return similarity(vecA, vecB);
  }

  async answerQuestion(question: string): Promise<string> {

    if (!this.container || !this.llm || !this.embedding) {
      throw new Error('MovieAI not initialized. Call init() first.');
    }

    // Get relevant movies using vector search
    const relevantMovies = await this.searchMovies(question);

    // Create context from search results
    const context = await createMovieContext(relevantMovies);

    // Generate answer using GPT
    const completion = await this.llm.chat.completions.create({
      model: config.openai.llm.deploymentName,
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

// Export the class for testing
export { MovieAI };

// Start the application
async function main() {
  const movieAI = new MovieAI();
  await movieAI.init();
  await movieAI.startConversation();
}

main().catch(console.error);
