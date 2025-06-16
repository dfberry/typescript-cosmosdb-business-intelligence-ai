# Cosmos DB Vector Search Quickstart

This guide explains the core concepts of using Cosmos DB for vector embeddings and AI-powered search in the simplest possible terms.

## 📚 Section 1: The Basic Concept (Pseudocode)

Here's the simplest explanation of what we're doing:

```pseudocode
// Step 1: Store data with vector embeddings
function insertDocument(text):
    embedding = createEmbedding(text)        // Convert text to numbers
    document = { content: text, vector: embedding }
    cosmosDB.insert(document)                // Store in database

// Step 2: Search and get AI answers
function answerQuestion(question):
    questionVector = createEmbedding(question)     // Convert question to numbers
    similarDocs = cosmosDB.vectorSearch(questionVector) // Find similar documents
    context = combineDocuments(similarDocs)       // Combine found documents
    answer = openAI.complete(question + context)  // Ask AI with context
    return answer
```

**What's happening?**
1. We convert text into numbers (vectors) that represent meaning
2. We store these vectors alongside our data in Cosmos DB
3. When someone asks a question, we find similar vectors (similar meaning)
4. We give the similar content to OpenAI to generate a smart answer

## 🔧 Section 2: Expanded Technical Flow

### The Vector Embedding Process

```mermaid
graph LR
    A[Text: "Sci-fi movie about space"] --> B[OpenAI Embedding API]
    B --> C[Vector: [0.1, 0.8, -0.3, ...]]
    C --> D[Cosmos DB Document]
```

### Database Schema
```javascript
// What gets stored in Cosmos DB
{
  "id": "movie-123",
  "title": "Star Wars",
  "description": "Epic space adventure...",
  "genre": "Sci-Fi",
  "embedding": [0.1, 0.8, -0.3, 0.2, ...], // 1536 numbers representing meaning
  "metadata": { "year": 1977, "rating": 8.6 }
}
```

### Search Process
1. **Query Vectorization**: User question → embedding vector
2. **Similarity Search**: Find documents with similar embedding vectors
3. **Context Assembly**: Combine relevant documents into context
4. **AI Completion**: Send question + context to OpenAI for natural language answer

### Why This Works
- **Semantic Understanding**: Vectors capture meaning, not just keywords
- **Similarity Matching**: Mathematical distance between vectors = conceptual similarity
- **Rich Context**: AI gets relevant information to generate accurate answers

## 🎯 Section 2.5: Document Vectorization Strategies in Cosmos DB

Understanding how to structure vector embeddings in your Cosmos DB documents is crucial for building effective AI-powered search systems. You have several strategic approaches, each with distinct advantages and trade-offs.

### Strategy 1: Single Vector per Document (Holistic Approach)

This approach creates **one embedding vector** that represents the entire document's content by combining all relevant fields.

```typescript
interface SingleVectorDocument {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  rating: number;
  // Single vector representing the entire document
  embedding: number[]; // 1536 dimensions from text-embedding-ada-002
}

// Example document
{
  "id": "movie-123",
  "title": "Inception",
  "description": "A thief who enters people's dreams to steal secrets...",
  "genre": "Sci-Fi",
  "year": 2010,
  "rating": 8.8,
  "embedding": [0.1, 0.8, -0.3, 0.2, ...] // Represents ALL content combined
}

// How to create the single vector
async function createSingleVectorDocument(movie: MovieData): Promise<SingleVectorDocument> {
  // Combine all relevant text fields
  const combinedText = [
    movie.title,
    movie.description,
    movie.genre,
    `Released in ${movie.year}`,
    `Rating: ${movie.rating}/10`
  ].join(' | ');
  
  const embedding = await openai.embeddings.create({
    input: combinedText,
    model: 'text-embedding-ada-002'
  });
  
  return {
    ...movie,
    embedding: embedding.data[0].embedding
  };
}
```

**Pros:**
- ✅ Simple to implement and understand
- ✅ One vector search query finds holistically similar documents
- ✅ Lower storage costs (one vector per document)
- ✅ Faster queries (single vector comparison)

**Cons:**
- ❌ Less precise for specific field searches
- ❌ Mixed signals (title might be sci-fi but description romantic)
- ❌ Hard to weight different fields differently

**Best for:** General similarity search, small documents, when you want overall document similarity

### Strategy 2: Multiple Vectors per Document (Granular Approach)

This approach creates separate embedding vectors for different fields or aspects of the document.

```typescript
interface MultiVectorDocument {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  rating: number;
  // Multiple vectors for different aspects
  embeddings: {
    title: number[];        // Vector for title only
    description: number[];  // Vector for description only
    genre: number[];       // Vector for genre information
    metadata: number[];    // Vector for year, rating, etc.
  };
}

// Example document
{
  "id": "movie-123",
  "title": "Inception",
  "description": "A thief who enters people's dreams...",
  "genre": "Sci-Fi",
  "year": 2010,
  "rating": 8.8,
  "embeddings": {
    "title": [0.2, 0.7, -0.1, ...],           // "Inception"
    "description": [0.5, 0.3, 0.8, ...],     // Full plot description
    "genre": [0.1, 0.9, -0.2, ...],          // "Sci-Fi Thriller"
    "metadata": [0.3, 0.4, 0.6, ...]         // "2010 movie, 8.8 rating"
  }
}

// How to create multi-vector document
async function createMultiVectorDocument(movie: MovieData): Promise<MultiVectorDocument> {
  // Create embeddings for different aspects
  const [titleEmb, descEmb, genreEmb, metaEmb] = await Promise.all([
    openai.embeddings.create({ input: movie.title, model: 'text-embedding-ada-002' }),
    openai.embeddings.create({ input: movie.description, model: 'text-embedding-ada-002' }),
    openai.embeddings.create({ input: `${movie.genre} film`, model: 'text-embedding-ada-002' }),
    openai.embeddings.create({ 
      input: `${movie.year} movie with ${movie.rating} rating`, 
      model: 'text-embedding-ada-002' 
    })
  ]);
  
  return {
    ...movie,
    embeddings: {
      title: titleEmb.data[0].embedding,
      description: descEmb.data[0].embedding,
      genre: genreEmb.data[0].embedding,
      metadata: metaEmb.data[0].embedding
    }
  };
}
```

**Pros:**
- ✅ Precise field-specific searches
- ✅ Can weight different aspects differently
- ✅ Better for complex queries targeting specific fields
- ✅ More granular similarity matching

**Cons:**
- ❌ More complex to implement
- ❌ Higher storage costs (multiple vectors per document)
- ❌ More complex query logic
- ❌ Need to combine multiple similarity scores

**Best for:** Complex documents, field-specific searches, when different parts have different importance

### Strategy 3: Hybrid Approach (Best of Both Worlds)

This approach combines both strategies by having one holistic vector plus field-specific vectors.

```typescript
interface HybridVectorDocument {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  rating: number;
  // Primary vector for general similarity
  embedding: number[];
  // Specific vectors for targeted searches
  fieldEmbeddings: {
    title: number[];
    description: number[];
  };
}

// Example search functions for different strategies
async function searchByOverallSimilarity(query: string): Promise<HybridVectorDocument[]> {
  const queryEmb = await createEmbedding(query);
  
  return await container.items.query({
    query: `
      SELECT c.*, VectorDistance(c.embedding, @queryVector) AS similarity
      FROM c
      ORDER BY VectorDistance(c.embedding, @queryVector)
      OFFSET 0 LIMIT 10
    `,
    parameters: [{ name: '@queryVector', value: queryEmb }]
  }).fetchAll();
}

async function searchBySpecificField(query: string, field: 'title' | 'description'): Promise<HybridVectorDocument[]> {
  const queryEmb = await createEmbedding(query);
  
  return await container.items.query({
    query: `
      SELECT c.*, VectorDistance(c.fieldEmbeddings.${field}, @queryVector) AS similarity
      FROM c
      ORDER BY VectorDistance(c.fieldEmbeddings.${field}, @queryVector)
      OFFSET 0 LIMIT 10
    `,
    parameters: [{ name: '@queryVector', value: queryEmb }]
  }).fetchAll();
}
```

### Strategy 4: Chunked Document Vectorization

For large documents, split content into chunks and vectorize each chunk separately.

```typescript
interface ChunkedVectorDocument {
  id: string;
  title: string;
  chunks: {
    id: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
  }[];
  // Optional: overall document embedding
  documentEmbedding?: number[];
}

async function createChunkedDocument(
  document: { id: string; title: string; content: string }
): Promise<ChunkedVectorDocument> {
  // Split content into chunks (e.g., by paragraphs or sentence count)
  const chunks = splitIntoChunks(document.content, 500); // 500 chars per chunk
  
  // Create embeddings for each chunk
  const chunkEmbeddings = await Promise.all(
    chunks.map(async (chunk, index) => ({
      id: `${document.id}-chunk-${index}`,
      content: chunk,
      embedding: (await openai.embeddings.create({
        input: chunk,
        model: 'text-embedding-ada-002'
      })).data[0].embedding,
      chunkIndex: index
    }))
  );
  
  return {
    id: document.id,
    title: document.title,
    chunks: chunkEmbeddings
  };
}
```

### Choosing the Right Strategy

| Use Case | Recommended Strategy | Why |
|----------|---------------------|-----|
| **Simple product catalog** | Single Vector | Products have consistent, short descriptions |
| **Movie/book database** | Hybrid | Need both general similarity and field-specific search |
| **Scientific papers** | Chunked + Multi-field | Large documents with distinct sections |
| **User profiles** | Multi-vector | Different aspects (interests, demographics, behavior) |
| **News articles** | Chunked | Long content that covers multiple topics |
| **E-commerce search** | Multi-vector | Need to search by category, brand, description separately |
| **Customer support** | Single Vector | Simple Q&A pairs |
| **Legal documents** | Chunked | Very long documents with complex structure |

### Vector Indexing Configuration for Each Strategy

**Important:** Cosmos DB requires proper vector indexing configuration for each vector property:

```json
// Single Vector Strategy
{
  "indexingPolicy": {
    "vectorIndexes": [
      {
        "path": "/embedding",
        "type": "quantizedFlat"
      }
    ]
  }
}

// Multi-Vector Strategy  
{
  "indexingPolicy": {
    "vectorIndexes": [
      {
        "path": "/embeddings/title",
        "type": "quantizedFlat"
      },
      {
        "path": "/embeddings/description", 
        "type": "quantizedFlat"
      },
      {
        "path": "/embeddings/genre",
        "type": "quantizedFlat"
      },
      {
        "path": "/embeddings/metadata",
        "type": "quantizedFlat"
      }
    ]
  }
}

// Hybrid Strategy
{
  "indexingPolicy": {
    "vectorIndexes": [
      {
        "path": "/embedding",           // General search
        "type": "quantizedFlat"
      },
      {
        "path": "/fieldEmbeddings/title", // Specific field search
        "type": "quantizedFlat"
      },
      {
        "path": "/fieldEmbeddings/description",
        "type": "quantizedFlat"
      }
    ]
  }
}

// Chunked Strategy
{
  "indexingPolicy": {
    "vectorIndexes": [
      {
        "path": "/chunks/[]/embedding", // Index all chunk embeddings
        "type": "quantizedFlat"
      },
      {
        "path": "/documentEmbedding",   // Optional document-level embedding
        "type": "quantizedFlat"
      }
    ]
  }
}
```

### Performance & Cost Comparison

| **Strategy** | **Query Time** | **Storage per Doc** | **RU Consumption** | **Embedding Cost** |
|--------------|----------------|---------------------|-------------------|-------------------|
| **Single Vector** | ~1-2ms | ~6KB | Low | 1x |
| **Multi-Vector** | ~3-5ms | ~24KB (4 vectors) | Medium | 4x |
| **Hybrid** | ~2-4ms | ~18KB (3 vectors) | Medium | 3x |
| **Chunked** | ~5-10ms | Varies by chunks | High | Varies |

**Storage calculation:** Each vector = 1536 dimensions × 4 bytes = ~6KB
**Embedding cost:** $0.0001 per 1K tokens for `text-embedding-ada-002`

### Real-World Implementation Example

Here's a practical e-commerce example using the multi-vector approach:

```typescript
interface EcommerceProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  specifications: string;
  embeddings: {
    name: number[];           // Product name for title searches
    description: number[];    // Full description for detailed searches  
    category: number[];       // Category + brand for filtering
    specifications: number[]; // Technical specs for feature searches
    overall: number[];        // Combined for general searches
  };
}

// Flexible search supporting different query types
async function searchProducts(
  query: string, 
  searchType: 'general' | 'name' | 'description' | 'category' | 'specs' = 'general'
): Promise<EcommerceProduct[]> {
  
  const queryEmb = await openai.embeddings.create({
    input: query,
    model: 'text-embedding-ada-002'
  });
  
  const vectorField = searchType === 'general' 
    ? 'c.embeddings.overall'
    : `c.embeddings.${searchType === 'specs' ? 'specifications' : searchType}`;
  
  const { resources } = await container.items.query({
    query: `
      SELECT c.*, VectorDistance(${vectorField}, @queryVector) AS similarity
      FROM c 
      WHERE IS_DEFINED(${vectorField})
      ORDER BY VectorDistance(${vectorField}, @queryVector)
      OFFSET 0 LIMIT 20
    `,
    parameters: [{ name: '@queryVector', value: queryEmb.data[0].embedding }]
  }).fetchAll();
  
  return resources;
}

// Usage examples:
// await searchProducts("wireless headphones", "general");        // General search
// await searchProducts("Sony WH-1000XM4", "name");              // Specific product search  
// await searchProducts("noise cancellation technology", "specs"); // Feature search
// await searchProducts("audio electronics", "category");         // Category search
```

This multi-layered approach to vectorization gives you maximum flexibility while maintaining good performance characteristics. Choose the strategy that best fits your data structure and query patterns!

## 🔄 Section 3: Adapting This Repository to Your Own Data & Domain

This repository uses movies as an example domain, but you can easily adapt it to work with your own data and subject area. Here's a step-by-step guide to customize this codebase for your specific use case.

### 3.1 Understanding the Current Structure

The movie example includes these key components:

```typescript
// Current movie data structure
interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  rating: number;
  embedding?: number[];
}
```

**Files to modify for your domain:**
- `src/utils/types.ts` - Data interfaces and types
- `src/utils/load-data.ts` - Data loading and processing
- `src/utils/vectorize.ts` - Vectorization logic
- `src/utils/query.ts` - Search and query functions
- `data/movies.json` - Your source data file
- Tests in `tests/` directory

### 3.2 Step-by-Step Adaptation Guide

#### Step 1: Define Your Data Structure

Replace the movie interface with your domain-specific structure:

```typescript
// Example: E-commerce Products
interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  specifications: string;
  // Vector embeddings (choose your strategy)
  embedding?: number[];           // Single vector approach
  // OR
  embeddings?: {                  // Multi-vector approach
    name: number[];
    description: number[];
    category: number[];
    specifications: number[];
  };
}

// Example: Research Papers  
interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number;
  keywords: string[];
  fullText?: string;
  embedding?: number[];
}

// Example: Customer Support KB
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  embedding?: number[];
}
```

#### Step 2: Prepare Your Data

Create your data file in the `data/` directory:

```json
// data/products.json (E-commerce example)
[
  {
    "id": "prod-001",
    "name": "Wireless Bluetooth Headphones",
    "description": "Premium noise-canceling wireless headphones with 30-hour battery life",
    "category": "Electronics > Audio",
    "brand": "TechBrand",
    "price": 199.99,
    "specifications": "Bluetooth 5.0, Active Noise Cancellation, 30hr battery, Quick charge"
  }
]

// data/papers.json (Research example)
[
  {
    "id": "paper-001", 
    "title": "Machine Learning in Healthcare: A Comprehensive Review",
    "abstract": "This paper provides a systematic review of machine learning applications...",
    "authors": ["Dr. Smith", "Dr. Johnson"],
    "journal": "AI in Medicine",
    "year": 2024,
    "keywords": ["machine learning", "healthcare", "AI", "medical diagnosis"]
  }
]
```

#### Step 3: Update Type Definitions

Modify `src/utils/types.ts`:

```typescript
// Replace the existing Movie interface
export interface YourDomainObject {
  id: string;
  // ... your specific fields
  embedding?: number[];
}

// Update related types
export interface SearchResult {
  item: YourDomainObject;
  similarity: number;
}

export interface VectorSearchOptions {
  topK?: number;
  similarityThreshold?: number;
  // Add domain-specific search options
  category?: string;
  priceRange?: { min: number; max: number };
}
```

#### Step 4: Adapt Data Loading Logic

Update `src/utils/load-data.ts`:

```typescript
import { YourDomainObject } from './types.js';

export async function loadYourData(): Promise<YourDomainObject[]> {
  try {
    // Update the file path to your data
    const dataPath = path.join(process.cwd(), 'data', 'your-data.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const rawData = JSON.parse(fileContent);
    
    // Add any data validation/transformation logic
    return rawData.map((item: any) => ({
      id: item.id,
      // Map your specific fields
      name: item.name,
      description: item.description,
      // ... other fields
    }));
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Update batch insertion function
export async function insertYourDataWithVectors(
  data: YourDomainObject[],
  container: Container,
  openai: OpenAI
): Promise<void> {
  console.log(`📦 Processing ${data.length} items...`);
  
  for (const item of data) {
    // Customize the text used for embedding generation
    const textForEmbedding = createEmbeddingText(item);
    
    const embeddingResponse = await openai.embeddings.create({
      input: textForEmbedding,
      model: 'text-embedding-ada-002'
    });
    
    const itemWithEmbedding = {
      ...item,
      embedding: embeddingResponse.data[0].embedding
    };
    
    await container.items.create(itemWithEmbedding);
    console.log(`✅ Processed: ${item.name || item.title || item.id}`);
  }
}

// Customize how you combine fields for embedding
function createEmbeddingText(item: YourDomainObject): string {
  // Example for products:
  return [
    item.name,
    item.description,
    item.category,
    item.brand,
    `Price: $${item.price}`,
    item.specifications
  ].filter(Boolean).join(' | ');
  
  // Example for research papers:
  // return [
  //   item.title,
  //   item.abstract,
  //   `Authors: ${item.authors.join(', ')}`,
  //   `Keywords: ${item.keywords.join(', ')}`,
  //   `Published in ${item.journal} (${item.year})`
  // ].filter(Boolean).join(' | ');
}
```

#### Step 5: Update Vectorization Strategy

Modify `src/utils/vectorize.ts` based on your chosen strategy:

```typescript
// Single Vector Strategy
export async function vectorizeYourData(
  item: YourDomainObject,
  openai: OpenAI
): Promise<YourDomainObject> {
  const textForEmbedding = createEmbeddingText(item);
  
  const embeddingResponse = await openai.embeddings.create({
    input: textForEmbedding,
    model: 'text-embedding-ada-002'
  });
  
  return {
    ...item,
    embedding: embeddingResponse.data[0].embedding
  };
}

// Multi-Vector Strategy (if applicable)
export async function vectorizeYourDataMultiple(
  item: YourDomainObject,
  openai: OpenAI
): Promise<YourDomainObject> {
  // Create separate embeddings for different fields
  const [nameEmb, descEmb, categoryEmb] = await Promise.all([
    openai.embeddings.create({ input: item.name, model: 'text-embedding-ada-002' }),
    openai.embeddings.create({ input: item.description, model: 'text-embedding-ada-002' }),
    openai.embeddings.create({ input: item.category, model: 'text-embedding-ada-002' })
  ]);
  
  return {
    ...item,
    embeddings: {
      name: nameEmb.data[0].embedding,
      description: descEmb.data[0].embedding,
      category: categoryEmb.data[0].embedding
    }
  };
}
```

#### Step 6: Adapt Search and Query Functions

Update `src/utils/query.ts`:

```typescript
export async function searchYourData(
  query: string,
  container: Container,
  openai: OpenAI,
  options: {
    topK?: number;
    searchField?: 'general' | 'name' | 'description' | 'category';
    filters?: {
      category?: string;
      priceRange?: { min: number; max: number };
    };
  } = {}
): Promise<SearchResult[]> {
  
  const { topK = 10, searchField = 'general', filters } = options;
  
  // Generate query embedding
  const queryEmbedding = await openai.embeddings.create({
    input: query,
    model: 'text-embedding-ada-002'
  });
  
  // Choose vector field based on your strategy
  const vectorField = searchField === 'general' 
    ? 'c.embedding' 
    : `c.embeddings.${searchField}`;
  
  // Build query with optional filters
  let sqlQuery = `
    SELECT c.*, VectorDistance(${vectorField}, @queryVector) AS similarity
    FROM c
    WHERE IS_DEFINED(${vectorField})
  `;
  
  const parameters = [
    { name: '@queryVector', value: queryEmbedding.data[0].embedding }
  ];
  
  // Add domain-specific filters
  if (filters?.category) {
    sqlQuery += ` AND c.category = @category`;
    parameters.push({ name: '@category', value: filters.category });
  }
  
  if (filters?.priceRange) {
    sqlQuery += ` AND c.price >= @minPrice AND c.price <= @maxPrice`;
    parameters.push(
      { name: '@minPrice', value: filters.priceRange.min },
      { name: '@maxPrice', value: filters.priceRange.max }
    );
  }
  
  sqlQuery += `
    ORDER BY VectorDistance(${vectorField}, @queryVector)
    OFFSET 0 LIMIT @topK
  `;
  parameters.push({ name: '@topK', value: topK });
  
  const { resources } = await container.items.query({
    query: sqlQuery,
    parameters
  }).fetchAll();
  
  return resources.map(item => ({
    item,
    similarity: item.similarity
  }));
}

// Domain-specific AI chat function
export async function askAboutYourData(
  question: string,
  container: Container,
  openai: OpenAI
): Promise<string> {
  // Find relevant items
  const searchResults = await searchYourData(question, container, openai, { topK: 5 });
  
  // Build context from search results
  const context = searchResults
    .map(result => formatYourItemForContext(result.item))
    .join('\n\n');
  
  // Generate AI response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: getSystemPromptForYourDomain()
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nRelevant Information:\n${context}`
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  
  return completion.choices[0].message.content || 'Sorry, I could not generate an answer.';
}

// Customize context formatting for your domain
function formatYourItemForContext(item: YourDomainObject): string {
  // Example for products:
  return `**${item.name}** - ${item.description} (${item.category}, $${item.price})`;
  
  // Example for research papers:
  // return `**${item.title}** by ${item.authors.join(', ')} (${item.year})\n${item.abstract}`;
}

// Customize system prompt for your domain
function getSystemPromptForYourDomain(): string {
  return `You are a helpful assistant that answers questions about products in our catalog. 
  Provide accurate, helpful information based on the product data provided. 
  Be concise and focus on the most relevant details.`;
  
  // For research papers:
  // return `You are a research assistant that helps with academic literature. 
  // Provide accurate summaries and insights based on the research papers provided.`;
}
```

#### Step 7: Update Tests

Modify tests in `tests/` directory:

```typescript
// tests/unit/your-domain.test.ts
import { describe, it, expect, vi } from 'vitest';
import { vectorizeYourData, searchYourData } from '../src/utils/index.js';

describe('Your Domain Functions', () => {
  const mockYourData = {
    id: 'test-001',
    name: 'Test Product',
    description: 'Test description',
    category: 'Test Category',
    // ... other fields
  };

  it('should vectorize your data correctly', async () => {
    // Your test implementation
  });

  it('should search your data correctly', async () => {
    // Your test implementation  
  });
});
```

#### Step 8: Update Configuration

Update container and indexing configuration for your vector strategy:

```typescript
// Update container creation with your indexing policy
const indexingPolicy = {
  vectorIndexes: [
    {
      path: "/embedding",              // For single vector
      type: "quantizedFlat"
    },
    // Add more if using multi-vector strategy
    {
      path: "/embeddings/name",
      type: "quantizedFlat"
    },
    {
      path: "/embeddings/description",
      type: "quantizedFlat"
    }
  ]
};
```

### 3.3 Domain-Specific Examples

#### E-commerce Product Search
```bash
# Search examples for products:
"Find wireless headphones under $200"
"Show me noise-canceling audio equipment"  
"What gaming accessories do you have?"
```

#### Research Paper Database
```bash
# Search examples for papers:
"Find papers about machine learning in healthcare"
"Show recent AI research from 2024"
"What papers discuss neural networks?"
```

#### Customer Support Knowledge Base
```bash
# Search examples for support articles:
"How do I reset my password?"
"Troubleshooting connection issues"
"Billing and payment problems"
```

### 3.4 Quick Start Checklist

- [ ] Replace `Movie` interface with your domain object in `types.ts`
- [ ] Update data file in `data/` directory with your content
- [ ] Modify `load-data.ts` to handle your data structure
- [ ] Choose and implement your vectorization strategy in `vectorize.ts`
- [ ] Update search functions in `query.ts` for your use case
- [ ] Add domain-specific filters and search options
- [ ] Update system prompts for AI chat functionality
- [ ] Configure vector indexing for your chosen strategy
- [ ] Update tests to reflect your domain
- [ ] Test with a small dataset first before scaling up

### 3.5 Common Gotchas and Tips

**⚠️ Common Issues:**
- **Embedding Text Length**: Keep embedding input under 8,192 tokens
- **Vector Dimensions**: Ensure consistent dimensions (1536 for ada-002)
- **Indexing Policy**: Must match your document structure exactly
- **Data Types**: Ensure numeric fields are numbers, not strings

**💡 Best Practices:**
- Start with single vector strategy for simplicity
- Test with small datasets (10-50 items) first
- Monitor embedding costs during development
- Use meaningful, descriptive text for embeddings
- Include relevant context in your embedding text
- Consider your users' search patterns when choosing strategy

**🚀 Scaling Tips:**
- Batch embedding generation to reduce API calls
- Implement caching for frequently accessed embeddings
- Monitor Cosmos DB RU consumption
- Consider chunking for very large documents
- Add error handling and retry logic for production

This framework gives you everything needed to adapt the repository to your specific domain while maintaining the AI-powered search capabilities!