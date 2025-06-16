# Adaptation Guide: Customizing for Your Domain

This guide explains how to adapt this repository from the movie example to work with your own data and subject domain. Follow this step-by-step process to transform the codebase for your specific use case.

## 🎯 Overview

This repository uses movies as an example domain, but you can easily adapt it to work with any type of data. Whether you're building e-commerce search, research databases, customer support systems, or any other domain-specific AI-powered search application, this guide will help you customize the codebase.

## 📋 Understanding the Current Structure

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

## 🔧 Step-by-Step Adaptation Guide

### Step 1: Define Your Data Structure

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

### Step 2: Prepare Your Data

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

### Step 3: Update Type Definitions

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

### Step 4: Adapt Data Loading Logic

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

### Step 5: Update Vectorization Strategy

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

### Step 6: Adapt Search and Query Functions

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

### Step 7: Update Tests

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

### Step 8: Update Configuration

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

## 🎨 Domain-Specific Examples

### E-commerce Product Search

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

**Search examples for products:**
```bash
"Find wireless headphones under $200"
"Show me noise-canceling audio equipment"  
"What gaming accessories do you have?"
```

### Research Paper Database

```typescript
interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number;
  keywords: string[];
  embedding: number[];
}

// Create embedding text for research papers
function createPaperEmbeddingText(paper: ResearchPaper): string {
  return [
    paper.title,
    paper.abstract,
    `Authors: ${paper.authors.join(', ')}`,
    `Keywords: ${paper.keywords.join(', ')}`,
    `Published in ${paper.journal} (${paper.year})`
  ].join(' | ');
}

// Format paper for AI context
function formatPaperForContext(paper: ResearchPaper): string {
  return `**${paper.title}** by ${paper.authors.join(', ')} (${paper.year})
Published in: ${paper.journal}
Abstract: ${paper.abstract}
Keywords: ${paper.keywords.join(', ')}`;
}

// System prompt for research assistant
function getResearchSystemPrompt(): string {
  return `You are a research assistant that helps with academic literature. 
  Provide accurate summaries and insights based on the research papers provided.
  Focus on methodology, findings, and implications. Be scholarly but accessible.`;
}
```

**Search examples for papers:**
```bash
"Find papers about machine learning in healthcare"
"Show recent AI research from 2024"
"What papers discuss neural networks?"
```

### Customer Support Knowledge Base

```typescript
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  embedding: number[];
}

// Create embedding text for support articles
function createArticleEmbeddingText(article: KnowledgeArticle): string {
  return [
    article.title,
    article.content,
    `Category: ${article.category}`,
    `Tags: ${article.tags.join(', ')}`
  ].join(' | ');
}

// Format article for AI context
function formatArticleForContext(article: KnowledgeArticle): string {
  return `**${article.title}** (${article.category})
${article.content}
Tags: ${article.tags.join(', ')}`;
}

// System prompt for support assistant
function getSupportSystemPrompt(): string {
  return `You are a helpful customer support assistant. 
  Answer questions clearly and concisely based on the knowledge base articles provided.
  If you cannot find the answer, suggest contacting support directly.`;
}
```

**Search examples for support articles:**
```bash
"How do I reset my password?"
"Troubleshooting connection issues"
"Billing and payment problems"
```

## ✅ Quick Start Checklist

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

## 🚨 Common Gotchas and Tips

### ⚠️ Common Issues:
- **Embedding Text Length**: Keep embedding input under 8,192 tokens
- **Vector Dimensions**: Ensure consistent dimensions (1536 for ada-002)
- **Indexing Policy**: Must match your document structure exactly
- **Data Types**: Ensure numeric fields are numbers, not strings

### 💡 Best Practices:
- Start with single vector strategy for simplicity
- Test with small datasets (10-50 items) first
- Monitor embedding costs during development
- Use meaningful, descriptive text for embeddings
- Include relevant context in your embedding text
- Consider your users' search patterns when choosing strategy

### 🚀 Scaling Tips:
- Batch embedding generation to reduce API calls
- Implement caching for frequently accessed embeddings
- Monitor Cosmos DB RU consumption
- Consider chunking for very large documents
- Add error handling and retry logic for production

## 🎯 Strategy Selection Guide

Choose your vectorization strategy based on your specific needs:

| **Your Use Case** | **Recommended Strategy** | **Why** |
|-------------------|-------------------------|---------|
| **Simple product catalog** | Single Vector | Products have consistent, short descriptions |
| **Complex e-commerce** | Multi-vector | Need category, brand, description searches |
| **Scientific papers** | Chunked + Multi-field | Large documents with distinct sections |
| **User profiles** | Multi-vector | Different aspects (interests, demographics) |
| **News articles** | Chunked | Long content covering multiple topics |
| **Customer support** | Single Vector | Simple Q&A pairs |
| **Legal documents** | Chunked | Very long, complex documents |
| **Social media** | Single Vector | Short, consistent content |

## 🔗 Next Steps

After adapting the repository:

1. **Test Your Implementation**: Start with a small dataset to validate your changes
2. **Optimize Performance**: Monitor query times and adjust your vectorization strategy
3. **Scale Gradually**: Increase dataset size and monitor costs
4. **Add Domain Features**: Implement domain-specific search filters and UI
5. **Monitor in Production**: Set up logging and monitoring for your AI search system

## 📚 Additional Resources

- [Vector Storage with Cosmos DB](./vector-storage-cosmos-db.md) - Deep dive into vectorization strategies
- [Architecture Documentation](./architecture.md) - System design and patterns
- [Azure Cosmos DB Vector Search Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/vector-search)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

---

💡 **Success Tip**: The key to successful adaptation is understanding your data structure and user search patterns. Choose the vectorization strategy that best matches how your users will search and what information they need!
