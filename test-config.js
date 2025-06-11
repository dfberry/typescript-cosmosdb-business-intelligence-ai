import { config } from './src/config.js';

console.log('Environment loaded:');
console.log('Cosmos endpoint:', config.cosmosDb.endpoint);
console.log('OpenAI endpoint:', config.openai.endpoint);
console.log('GPT model:', config.openai.gptModel);
console.log('Embedding model:', config.openai.embeddingModel);
