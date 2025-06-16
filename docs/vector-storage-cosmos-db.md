# Vector Storage with Cosmos DB

This guide explains how to use Cosmos DB for vector embeddings and AI-powered search, covering the core concepts, vectorization strategies, and implementation patterns.

## 📚 The Basic Concept

Here's the simplest explanation of vector storage and search:

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

## 🔧 Technical Implementation

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

## 🎯 Document Vectorization Strategies in Cosmos DB

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

**✅ Pros:**
- Simple to implement and understand
- One vector search query finds holistically similar documents
- Lower storage costs (one vector per document)
- Faster queries (single vector comparison)
- Good for general similarity search

**❌ Cons:**
- Less precise for specific field searches
- Mixed signals (title might be sci-fi but description romantic)
- Hard to weight different fields differently
- Can lose granular meaning in complex documents

**🎯 Best for:** General similarity search, small documents, product catalogs, when you want overall document similarity

### Strategy 2: Multiple Vectors per Document (Granular Approach)

This approach creates **separate embedding vectors** for different fields or aspects of the document.

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

// Search specific fields
async function searchByField(
  query: string, 
  field: 'title' | 'description' | 'genre' | 'metadata'
): Promise<MultiVectorDocument[]> {
  const queryEmb = await openai.embeddings.create({
    input: query,
    model: 'text-embedding-ada-002'
  });
  
  return await container.items.query({
    query: `
      SELECT c.*, VectorDistance(c.embeddings.${field}, @queryVector) AS similarity
      FROM c
      WHERE IS_DEFINED(c.embeddings.${field})
      ORDER BY VectorDistance(c.embeddings.${field}, @queryVector)
      OFFSET 0 LIMIT 10
    `,
    parameters: [{ name: '@queryVector', value: queryEmb.data[0].embedding }]
  }).fetchAll();
}
```

**✅ Pros:**
- Precise field-specific searches
- Can weight different aspects differently  
- Better for complex queries targeting specific fields
- More granular similarity matching
- Excellent for faceted search

**❌ Cons:**
- More complex to implement
- Higher storage costs (multiple vectors per document)
- More complex query logic required
- Need to combine multiple similarity scores
- Higher embedding generation costs

**🎯 Best for:** Complex documents, field-specific searches, e-commerce, when different parts have different importance

### Strategy 3: Hybrid Approach (Best of Both Worlds)

This approach combines both strategies by having **one holistic vector plus field-specific vectors**.

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

// Flexible search functions
async function searchHybrid(
  query: string, 
  searchType: 'general' | 'title' | 'description'
): Promise<HybridVectorDocument[]> {
  const queryEmb = await createEmbedding(query);
  
  const vectorField = searchType === 'general' 
    ? 'c.embedding' 
    : `c.fieldEmbeddings.${searchType}`;
  
  return await container.items.query({
    query: `
      SELECT c.*, VectorDistance(${vectorField}, @queryVector) AS similarity
      FROM c
      ORDER BY VectorDistance(${vectorField}, @queryVector)
      OFFSET 0 LIMIT 10
    `,
    parameters: [{ name: '@queryVector', value: queryEmb }]
  }).fetchAll();
}
```

**🎯 Best for:** Applications needing both general search and specific field targeting

### Strategy 4: Chunked Document Vectorization

For **large documents**, split content into chunks and vectorize each chunk separately.

```typescript
interface ChunkedVectorDocument {
  id: string;
  title: string;
  documentType: string;
  chunks: {
    id: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
    wordCount: number;
  }[];
  // Optional: overall document embedding
  documentEmbedding?: number[];
}

async function createChunkedDocument(
  document: { id: string; title: string; content: string }
): Promise<ChunkedVectorDocument> {
  // Split content into chunks (e.g., by paragraphs or token count)
  const chunks = splitIntoChunks(document.content, 500); // 500 chars per chunk
  
  // Create embeddings for each chunk
  const chunkEmbeddings = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await openai.embeddings.create({
        input: chunk,
        model: 'text-embedding-ada-002'
      });
      
      return {
        id: `${document.id}-chunk-${index}`,
        content: chunk,
        embedding: embedding.data[0].embedding,
        chunkIndex: index,
        wordCount: chunk.split(' ').length
      };
    })
  );
  
  return {
    id: document.id,
    title: document.title,
    documentType: 'chunked',
    chunks: chunkEmbeddings
  };
}

// Search within chunks and return parent documents
async function searchChunkedDocuments(query: string): Promise<any[]> {
  const queryEmb = await createEmbedding(query);
  
  // Find most relevant chunks
  const results = await container.items.query({
    query: `
      SELECT c.id, c.title, chunk, VectorDistance(chunk.embedding, @queryVector) AS similarity
      FROM c
      JOIN chunk IN c.chunks
      ORDER BY VectorDistance(chunk.embedding, @queryVector)
      OFFSET 0 LIMIT 10
    `,
    parameters: [{ name: '@queryVector', value: queryEmb }]
  }).fetchAll();
  
  return results.resources;
}
```

**🎯 Best for:** Scientific papers, legal documents, books, long-form content

### Choosing the Right Vectorization Strategy

| **Use Case** | **Recommended Strategy** | **Why** |
|--------------|-------------------------|---------|
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

## 🚀 Production-Ready Code Examples

### Insert Function with Vectorization

```typescript
import { OpenAI } from 'openai';
import { Container } from '@azure/cosmos';

interface MovieDocument {
  id: string;
  title: string;
  description: string;
  genre: string;
  embedding?: number[];
  year: number;
}

async function insertMovieWithVectorization(
  movie: Omit<MovieDocument, 'embedding'>,
  container: Container,
  openai: OpenAI
): Promise<MovieDocument> {
  
  // 1. Create text representation for embedding
  const textForEmbedding = [
    movie.title,
    movie.description,
    movie.genre,
    `Year: ${movie.year}`
  ].join(' ');
  
  // 2. Generate embedding using OpenAI
  const embeddingResponse = await openai.embeddings.create({
    input: textForEmbedding,
    model: 'text-embedding-ada-002'
  });
  
  // 3. Create document with embedding
  const movieWithEmbedding: MovieDocument = {
    ...movie,
    embedding: embeddingResponse.data[0].embedding
  };
  
  // 4. Store in Cosmos DB
  const { resource } = await container.items.create(movieWithEmbedding);
  
  console.log(`✅ Inserted movie: ${movie.title} with ${movieWithEmbedding.embedding!.length}-dimensional embedding`);
  return resource as MovieDocument;
}
```

### Vector Search Query Function

```typescript
async function findSimilarMovies(
  query: string,
  container: Container,
  openai: OpenAI,
  topK: number = 5
): Promise<MovieDocument[]> {
  
  // 1. Convert query to embedding
  const queryEmbedding = await openai.embeddings.create({
    input: query,
    model: 'text-embedding-ada-002'
  });
  
  const queryVector = queryEmbedding.data[0].embedding;
  
  // 2. Cosmos DB vector search query
  const vectorQuery = `
    SELECT c.*, VectorDistance(c.embedding, @queryVector) AS similarity
    FROM c
    WHERE IS_DEFINED(c.embedding)
    ORDER BY VectorDistance(c.embedding, @queryVector)
    OFFSET 0 LIMIT @topK
  `;
  
  // 3. Execute query
  const { resources } = await container.items.query({
    query: vectorQuery,
    parameters: [
      { name: '@queryVector', value: queryVector },
      { name: '@topK', value: topK }
    ]
  }).fetchAll();
  
  console.log(`🔍 Found ${resources.length} similar movies for: "${query}"`);
  return resources;
}
```

### Complete AI Answer Generation

```typescript
async function answerMovieQuestion(
  question: string,
  container: Container,
  openai: OpenAI
): Promise<string> {
  
  // 1. Find relevant movies using vector search
  const relevantMovies = await findSimilarMovies(question, container, openai);
  
  // 2. Build context from search results
  const context = relevantMovies
    .map(movie => 
      `**${movie.title}** (${movie.year}): ${movie.description} [Genre: ${movie.genre}]`
    )
    .join('\n\n');
  
  // 3. Generate AI response with context
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful movie expert. Answer questions about movies using the provided context. Be concise and engaging.'
      },
      {
        role: 'user',
        content: `Question: ${question}

Relevant Movies:
${context}

Please provide a helpful answer based on these movies.`
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  
  const answer = completion.choices[0].message.content || 'Sorry, I could not generate an answer.';
  
  console.log(`🤖 Generated answer for: "${question}"`);
  return answer;
}
```

### Complete End-to-End Example

```typescript
// Complete workflow example
async function movieAIWorkflow() {
  // Initialize clients (assuming they're already configured)
  const { container, openai } = await initializeClients();
  
  // 1. Insert movies with vectorization
  const movies = [
    {
      id: 'movie-1',
      title: 'Interstellar',
      description: 'Astronauts travel through a wormhole to save humanity',
      genre: 'Sci-Fi',
      year: 2014
    },
    {
      id: 'movie-2', 
      title: 'The Martian',
      description: 'Astronaut stranded on Mars must survive until rescue',
      genre: 'Sci-Fi',
      year: 2015
    }
  ];
  
  // Insert each movie with vectorization
  for (const movie of movies) {
    await insertMovieWithVectorization(movie, container, openai);
  }
  
  // 2. Answer questions using vector search + AI
  const questions = [
    "What movies are about space survival?",
    "Show me sci-fi films from 2014-2015",
    "Which movies involve astronauts?"
  ];
  
  for (const question of questions) {
    console.log(`\n❓ Question: ${question}`);
    const answer = await answerMovieQuestion(question, container, openai);
    console.log(`💬 Answer: ${answer}\n`);
  }
}

// Run the complete workflow
movieAIWorkflow().catch(console.error);
```

## 🎯 Key Takeaways

1. **Embedding Generation**: Convert text to vectors that capture semantic meaning
2. **Vector Storage**: Store embeddings alongside your data in Cosmos DB  
3. **Similarity Search**: Use vector distance to find conceptually similar content
4. **Context-Aware AI**: Provide relevant context to LLMs for accurate answers

## 🚨 Important Notes

- **Embedding Model**: Use `text-embedding-ada-002` (1536 dimensions)
- **Vector Index**: Cosmos DB requires vector indexing configuration
- **Rate Limits**: Batch embedding requests to avoid API limits
- **Cost**: Embedding generation and vector storage have costs
- **Consistency**: Use the same embedding model for storage and search

## 🔗 Next Steps

- See [`tutorials/02-cosmos-db/`](../tutorials/02-cosmos-db/) for detailed database setup
- Check [`tutorials/03-openai-integration/`](../tutorials/03-openai-integration/) for AI integration patterns  
- Review [`examples/vector-search/`](../examples/vector-search/) for more code examples
- Read [`docs/architecture.md`](./architecture.md) for system design details
- Follow the [`adaptation-guide.md`](./adaptation-guide.md) to customize for your domain

---

💡 **Pro Tip**: Start with small datasets to understand the concepts before scaling to production workloads!
