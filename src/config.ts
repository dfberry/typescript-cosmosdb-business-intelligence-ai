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
    gptModel: 'gpt-4',
    embeddingModel: 'text-embedding-ada-002'
  }
};
