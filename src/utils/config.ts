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
    llm:{
      endpoint: process.env.OPENAI_LLM_ENDPOINT  || '',
      key: process.env.OPENAI_LLM_KEY || '',
      deploymentName: process.env.OPENAI_LLM_DEPLOYMENT_NAME || 'gpt-4o',
      apiVersion: process.env.OPENAI_LLM_API_VERSION || '2024-06-01'
    },
    embedding:{
      endpoint: process.env.OPENAI_EMBEDDING_ENDPOINT || '',
      key: process.env.OPENAI_EMBEDDING_KEY || '',
      deploymentName: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002',
      apiVersion: process.env.OPENAI_EMBEDDING_API_VERSION || '2024-06-01'
    }
  }
};

export type Config = typeof config;

console.log(config);
