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
│   └── vectorize.ts      # Script to create vector embeddings
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
4. **Semantic Search**: Cosmos DB finds movies with similar vector embeddings
5. **AI Response**: GPT-4 generates natural language answers based on search results

## Sample Movie Data

The application includes 10 classic movies with the following fields:
- Title
- Description  
- Genre
- Year
- Actors
- Reviews

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