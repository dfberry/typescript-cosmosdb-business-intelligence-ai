// Test configuration script
import { config } from '../utils/config.js';

function testConfig(): void {
  console.log('🔧 Testing configuration...\n');
  
  console.log('Environment loaded:');
  console.log('Cosmos endpoint:', config.cosmosDb.endpoint);
  console.log('Cosmos database:', config.cosmosDb.databaseId);
  console.log('Cosmos container:', config.cosmosDb.containerId);
  console.log('LLM endpoint:', config.openai.llm.endpoint);
  console.log('LLM deployment name:', config.openai.llm.deploymentName);
  console.log('LLM key:', config.openai.llm.key);
  console.log('LLM api version:', config.openai.llm.apiVersion);
  console.log('Embedding endpoint:', config.openai.embedding.endpoint);
  console.log('Embedding deployment name:', config.openai.embedding.deploymentName);
  console.log('Embedding key:', config.openai.embedding.key);
  console.log('Embedding api version:', config.openai.embedding.apiVersion);

  // Check if required environment variables are set
  const requiredVars = [
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY', 
    'OPENAI_LLM_ENDPOINT',
    'OPENAI_LLM_KEY',
    'OPENAI_LLM_API_VERSION',
    'OPENAI_LLM_DEPLOYMENT_NAME',
    'OPENAI_EMBEDDING_ENDPOINT',
    'OPENAI_EMBEDDING_KEY',
    'OPENAI_EMBEDDING_API_VERSION',
    'OPENAI_EMBEDDING_DEPLOYMENT_NAME'
  ];
  
  const bicepConfigVars = [
    'COSMOS_DB_DATABASE_NAME',
    'COSMOS_DB_CONTAINER_NAME',
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
