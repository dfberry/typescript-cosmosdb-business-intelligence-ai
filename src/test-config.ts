// Test configuration script
import { config } from './config.js';

function testConfig(): void {
  console.log('🔧 Testing configuration...\n');
  
  console.log('Environment loaded:');
  console.log('Cosmos endpoint:', config.cosmosDb.endpoint);
  console.log('Cosmos database:', config.cosmosDb.databaseId);
  console.log('Cosmos container:', config.cosmosDb.containerId);
  console.log('OpenAI endpoint:', config.openai.endpoint);
  console.log('GPT model:', config.openai.gptModel);
  console.log('Embedding model:', config.openai.embeddingModel);
  
  // Check if required environment variables are set
  const requiredVars = [
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY', 
    'OPENAI_ENDPOINT',
    'OPENAI_KEY'
  ];
  
  console.log('\n🔍 Environment variables check:');
  requiredVars.forEach(varName => {
    const isSet = process.env[varName] ? '✅' : '❌';
    console.log(`${isSet} ${varName}: ${process.env[varName] ? 'SET' : 'NOT SET'}`);
  });
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConfig();
}

export { testConfig };
