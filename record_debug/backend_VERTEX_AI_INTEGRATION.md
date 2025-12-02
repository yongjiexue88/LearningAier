# Vertex AI Integration - Quick Reference

## What Was Done

Integrated Vertex AI as an alternative LLM provider while maintaining full backward compatibility with Google AI.

## Files Changed

**Modified (5):**
- `config.py` - Added Vertex AI configuration fields
- `vector_service.py` - Added namespace parameter
- `main.py` - Added Vertex AI startup initialization
- `requirements.txt` - Added google-cloud-aiplatform dependency
- `api/notes.py` - Added /reindex-lab-vertex endpoint

**New (3):**
- `core/vertex.py` - Vertex AI initialization
- `services/vertex_llm_client.py` - Low-level Vertex AI wrapper
- `services/vertex_llm_service.py` - Domain operations for Vertex AI

**Renamed (1):**
- `services/llm_service.py` → `services/google_ai_llm_service.py` (old implementation)
- `services/llm_service.py` (new router implementation)

## Configuration

### Continue Using Google AI (No Changes Required)
```bash
LLM_PROVIDER=google_ai  # or omit (default)
```

### Switch to Vertex AI
```bash
LLM_PROVIDER=vertex_ai
VERTEX_PROJECT_ID=learningaier-lab
VERTEX_LOCATION=us-central1
VERTEX_GEMINI_MODEL=gemini-2.0-flash-exp
VERTEX_EMBEDDING_MODEL=text-embedding-004
```

## Setup Steps

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **For Vertex AI (Optional):**
   - Enable Vertex AI API in GCP project
   - Grant service account "Vertex AI User" role
   - Set `VERTEX_PROJECT_ID` in `.env.local`

## Testing

### Test Backward Compatibility
```bash
# Set LLM_PROVIDER=google_ai (or leave default)
uvicorn app.main:app --reload --port 8080
# All existing endpoints should work unchanged
```

### Test Vertex AI Lab Endpoint
```bash
# Set LLM_PROVIDER=vertex_ai
curl -X POST http://localhost:8080/api/notes/reindex-lab-vertex \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"note_id": "<note-id>"}'
```

## Architecture

```
LLMService (router)
    ├── GoogleAILLMService (when LLM_PROVIDER=google_ai)
    │   └── Uses google-generativeai SDK
    └── VertexLLMService (when LLM_PROVIDER=vertex_ai)
        └── Uses google-cloud-aiplatform SDK
```

All existing code imports `LLMService` and automatically uses the configured provider.

## Key Features

✅ **Zero Breaking Changes** - All existing code works unchanged
✅ **Provider Switching** - Change via environment variable
✅ **Namespace Isolation** - Lab testing doesn't affect production
✅ **Clean Architecture** - Router pattern for extensibility
