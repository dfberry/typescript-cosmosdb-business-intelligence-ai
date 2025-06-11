import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

export const config = {
  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT || '',
    key: process.env.COSMOS_DB_KEY || '',
    databaseId: 'MovieDB',
    containerId: 'Movies'
  },
  openai: {
    endpoint: process.env.OPENAI_ENDPOINT || '',
    key: process.env.OPENAI_KEY || '',
    gptModel: 'gpt-4o',
    embeddingModel: 'text-embedding-ada-002'
  }
};
