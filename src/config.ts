import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

export const config = {
  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT || '',
    key: process.env.COSMOS_DB_KEY || '',
    databaseId: process.env.COSMOS_DB_DATABASE_NAME || 'MovieDB',
    containerId: process.env.COSMOS_DB_CONTAINER_NAME || 'Movies'
  },
  openai: {
    endpoint: process.env.OPENAI_ENDPOINT || '',
    key: process.env.OPENAI_KEY || '',
    gptModel: process.env.OPENAI_GPT_DEPLOYMENT_NAME || 'gpt-4o',
    embeddingModel: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002'
  }
};
