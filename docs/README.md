# Movie AI - Ask Questions About Movies with AI

A TypeScript CLI that lets you ask natural language questions about movies using Azure Cosmos DB vector search and Azure OpenAI.

## Quick Start

### 1. Deploy to Azure

```bash
azd up
```

This command will:
- Create Azure Cosmos DB with vector search capabilities
- Deploy Azure OpenAI with GPT-4o and embedding models
- Load sample movie data and generate embeddings
- Set up everything you need automatically

### 2. Ask Questions About Movies

```bash
npm start
```

Then try asking questions like:
- "What are some good sci-fi movies with space adventures?"
- "Show me action movies from the 1990s"
- "Which movies have Morgan Freeman?"
- "What are the best crime movies?"
- "Tell me about movies with great reviews"

## That's It! 🎬

The application includes 10 classic movies and uses AI to understand your questions and provide intelligent recommendations based on semantic similarity.

## Example Session

```
🎬 Welcome to Movie AI! Ask me anything about movies.
Type "exit" to quit.

Ask me about movies: What are some good space adventure movies?

Thinking...

🤖 Based on your interest in space adventures, here are some excellent options:

1. **Star Wars: Episode IV** (1977) - The classic space opera that started it all. Luke Skywalker joins forces with a Jedi Knight, rebels, and droids to save the galaxy.

2. **The Matrix** (1999) - While not traditional space travel, this sci-fi masterpiece explores reality and features incredible action sequences with philosophical depth.

3. **Inception** (2010) - A mind-bending adventure through dream worlds with stunning visuals and complex storytelling.

These films offer thrilling adventures with memorable characters and groundbreaking special effects!
```

## What's Under the Hood

- **Azure Cosmos DB**: Stores movie data with vector embeddings for semantic search
- **Azure OpenAI**: Powers the AI responses and understands your questions
- **Vector Search**: Finds movies similar to your question using AI embeddings
- **TypeScript**: Modern, type-safe code you can explore and modify

## Next Steps

- **Explore the code**: Check out the `src/` folder to see how it works
- **Add more movies**: Modify `data/movies.json` and run `npm run load-data && npm run vectorize`
- **Run tests**: Use `npm run test` to validate everything is working
- **See detailed docs**: Check `dev.md` for comprehensive documentation

## Cleanup

When you're done exploring:

```bash
azd down
```

This removes all Azure resources to avoid ongoing costs.

---

**Need help?** Check the detailed documentation in `dev.md` or run `npm run test` to validate your setup.
