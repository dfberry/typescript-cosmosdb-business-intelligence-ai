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
  
  const bicepConfigVars = [
    'COSMOS_DB_DATABASE_NAME',
    'COSMOS_DB_CONTAINER_NAME',
    'OPENAI_GPT_DEPLOYMENT_NAME',
    'OPENAI_EMBEDDING_DEPLOYMENT_NAME'
  ];
  
  console.log('\n🔍 Required environment variables:');
  requiredVars.forEach(varName => {
    const isSet = process.env[varName] ? '✅' : '❌';
    console.log(`${isSet} ${varName}: ${process.env[varName] ? 'SET' : 'NOT SET'}`);
  });
  
  console.log('\n🎯 Bicep deployment configuration:');
  bicepConfigVars.forEach(varName => {
    const isSet = process.env[varName] ? '✅' : '⚠️';
    const status = process.env[varName] ? 'SET' : 'USING DEFAULT';
    console.log(`${isSet} ${varName}: ${status}`);
  });
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConfig();
}

export { testConfig };
