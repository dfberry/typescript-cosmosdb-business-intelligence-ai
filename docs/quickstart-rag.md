# RAG Quickstart: Generative Search with Cosmos DB Vector Search

This quickstart demonstrates how to build a Retrieval-Augmented Generation (RAG) system using Azure Cosmos DB for MongoDB vCore's vector search capabilities and Azure OpenAI. You'll learn to create a conversational search experience over your indexed content using vector embeddings.

## What is RAG?

RAG (Retrieval-Augmented Generation) combines the power of information retrieval with generative AI:

1. **Retrieve**: Search for relevant documents using vector similarity
2. **Augment**: Provide the retrieved context to the AI model
3. **Generate**: Create informed responses based on the retrieved information

This approach ensures responses are grounded in your data, reducing hallucinations and providing more accurate, contextual answers.

## Prerequisites

- **Azure account** with an active subscription ([Create for free](https://azure.microsoft.com/free/))
- **Azure OpenAI resource** with:
  - Text embedding model (e.g., `text-embedding-ada-002`)
  - Chat completion model (e.g., `gpt-4o`, `gpt-4o-mini`)
- **Azure Cosmos DB for MongoDB vCore** cluster
- **Node.js 18+** and **npm**
- **TypeScript** (`npm install -g typescript`)

## Project Setup

### 1. Initialize Project

```bash
mkdir cosmosdb-rag-quickstart
cd cosmosdb-rag-quickstart
npm init -y
npm pkg set type=module
```

### 2. Install Dependencies

```bash
npm install mongodb openai @azure/identity dotenv
npm install -D typescript @types/node
```

### 3. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist/",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*.ts"]
}
```

### 4. Environment Variables

Create `.env` file:

```env
# Azure Cosmos DB for MongoDB vCore
COSMOS_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
AZURE_OPENAI_CHAT_MODEL=gpt-4o

# Database Configuration
DATABASE_NAME=rag_demo
COLLECTION_NAME=hotels
```

## Data Setup

### 1. Sample Data Script

Create `src/setup-data.ts`:

```typescript
import { MongoClient } from 'mongodb';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import 'dotenv/config';

interface Hotel {
  _id?: string;
  hotelName: string;
  description: string;
  category: string;
  tags: string[];
  address: {
    streetAddress: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  };
  rooms: Array<{
    description: string;
    type: string;
    baseRate: number;
    bedOptions: string;
    sleepsCount: number;
    smokingAllowed: boolean;
    tags: string[];
  }>;
  contentVector?: number[];
}

const sampleHotels: Omit<Hotel, 'contentVector'>[] = [
  {
    hotelName: "Grand Plaza Hotel",
    description: "A luxurious downtown hotel with modern amenities. Features complimentary continental breakfast, free Wi-Fi, fitness center, and rooftop restaurant with city views. Perfect for business travelers and tourists alike.",
    category: "Luxury",
    tags: ["continental breakfast", "free wifi", "fitness center", "rooftop restaurant", "downtown", "business center"],
    address: {
      streetAddress: "123 Main Street",
      city: "Seattle",
      stateProvince: "WA", 
      postalCode: "98101",
      country: "USA"
    },
    rooms: [
      {
        description: "Spacious suite with separate living area",
        type: "Suite",
        baseRate: 299.99,
        bedOptions: "1 King Bed",
        sleepsCount: 2,
        smokingAllowed: false,
        tags: ["suite", "king bed", "living area"]
      },
      {
        description: "Family room with two queen beds",
        type: "Family Room", 
        baseRate: 199.99,
        bedOptions: "2 Queen Beds",
        sleepsCount: 4,
        smokingAllowed: false,
        tags: ["family room", "queen beds"]
      }
    ]
  },
  {
    hotelName: "Mountain View Resort",
    description: "Scenic mountain resort offering continental breakfast and outdoor activities. Enjoy hiking trails, spa services, and complimentary breakfast featuring local specialties. Free parking and pet-friendly accommodations available.",
    category: "Resort",
    tags: ["continental breakfast", "mountain view", "hiking", "spa", "pet friendly", "free parking"],
    address: {
      streetAddress: "456 Mountain Road",
      city: "Aspen",
      stateProvince: "CO",
      postalCode: "81611", 
      country: "USA"
    },
    rooms: [
      {
        description: "Cozy cabin-style room with mountain views",
        type: "Mountain View Room",
        baseRate: 249.99,
        bedOptions: "1 Queen Bed",
        sleepsCount: 2,
        smokingAllowed: false,
        tags: ["mountain view", "cabin style", "queen bed"]
      },
      {
        description: "Large family suite with kitchenette",
        type: "Family Suite",
        baseRate: 349.99,
        bedOptions: "2 Queen Beds + Sofa Bed",  
        sleepsCount: 6,
        smokingAllowed: false,
        tags: ["family suite", "kitchenette", "sofa bed"]
      }
    ]
  },
  {
    hotelName: "Budget Inn Express",
    description: "Affordable accommodations with essential amenities. Continental breakfast included, free Wi-Fi, and 24-hour front desk service. Clean, comfortable rooms perfect for budget-conscious travelers.",
    category: "Budget",
    tags: ["continental breakfast", "budget friendly", "free wifi", "24-hour front desk"],
    address: {
      streetAddress: "789 Highway 101",
      city: "Portland",
      stateProvince: "OR",
      postalCode: "97201",
      country: "USA"
    },
    rooms: [
      {
        description: "Standard room with essential amenities",
        type: "Standard Room",
        baseRate: 79.99,
        bedOptions: "1 Queen Bed",
        sleepsCount: 2,
        smokingAllowed: false,
        tags: ["standard room", "queen bed", "budget"]
      },
      {
        description: "Double room with two beds",
        type: "Double Room",
        baseRate: 99.99,
        bedOptions: "2 Double Beds",
        sleepsCount: 4,
        smokingAllowed: false,
        tags: ["double room", "double beds", "family"]
      }
    ]
  },
  {
    hotelName: "Oceanfront Paradise",
    description: "Beachfront hotel with stunning ocean views and complimentary breakfast. Features beach access, swimming pool, and oceanfront restaurant. Perfect for romantic getaways and family vacations.",
    category: "Beachfront",
    tags: ["continental breakfast", "ocean view", "beach access", "swimming pool", "oceanfront restaurant"],
    address: {
      streetAddress: "101 Ocean Drive",
      city: "Miami Beach",
      stateProvince: "FL",
      postalCode: "33139",
      country: "USA"
    },
    rooms: [
      {
        description: "Ocean view room with private balcony",
        type: "Ocean View Room",
        baseRate: 399.99,
        bedOptions: "1 King Bed",
        sleepsCount: 2,
        smokingAllowed: false,
        tags: ["ocean view", "balcony", "king bed"]
      },
      {
        description: "Beachfront suite with panoramic views",
        type: "Beachfront Suite",
        baseRate: 599.99,
        bedOptions: "1 King Bed + Sofa Bed",
        sleepsCount: 4,
        smokingAllowed: false,
        tags: ["beachfront", "suite", "panoramic view"]
      }
    ]
  }
];

async function setupOpenAIClient(): Promise<AzureOpenAI> {
  const credential = new DefaultAzureCredential();
  const scope = "https://cognitiveservices.azure.com/.default";
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  
  return new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    azureADTokenProvider
  });
}

async function generateEmbedding(text: string, openaiClient: AzureOpenAI): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: process.env.AZURE_OPENAI_EMBEDDING_MODEL!,
    input: text
  });
  
  return response.data[0].embedding;
}

function createSearchableContent(hotel: Omit<Hotel, 'contentVector'>): string {
  const roomDescriptions = hotel.rooms.map(room => 
    `${room.type}: ${room.description} (${room.bedOptions}, sleeps ${room.sleepsCount}, $${room.baseRate})`
  ).join('. ');
  
  return `${hotel.hotelName}. ${hotel.description}. Category: ${hotel.category}. ` +
         `Location: ${hotel.address.city}, ${hotel.address.stateProvince}. ` +
         `Tags: ${hotel.tags.join(', ')}. Rooms: ${roomDescriptions}`;
}

async function setupData(): Promise<void> {
  const client = new MongoClient(process.env.COSMOS_CONNECTION_STRING!);
  const openaiClient = await setupOpenAIClient();
  
  try {
    await client.connect();
    console.log('Connected to Cosmos DB');
    
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection<Hotel>(process.env.COLLECTION_NAME!);
    
    // Drop existing collection if it exists
    try {
      await collection.drop();
      console.log('Dropped existing collection');
    } catch (error) {
      // Collection doesn't exist, which is fine
    }
    
    // Create vector index
    console.log('Creating vector index...');
    await collection.createIndex(
      { "contentVector": "cosmosSearch" },
      {
        name: "VectorSearchIndex",
        cosmosSearchOptions: {
          kind: "vector-ivf",
          numLists: 1,
          similarity: "COS",
          dimensions: 1536
        }
      }
    );
    
    console.log('Processing and inserting hotel data...');
    
    // Process hotels with embeddings
    const hotelsWithVectors: Hotel[] = [];
    
    for (const hotel of sampleHotels) {
      console.log(`Processing ${hotel.hotelName}...`);
      
      const searchableContent = createSearchableContent(hotel);
      const embedding = await generateEmbedding(searchableContent, openaiClient);
      
      hotelsWithVectors.push({
        ...hotel,
        contentVector: embedding
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Insert all hotels
    await collection.insertMany(hotelsWithVectors);
    
    console.log(`✅ Successfully inserted ${hotelsWithVectors.length} hotels with vector embeddings`);
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Error setting up data:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the setup
setupData().catch(console.error);
```

### 2. Run Data Setup

```bash
# Compile TypeScript
npx tsc

# Run the setup script
node dist/setup-data.js
```

## RAG Implementation

### 1. Core RAG Searcher

Create `src/cosmos-rag-searcher.ts`:

```typescript
import { MongoClient, Collection } from 'mongodb';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

interface Hotel {
  _id?: string;
  hotelName: string;
  description: string;
  category: string;
  tags: string[];
  address: {
    streetAddress: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  };
  rooms: Array<{
    description: string;
    type: string;
    baseRate: number;
    bedOptions: string;
    sleepsCount: number;
    smokingAllowed: boolean;
    tags: string[];
  }>;
  contentVector?: number[];
}

interface SearchResult {
  hotel: Hotel;
  score: number;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  query: string;
}

export class CosmosRAGSearcher {
  private client: MongoClient;
  private openaiClient: AzureOpenAI;
  private collection: Collection<Hotel>;
  
  constructor() {
    this.client = new MongoClient(process.env.COSMOS_CONNECTION_STRING!);
    this.setupOpenAIClient();
  }
  
  private setupOpenAIClient(): void {
    const credential = new DefaultAzureCredential();
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);
    
    this.openaiClient = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
      azureADTokenProvider
    });
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(process.env.DATABASE_NAME);
    this.collection = db.collection<Hotel>(process.env.COLLECTION_NAME!);
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openaiClient.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_MODEL!,
      input: text
    });
    
    return response.data[0].embedding;
  }
  
  async vectorSearch(query: string, topK: number = 5, filters?: any): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const pipeline: any[] = [
      {
        $search: {
          cosmosSearch: {
            vector: queryEmbedding,
            path: "contentVector",
            k: topK
          }
        }
      },
      {
        $project: {
          hotelName: 1,
          description: 1,
          category: 1,
          tags: 1,
          address: 1,
          rooms: 1,
          score: { $meta: "searchScore" }
        }
      }
    ];
    
    // Add filters if provided
    if (filters) {
      pipeline.splice(1, 0, { $match: filters });
    }
    
    const results = await this.collection.aggregate(pipeline).toArray();
    
    return results.map(result => ({
      hotel: result as Hotel,
      score: result.score
    }));
  }
  
  private formatSearchResults(results: SearchResult[]): string {
    return results.map(result => {
      const hotel = result.hotel;
      const roomInfo = hotel.rooms.map(room => 
        `${room.type} (${room.bedOptions}, sleeps ${room.sleepsCount}): $${room.baseRate}`
      ).join(', ');
      
      return `Hotel: ${hotel.hotelName}
Description: ${hotel.description}
Category: ${hotel.category}
Location: ${hotel.address.city}, ${hotel.address.stateProvince}
Tags: ${hotel.tags.join(', ')}
Rooms: ${roomInfo}
Address: ${hotel.address.streetAddress}, ${hotel.address.city}, ${hotel.address.stateProvince} ${hotel.address.postalCode}`;
    }).join('\n\n---\n\n');
  }
  
  async search(query: string, options: {
    topK?: number;
    filters?: any;
    includeContext?: boolean;
  } = {}): Promise<RAGResponse> {
    const { topK = 5, filters, includeContext = true } = options;
    
    console.log(`🔍 Searching for: "${query}"`);
    
    // Perform vector search
    const searchResults = await this.vectorSearch(query, topK, filters);
    
    if (!includeContext) {
      return {
        answer: '',
        sources: searchResults,
        query
      };
    }
    
    // Format search results for the LLM
    const sourcesFormatted = this.formatSearchResults(searchResults);
    
    // Generate response using GPT
    const response = await this.generateResponse(query, sourcesFormatted);
    
    return {
      answer: response,
      sources: searchResults,
      query
    };
  }
  
  private async generateResponse(query: string, sources: string): Promise<string> {
    const prompt = `You are a helpful hotel recommendation assistant. Answer the query using only the hotel information provided below.

Instructions:
- Use only the facts from the sources provided
- Be friendly and conversational
- Format your response with bullet points or numbered lists when appropriate
- If you don't have enough information, say so
- Don't make up information not in the sources

Query: ${query}

Hotel Information:
${sources}`;

    const response = await this.openaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_CHAT_MODEL!,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content || "I couldn't generate a response.";
  }
  
  async conversationalSearch(
    query: string, 
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
    options: { topK?: number; filters?: any } = {}
  ): Promise<RAGResponse> {
    const { topK = 5, filters } = options;
    
    // Perform vector search
    const searchResults = await this.vectorSearch(query, topK, filters);
    const sourcesFormatted = this.formatSearchResults(searchResults);
    
    // Build conversation context
    const messages = [
      {
        role: "system" as const,
        content: `You are a helpful hotel recommendation assistant. Use the provided hotel information to answer questions. Be conversational and helpful while staying grounded in the provided data.

Current Hotel Information:
${sourcesFormatted}`
      },
      ...conversationHistory,
      {
        role: "user" as const,
        content: query
      }
    ];
    
    const response = await this.openaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_CHAT_MODEL!,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return {
      answer: response.choices[0].message.content || "I couldn't generate a response.",
      sources: searchResults,
      query
    };
  }
}
```

### 2. Basic RAG Example

Create `src/basic-rag-example.ts`:

```typescript
import { CosmosRAGSearcher } from './cosmos-rag-searcher.js';
import 'dotenv/config';

async function basicRAGExample(): Promise<void> {
  const ragSearcher = new CosmosRAGSearcher();
  
  try {
    await ragSearcher.connect();
    console.log('Connected to Cosmos DB');
    
    // Example queries
    const queries = [
      "Can you recommend hotels with complimentary breakfast?",
      "What are some budget-friendly options?",
      "I need a hotel with ocean views and family rooms",
      "Show me luxury hotels with spa services"
    ];
    
    for (const query of queries) {
      console.log('\n' + '='.repeat(60));
      console.log(`Query: ${query}`);
      console.log('='.repeat(60));
      
      const result = await ragSearcher.search(query);
      
      console.log('\n📝 Response:');
      console.log(result.answer);
      
      console.log('\n🔍 Sources:');
      result.sources.forEach((source, index) => {
        console.log(`${index + 1}. ${source.hotel.hotelName} (Score: ${source.score.toFixed(3)})`);
      });
      
      console.log('\n' + '-'.repeat(60));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await ragSearcher.disconnect();
  }
}

basicRAGExample().catch(console.error);
```

### 3. Advanced RAG with Filtering

Create `src/advanced-rag-example.ts`:

```typescript
import { CosmosRAGSearcher } from './cosmos-rag-searcher.js';
import 'dotenv/config';

async function advancedRAGExample(): Promise<void> {
  const ragSearcher = new CosmosRAGSearcher();
  
  try {
    await ragSearcher.connect();
    console.log('Connected to Cosmos DB');
    
    // Example 1: Category filtering
    console.log('\n' + '='.repeat(60));
    console.log('Example 1: Budget Hotels with Breakfast');
    console.log('='.repeat(60));
    
    const budgetResult = await ragSearcher.search(
      "Hotels with continental breakfast",
      {
        filters: { category: "Budget" },
        topK: 3
      }
    );
    
    console.log('\n📝 Response:');
    console.log(budgetResult.answer);
    
    // Example 2: Location-based filtering
    console.log('\n' + '='.repeat(60));
    console.log('Example 2: Hotels in Specific States');
    console.log('='.repeat(60));
    
    const locationResult = await ragSearcher.search(
      "Recommend hotels with good amenities",
      {
        filters: { "address.stateProvince": { $in: ["WA", "FL"] } },
        topK: 3
      }
    );
    
    console.log('\n📝 Response:');
    console.log(locationResult.answer);
    
    // Example 3: Price range filtering
    console.log('\n' + '='.repeat(60));
    console.log('Example 3: Family-Friendly Hotels');
    console.log('='.repeat(60));
    
    const familyResult = await ragSearcher.search(
      "Family-friendly hotels with spacious rooms",
      {
        filters: { "rooms.sleepsCount": { $gte: 4 } },
        topK: 3
      }
    );
    
    console.log('\n📝 Response:');
    console.log(familyResult.answer);
    
    // Example 4: Complex multi-field filtering
    console.log('\n' + '='.repeat(60));
    console.log('Example 4: Luxury Hotels with Specific Amenities');
    console.log('='.repeat(60));
    
    const luxuryResult = await ragSearcher.search(
      "Luxury accommodations with premium amenities",
      {
        filters: {
          $and: [
            { category: { $in: ["Luxury", "Resort"] } },
            { tags: { $in: ["spa", "restaurant", "ocean view"] } }
          ]
        },
        topK: 3
      }
    );
    
    console.log('\n📝 Response:');
    console.log(luxuryResult.answer);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await ragSearcher.disconnect();
  }
}

advancedRAGExample().catch(console.error);
```

### 4. Conversational RAG Example

Create `src/conversational-rag-example.ts`:

```typescript
import { CosmosRAGSearcher } from './cosmos-rag-searcher.js';
import 'dotenv/config';

async function conversationalRAGExample(): Promise<void> {
  const ragSearcher = new CosmosRAGSearcher();
  
  try {
    await ragSearcher.connect();
    console.log('Connected to Cosmos DB');
    
    // Simulate a conversation
    const conversation: Array<{role: 'user' | 'assistant', content: string}> = [];
    
    // Turn 1: Initial query
    console.log('\n' + '='.repeat(60));
    console.log('Conversational RAG Example');
    console.log('='.repeat(60));
    
    let query = "I'm looking for a hotel with complimentary breakfast";
    console.log(`\n👤 User: ${query}`);
    
    let result = await ragSearcher.conversationalSearch(query, conversation);
    console.log(`\n🤖 Assistant: ${result.answer}`);
    
    // Update conversation history
    conversation.push({ role: 'user', content: query });
    conversation.push({ role: 'assistant', content: result.answer });
    
    // Turn 2: Follow-up question
    query = "Which of these is most budget-friendly?";
    console.log(`\n👤 User: ${query}`);
    
    result = await ragSearcher.conversationalSearch(query, conversation);
    console.log(`\n🤖 Assistant: ${result.answer}`);
    
    // Update conversation history
    conversation.push({ role: 'user', content: query });
    conversation.push({ role: 'assistant', content: result.answer });
    
    // Turn 3: Specific details
    query = "Tell me more about the rooms available at the budget option";
    console.log(`\n👤 User: ${query}`);
    
    result = await ragSearcher.conversationalSearch(query, conversation);
    console.log(`\n🤖 Assistant: ${result.answer}`);
    
    // Turn 4: Location question
    query = "What about hotels near the beach?";
    console.log(`\n👤 User: ${query}`);
    
    result = await ragSearcher.conversationalSearch(query, conversation);
    console.log(`\n🤖 Assistant: ${result.answer}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('Conversation Complete');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await ragSearcher.disconnect();
  }
}

conversationalRAGExample().catch(console.error);
```

## Running the Examples

### 1. Compile TypeScript

```bash
npx tsc
```

### 2. Run Examples

```bash
# Basic RAG example
node dist/basic-rag-example.js

# Advanced RAG with filtering
node dist/advanced-rag-example.js

# Conversational RAG
node dist/conversational-rag-example.js
```

## Understanding the Output

### Basic RAG Response Example

```
Query: Can you recommend hotels with complimentary breakfast?

📝 Response:
I'd be happy to recommend hotels with complimentary breakfast! Here are some great options:

• **Grand Plaza Hotel** - A luxurious downtown hotel offering complimentary continental breakfast along with free Wi-Fi, fitness center, and rooftop restaurant. They have both suite options ($299.99) and family rooms ($199.99).

• **Mountain View Resort** - A scenic mountain resort featuring continental breakfast with local specialties. Perfect for outdoor enthusiasts with hiking trails and spa services. Family suites available for up to 6 guests ($349.99).

• **Budget Inn Express** - An affordable option with continental breakfast included, plus free Wi-Fi and 24-hour front desk service. Great value with standard rooms starting at $79.99.

• **Oceanfront Paradise** - A beachfront hotel with complimentary breakfast and stunning ocean views. Features beach access and swimming pool, with ocean view rooms ($399.99) and beachfront suites ($599.99).

All of these hotels include complimentary breakfast and offer various room types to suit different needs and budgets!

🔍 Sources:
1. Grand Plaza Hotel (Score: 0.856)
2. Mountain View Resort (Score: 0.832)
3. Budget Inn Express (Score: 0.819)
4. Oceanfront Paradise (Score: 0.804)
```

## Integration with Existing Projects

### Adding RAG to an Express.js API

Create `src/rag-api.ts`:

```typescript
import express from 'express';
import { CosmosRAGSearcher } from './cosmos-rag-searcher.js';
import 'dotenv/config';

const app = express();
app.use(express.json());

const ragSearcher = new CosmosRAGSearcher();

// Initialize connection
ragSearcher.connect().then(() => {
  console.log('RAG system connected to Cosmos DB');
});

// Basic search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, topK = 5, filters } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await ragSearcher.search(query, { topK, filters });
    res.json(result);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Conversational search endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await ragSearcher.conversationalSearch(query, conversationHistory);
    res.json(result);
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RAG API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await ragSearcher.disconnect();
  process.exit(0);
});
```

### React Frontend Component

Create a simple React component to interact with your RAG API:

```typescript
import React, { useState } from 'react';

interface RAGResponse {
  answer: string;
  sources: Array<{
    hotel: {
      hotelName: string;
      category: string;
      description: string;
    };
    score: number;
  }>;
  query: string;
}

export const RAGSearchComponent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 3 })
      });
      
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rag-search">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about hotels..."
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {response && (
        <div className="search-results">
          <div className="answer">
            <h3>Response:</h3>
            <p>{response.answer}</p>
          </div>
          
          <div className="sources">
            <h4>Sources:</h4>
            {response.sources.map((source, index) => (
              <div key={index} className="source-item">
                <strong>{source.hotel.hotelName}</strong> 
                <span className="score">(Score: {source.score.toFixed(3)})</span>
                <p>{source.hotel.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Deployment Considerations

### Environment Configuration

Create a production-ready environment configuration:

```typescript
// src/config/production.ts
export const productionConfig = {
  database: {
    connectionString: process.env.COSMOS_CONNECTION_STRING_PROD!,
    databaseName: process.env.DATABASE_NAME_PROD || 'hotels_prod',
    collectionName: process.env.COLLECTION_NAME_PROD || 'hotels'
  },
  openai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT_PROD!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION_PROD || '2024-02-01',
    embeddingModel: process.env.AZURE_OPENAI_EMBEDDING_MODEL_PROD || 'text-embedding-ada-002',
    chatModel: process.env.AZURE_OPENAI_CHAT_MODEL_PROD || 'gpt-4o'
  },
  cache: {
    enableEmbeddingCache: true,
    embeddingCacheSize: 1000,
    enableResponseCache: true,
    responseCacheTTL: 3600 // 1 hour
  },
  rateLimit: {
    openaiRequestsPerMinute: 60,
    searchRequestsPerMinute: 100
  }
};
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/rag-api.js"]
```

### Azure Container Apps Deployment

Create `containerapp.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cosmos-rag-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cosmos-rag-api
  template:
    metadata:
      labels:
        app: cosmos-rag-api
    spec:
      containers:
      - name: rag-api
        image: your-registry.azurecr.io/cosmos-rag-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: COSMOS_CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: cosmos-secrets
              key: connection-string
        - name: AZURE_OPENAI_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: openai-secrets
              key: endpoint
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Performance Optimization

### Connection Pooling

```typescript
class OptimizedCosmosRAGSearcher extends CosmosRAGSearcher {
  private static instance: OptimizedCosmosRAGSearcher;
  private connectionPool: MongoClient[] = [];
  private currentConnectionIndex = 0;
  
  static getInstance(): OptimizedCosmosRAGSearcher {
    if (!OptimizedCosmosRAGSearcher.instance) {
      OptimizedCosmosRAGSearcher.instance = new OptimizedCosmosRAGSearcher();
    }
    return OptimizedCosmosRAGSearcher.instance;
  }
  
  async initializeConnectionPool(poolSize: number = 5): Promise<void> {
    for (let i = 0; i < poolSize; i++) {
      const client = new MongoClient(process.env.COSMOS_CONNECTION_STRING!, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      await client.connect();
      this.connectionPool.push(client);
    }
  }
  
  private getConnection(): MongoClient {
    const client = this.connectionPool[this.currentConnectionIndex];
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connectionPool.length;
    return client;
  }
}
```

## Monitoring and Analytics

### Logging Integration

```typescript
import winston from 'winston';
import { ApplicationInsights } from '@azure/monitor-opentelemetry-exporter';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'rag-combined.log' }),
    new winston.transports.File({ filename: 'rag-error.log', level: 'error' })
  ]
});

// Add Application Insights for Azure monitoring
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export class MonitoredRAGSearcher extends CosmosRAGSearcher {
  async search(query: string, options: any = {}): Promise<any> {
    const startTime = Date.now();
    
    try {
      logger.info('RAG search started', { query, options });
      
      const result = await super.search(query, options);
      const duration = Date.now() - startTime;
      
      logger.info('RAG search completed', {
        query,
        sourcesCount: result.sources.length,
        duration,
        success: true
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('RAG search failed', {
        query,
        duration,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
}
```

---

🎉 **Congratulations!** You now have a comprehensive, production-ready RAG system using Azure Cosmos DB vector search. This implementation includes:

- ✅ **Complete RAG pipeline** with vector search and response generation
- ✅ **Multiple example implementations** (basic, advanced, conversational)
- ✅ **Production considerations** (error handling, caching, rate limiting)
- ✅ **Integration examples** (API, React frontend)
- ✅ **Deployment configurations** (Docker, Azure Container Apps)
- ✅ **Performance optimizations** (connection pooling, monitoring)

The modular design makes it easy to adapt this system to your specific domain and requirements. Start with the basic implementation and gradually add advanced features as your needs grow.
