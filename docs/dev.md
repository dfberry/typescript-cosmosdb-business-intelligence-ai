# Cosmos DB Movie AI - Hello World TypeScript CLI

A simple TypeScript ESM CLI application that allows you to ask natural language questions about movie data stored in Azure Cosmos DB using AI.

## Features

- **Vector Search**: Uses Cosmos DB vector indexing for semantic search
- **AI-Powered**: Leverages Azure OpenAI for embeddings and chat completions
- **Simple CLI**: Interactive conversation loop for asking questions
- **Movie Database**: Includes sample movie data with title, description, genre, year, actors, and reviews

## Prerequisites

- Azure subscription
- Azure Developer CLI (`azd`) installed
- Node.js 18+ with npm
- TypeScript

## Quick Start

### 1. Deploy Azure Resources

```bash
# Make deploy script executable and run it
./deploy.sh
```

This will:
- Create Azure Cosmos DB account with vector indexing capabilities
- Create Azure OpenAI account with GPT-4 and text-embedding-ada-002 models
- Generate environment variables in `.env` file

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Application

```bash
npm run build
```

### 4. Load Movie Data

```bash
npm run load-data
```

### 5. Vectorize the Data

```bash
npm run vectorize
```

This step creates vector embeddings for all movie fields using Azure OpenAI and stores them in Cosmos DB.

### 6. Start the Application

```bash
npm start
```

## Available Scripts

The following npm scripts are available:

### Core Application Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the interactive Movie AI CLI
- `npm run dev` - Build and start in one command

### Data Management Scripts
- `npm run load-data` - Load movie data from `data/movies.json` into Cosmos DB
- `npm run vectorize` - Generate vector embeddings for all movies using Azure OpenAI

### Development & Testing Scripts
- `npm run demo` - Run a demonstration showing Movie AI functionality
- `npm run test` - Run comprehensive tests of all components
- `npm run test-config` - Test configuration and environment variables

### Utility Scripts
- `npm run clean` - Remove compiled JavaScript files
- `npm run setup` - Install dependencies and build the project
- `npm run verify` - Verify Azure deployment and setup

## Example Questions

Try asking these natural language questions:

- "What movies are about dreams?"
- "Show me action movies from the 1990s"
- "Which movies have Morgan Freeman?"
- "What are the best crime movies?"
- "Tell me about movies directed by Christopher Nolan"
- "What movies have good reviews?"

## Architecture

- **Azure Cosmos DB**: NoSQL database with vector indexing for semantic search
- **Azure OpenAI**: 
  - `text-embedding-ada-002` for creating vector embeddings
  - `gpt-4` for generating natural language responses
- **TypeScript ESM**: Modern TypeScript with ES modules
- **Vector Search**: Semantic similarity search using cosine distance

## Project Structure

```
├── src/
│   ├── index.ts          # Main CLI application with conversation loop
│   ├── config.ts         # Configuration settings
│   ├── types.ts          # TypeScript interfaces
│   ├── load-data.ts      # Script to load movie data into Cosmos DB
│   ├── vectorize.ts      # Script to create vector embeddings
│   ├── demo.ts           # Demonstration script showing functionality
│   ├── test-app.ts       # Comprehensive test suite
│   └── test-config.ts    # Configuration validation script
├── infra/
│   ├── main.bicep        # Main Bicep template
│   └── resources.bicep   # Azure resources definition
├── data/
│   └── movies.json       # Sample movie dataset
└── deploy.sh             # Deployment automation script
```

## How It Works

1. **Data Loading**: Movie data is loaded into Cosmos DB
2. **Vectorization**: Each movie field is converted to vector embeddings using OpenAI
3. **Query Processing**: User questions are converted to vector embeddings
4. **Semantic Search**: Cosmos DB finds movies with similar vector embeddings using cosine similarity
5. **AI Response**: GPT-4 generates natural language answers based on search results

## Testing & Validation

### Quick Health Check
```bash
npm run test-config  # Verify environment configuration
npm run test         # Run comprehensive functionality tests
```

### Interactive Demo
```bash
npm run demo         # Shows semantic search in action
```

The test suite validates:
- ✅ Cosmos DB connectivity and data presence
- ✅ OpenAI API connectivity and embedding generation
- ✅ Vector embeddings in database
- ✅ Semantic search functionality with similarity scoring

## Sample Movie Data

The application includes 10 classic movies with the following structured data:
- **Title**: Movie name
- **Description**: Plot summary
- **Genre**: Movie category (Drama, Crime, Action, Sci-Fi, Romance)
- **Year**: Release year
- **Actors**: Array of main cast members
- **Reviews**: Array of structured reviews with reviewer, rating, and review text
- **Embedding**: 1536-dimensional vector for semantic search

Example movie entry:
```json
{
  "id": "1",
  "title": "The Shawshank Redemption",
  "description": "Two imprisoned men bond over a number of years...",
  "genre": "Drama",
  "year": 1994,
  "actors": ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
  "reviews": [
    {
      "reviewer": "Roger Ebert",
      "rating": 10,
      "review": "Excellent storytelling and powerful performances..."
    }
  ],
  "embedding": [0.023, -0.015, ...] // 1536 dimensions
}
```

## Environment Variables

The application uses these environment variables (automatically configured by deployment):

- `COSMOS_DB_ENDPOINT`: Cosmos DB account endpoint
- `COSMOS_DB_KEY`: Cosmos DB access key
- `OPENAI_ENDPOINT`: Azure OpenAI service endpoint
- `OPENAI_KEY`: Azure OpenAI access key

## Manual Setup (Alternative)

If you prefer to set up resources manually:

1. Create Azure Cosmos DB account with vector indexing
2. Create Azure OpenAI account with required model deployments
3. Copy `.env.template` to `.env` and fill in your values
4. Follow steps 2-6 from Quick Start

## Cleanup

To remove all Azure resources:

```bash
azd down
```

## Learning Notes

This is a "Hello World" application focused on:
- Simple, readable code without error handling
- Basic TypeScript ESM patterns
- Azure Cosmos DB vector search capabilities
- Azure OpenAI integration for embeddings and chat

For production use, add proper error handling, input validation, logging, and security measures.