# Hybrid AI + Database Search System

## Overview

This system implements a two-phase project generation pipeline that combines database search with AI generation for optimal speed and user experience.

## Architecture

### Phase 1: Fast Project Suggestions
- User enters materials → System searches MongoDB for similar projects
- If found (similarity ≥ 0.8 or ≥3 matches) → Return project names immediately
- If not found → Call LLM with lightweight prompt (names only) → Return quickly
- **Background**: While user is choosing, system generates full details for all suggested projects in parallel

### Phase 2: Full Project Details
- User clicks a project → Check if full details are ready
- If ready → Return instantly
- If still generating → Show loading spinner (frontend polls status)
- If failed → Show error with retry option

## Key Features

1. **Hybrid Search**: Database-first approach with embedding similarity
2. **Background Generation**: All projects generate in parallel while user chooses
3. **Caching**: Input prompts are cached for instant results on repeat queries
4. **Retry Logic**: Failed generations automatically retry up to 2 times
5. **Material Normalization**: Handles synonyms, plurals, and variations

## API Endpoints

### `POST /api/generate`
Generate project name suggestions (Phase 1)

**Request:**
```json
{
  "materials": "plastic bottles, cardboard, twine"
}
```

**Response:**
```json
{
  "projects": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Mason Jar Lantern",
      "status": "completed"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Rustic Candle Holder",
      "status": "generating"
    }
  ],
  "cached": false
}
```

### `GET /api/generate/:id`
Get full project details (Phase 2)

**Response:**
```json
{
  "project": {
    "id": "507f1f77bcf86cd799439011",
    "projectName": "Mason Jar Lantern",
    "description": "...",
    "materials": [...],
    "steps": [...],
    "referenceVideo": "...",
    "status": "completed"
  }
}
```

### `GET /api/generate/:id/status`
Check project generation status

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "projectName": "Mason Jar Lantern",
  "status": "generating"
}
```

## Database Models

### Project Model
- `projectName`: String
- `description`: String
- `materials`: Array of {name, quantity}
- `normalizedMaterials`: [String] - For search
- `embedding`: [Number] - 384d vector
- `steps`: Array of step objects
- `referenceVideo`: String
- `inputPrompt`: String - Original user input
- `status`: 'generating' | 'completed' | 'failed'
- `userRating`: Number (0-5)

### InputPromptCache Model
- `prompt`: String (unique)
- `resultsProjectIds`: [ObjectId]
- `embedding`: [Number]
- `lastAccessed`: Date

## Utilities

### `extractMaterials(text)`
Normalizes and extracts material keywords from user input.

### `getMaterialsEmbedding(materials)`
Generates 384-dimensional embedding vector using MiniLM model.

### `cosine(a, b)`
Calculates cosine similarity between two vectors (0 to 1).

### `calculateFinalScore(similarity, rating)`
Combines similarity (70%) and user rating (30%) for ranking.

## Migration

To migrate existing JSONL projects to MongoDB:

```bash
node src/scripts/migrateProjects.js
```

This will:
- Read `backend/data/projects.jsonl`
- Extract materials and generate embeddings
- Create Project documents in MongoDB
- Skip duplicates

## Configuration

### Constants (in `generate.js`)
- `SIMILARITY_THRESHOLD`: 0.8 (minimum similarity to use DB results)
- `MIN_MATCHES`: 3 (minimum matches needed)
- `GENERATION_TIMEOUT`: 60000ms (60 seconds)
- `MAX_RETRIES`: 2 (retry attempts for failed generations)

### LLM Configuration
- Model: `Qwen-Qwen2.5-7B-Instruct-GGUF`
- Endpoint: `http://127.0.0.1:1234/v1/chat/completions`
- Phase 1: `max_tokens: 300` (fast)
- Phase 2: `max_tokens: 2000` (detailed)

## Frontend Integration

### Polling Pattern
```javascript
// Poll status every 2 seconds until completed
const checkStatus = async (projectId) => {
  const response = await fetch(`/api/generate/${projectId}/status`);
  const { status } = await response.json();
  
  if (status === 'completed') {
    // Fetch full details
    const details = await fetch(`/api/generate/${projectId}`);
    return details.json();
  } else if (status === 'failed') {
    // Show error, allow retry
    throw new Error('Generation failed');
  }
  
  // Still generating, poll again
  setTimeout(() => checkStatus(projectId), 2000);
};
```

## Performance Optimizations

1. **Embedding Caching**: Embeddings are computed once and stored
2. **Parallel Generation**: All projects generate simultaneously
3. **Database Indexing**: Indexes on `normalizedMaterials`, `status`, `createdAt`
4. **Input Caching**: Exact prompt matches return instantly

## Error Handling

- Failed generations are marked with `status: 'failed'`
- Automatic retry (up to 2 attempts) with exponential backoff
- Errors are logged but don't block the response
- Frontend can show error state and allow manual retry

