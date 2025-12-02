# Google Gemini Integration Guide

This document describes how LearningAier uses Google Gemini AI, current usage patterns, and optimization strategies to reduce costs while maintaining quality.

---

## Overview

LearningAier uses the **Google Gemini API** for two primary purposes:

1. **Chat/Completion**: Text generation (RAG Q&A, translation, terminology extraction, flashcard generation)
2. **Embeddings**: Convert text to 768-dimensional vectors for semantic search

---

## Current Usage

### Models Used

| Model | Purpose | Dimensions | Provider |
|-------|---------|------------|----------|
| `gemini-2.0-flash-lite` | Chat, translation, Q&A | N/A | google-generativeai |
| `text-embedding-004` | Text embeddings | 768 | google-generativeai |

> **Note**: The chat model is user-configurable via Firestore (`profiles` collection, `preferred_model` field). The default is `gemini-2.0-flash-lite`.

### API Call Locations

All Gemini API calls are centralized in the **backend** service layer:

| File | Method | Purpose | Frequency |
|------|--------|---------|-----------|
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `generate_chat_completion` | Generic LLM call | Variable (depends on user actions) |
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `generate_embeddings` | Batch embed texts for indexing | On note reindex or PDF upload |
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `generate_query_embedding` | Embed user's search query | Per RAG Q&A request |
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `translate_text` | Translate note content | On-demand via UI |
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `extract_terminology` | Extract bilingual terms | On-demand via UI |
| [llm_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py) | `generate_flashcards` | Create flashcards from text | On-demand via UI |

### Typical API Call Flow

#### Example: RAG Q&A
```
User asks: "What are the main topics in my notes?"
  ↓
Frontend → POST /api/notes/ai-qa { question: "...", note_id: "...", top_k: 5 }
  ↓
Backend RAG Service:
  1. generate_query_embedding("What are the main topics...") → [0.123, 0.456, ...]
  2. Query Pinecone with embedding → Get top-5 similar chunks
  3. Construct prompt with chunks as context
  4. generate_chat_completion(prompt) → "The main topics are..."
  ↓
Frontend displays answer + source chunks
```

**API calls per RAG query**: 2 (1 embedding + 1 completion)

#### Example: PDF Upload & Indexing
```
User uploads 10-page PDF
  ↓
Backend extracts text → ~5000 words
  ↓
Chunk into 10 chunks (500 chars each)
  ↓
generate_embeddings([chunk1, chunk2, ...]) → 10 API calls (sequential)
  ↓
Upsert 10 vectors to Pinecone
```

**API calls per PDF**: 10 (for 10 chunks)

---

## Current Prompt Patterns

### 1. RAG Q&A Prompt
**Location**: [rag_service.py:L87-100](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/rag_service.py#L87-L100)

```python
prompt = f\"\"\"You are an AI assistant helping answer questions based solely on the provided context.

Context:
{context}

Question: {question}

Instructions:
- Answer based ONLY on the context above
- If the context doesn't contain enough information, say so
- Be concise and accurate
- Reference the context chunk numbers [1], [2], etc. when relevant

Answer:\"\"\"
```

**Token count**: ~150 tokens (prompt) + context (variable, typically 1000-2000 tokens) + question (~20 tokens)

**Total**: ~1200-2200 tokens input per query

---

### 2. Translation Prompt
**Location**: [llm_service.py:L113-119](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py#L113-L119)

```python
prompt = f\"\"\"Translate the following text to {target_lang}.
Maintain the original formatting (Markdown).
Only output the translated text.

Text:
{text}
\"\"\"
```

**Token count**: ~50 tokens (prompt) + text length (variable)

---

### 3. Terminology Extraction Prompt
**Location**: [llm_service.py:L129-139](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py#L129-L139)

```python
prompt = \"\"\"Extract key technical terms from the text.
For each term, provide:
- The term itself
- A brief definition (in the same language as the text)
- The translation (English if text is non-English, or vice versa)

Output JSON format:
[
    {\"term\": \"...\", \"definition\": \"...\", \"translation\": \"...\"}
]
\"\"\"
```

Uses **structured output** (JSON schema) for reliable parsing.

---

### 4. Flashcard Generation Prompt
**Location**: [llm_service.py:L174-181](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py#L174-L181)

```python
prompt = f\"\"\"Generate {count} flashcards based on the text.
Focus on key concepts, definitions, and important details.

Output JSON format:
[
    {\"front\": \"Question or concept\", \"back\": \"Answer or explanation\"}
]
\"\"\"
```

Also uses **structured output** for reliability.

---

## Problems & Cost Risks

### 1. No Caching for Embeddings
**Problem**: If a user reindexes the same note 5 times, we call the embeddings API 5 times even if content hasn't changed.

**Cost impact**: Wasted API calls, ~5x unnecessary spend.

### 2. Sequential Embedding Calls
**Problem**: `generate_embeddings` loops through texts and calls the API sequentially.

**Performance impact**: For 10 chunks, this takes 10 × 100ms = 1 second instead of ~100ms with concurrency.

### 3. No Rate Limiting or User Quotas
**Problem**: A single user could make unlimited API calls, potentially running up $100s in costs.

**Risk**: Cost overruns, potential abuse.

### 4. Full Context in Every RAG Query
**Problem**: RAG always retrieves top-5 chunks (500 chars each = 2500 chars context), even if only 1-2 chunks are relevant.

**Cost impact**: Larger prompts = more input tokens = higher cost.

### 5. Hardcoded Prompts
**Problem**: Prompts are embedded in code, making it hard to A/B test or optimize without deployment.

**Maintenance impact**: Slow iteration on prompt quality.

---

## Optimization Strategies

### Strategy 1: Implement Embedding Cache ⭐ **High Priority**

**Goal**: Avoid re-generating embeddings for identical content.

**Implementation**:
1. Hash the combined note content (SHA-256)
2. Check Firestore `embedding_cache` collection for existing embeddings
3. Reuse if found, otherwise generate new embeddings and cache

**Code example** (add to [note_service.py](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/note_service.py)):

```python
import hashlib
from google.cloud.firestore import SERVER_TIMESTAMP

async def reindex_note(self, user_id: str, note_id: str, force: bool = False):
    # ... fetch note data ...
    
    content_hash = hashlib.sha256(combined_content.encode()).hexdigest()
    
    # Check cache
    cache_ref = self.db.collection(\"embedding_cache\").document(content_hash)
    cache_doc = cache_ref.get()
    
    if cache_doc.exists and not force:
        cached_data = cache_doc.to_dict()
        chunks = cached_data[\"chunks\"]
        embeddings = cached_data[\"embeddings\"]
        print(f\"♻️  Using cached embeddings for note {note_id}\")
    else:
        chunks = self._chunk_text(combined_content, chunk_size=500)
        embeddings = await self.llm_service.generate_embeddings(chunks)
        
        # Store in cache
        cache_ref.set({
            \"content_hash\": content_hash,
            \"chunks\": chunks,
            \"embeddings\": embeddings,
            \"created_at\": SERVER_TIMESTAMP
        })
        print(f\"✨ Generated new embeddings for note {note_id}\")
    
    # ... rest of method (upsert vectors) ...
```

**Expected savings**: ~80% reduction in embedding API calls (users frequently reindex without content changes).

---

### Strategy 2: Batch Embeddings with Concurrency ⭐ **High Priority**

**Goal**: Generate embeddings for multiple chunks in parallel.

**Implementation** (update [llm_service.py:L76-85](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/llm_service.py#L76-L85)):

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
    if self.settings.embeddings_provider == \"gemini\":
        async def _embed_single(text: str):
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: genai.embed_content(
                    model=self.embedding_model,
                    content=text,
                    task_type=\"retrieval_document\"
                )
            )
            return result[\"embedding\"]
        
        # Process all texts concurrently
        embeddings = await asyncio.gather(*[_embed_single(t) for t in texts])
        return list(embeddings)
```

**Expected speedup**: ~10x faster for 10 chunks (100ms instead of 1s).

**Note**: Ensure Gemini API can handle concurrent requests. Monitor for rate limit errors.

---

### Strategy 3: Add User Quotas ⭐ **High Priority**

**Goal**: Prevent cost overruns by limiting API usage per user.

**Implementation**:

```python
# app/core/quota.py
from fastapi import HTTPException
from app.core.firebase import get_firestore_client
from datetime import datetime, timedelta

async def check_quota(user_id: str, operation: str, limit: int = 100):
    db = get_firestore_client()
    quota_ref = db.collection(\"user_quotas\").document(user_id)
    quota_doc = quota_ref.get()
    
    now = datetime.utcnow()
    reset_at = now.replace(day=1) + timedelta(days=32)  # Next month
    reset_at = reset_at.replace(day=1)  # First of next month
    
    if not quota_doc.exists:
        quota_ref.set({
            f\"{operation}_count\": 0,
            \"reset_at\": reset_at
        })
        quota_data = {f\"{operation}_count\": 0}
    else:
        quota_data = quota_doc.to_dict()
        
        # Reset if past reset date
        if quota_data.get(\"reset_at\") and quota_data[\"reset_at\"] < now:
            quota_ref.update({f\"{operation}_count\": 0, \"reset_at\": reset_at})
            quota_data[f\"{operation}_count\"] = 0
    
    count = quota_data.get(f\"{operation}_count\", 0)
    
    if count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f\"Monthly quota exceeded for {operation}. Limit: {limit}/month.\"
        )
    
    # Increment count
    quota_ref.update({f\"{operation}_count\": count + 1})

# Usage in routes:
@router.post(\"/ai-qa\")
async def ai_qa(request: AIQARequest, user: AuthenticatedUser = Depends(verify_firebase_token)):
    await check_quota(user.uid, \"rag_queries\", limit=100)  # 100 queries/month
    # ... rest of endpoint ...
```

**Suggested limits**:
- RAG Q&A: 100/month
- Note reindex: 50/month
- Flashcard generation: 30/month
- Translation: 50/month

**Expected savings**: Prevents abuse, caps costs per user.

---

### Strategy 4: Reduce RAG Context Size 🔧 **Medium Priority**

**Goal**: Only include highly relevant chunks in the LLM prompt.

**Implementation** (update [rag_service.py:L58-62](file:///Users/yongjiexue/Documents/GitHub/LearningAier/backend-fastapi/app/services/rag_service.py#L58-L62)):

```python
RELEVANCE_THRESHOLD = 0.7  # Only include chunks with similarity > 0.7

matches = await self.vector_service.query_vectors(
    query_vector=query_embedding,
    top_k=top_k,
    filter=filter_dict
)

# Filter by relevance score
filtered_matches = [m for m in matches if m.score > RELEVANCE_THRESHOLD]

if not filtered_matches:
    # Fallback: include top-3 even if below threshold
    filtered_matches = matches[:3]
```

**Expected savings**: ~20-30% fewer tokens per query (e.g., 3 chunks instead of 5).

---

### Strategy 5: Optimize Prompts 🔧 **Medium Priority**

**Goal**: Reduce prompt token count without losing quality.

**Implementation**: Replace verbose prompts with concise versions.

#### Example: RAG Q&A (Optimized)
```python
# Before: ~150 tokens
# After: ~100 tokens

RAG_OPTIMIZED_PROMPT = \"\"\"Context:
{context}

Q: {question}
A: Cite sources [1], [2]. Be concise. If unsure, say \"Not enough information.\"\"\"
```

#### Example: Translation (Optimized)
```python
# Before: ~50 tokens
# After: ~20 tokens

TRANSLATE_OPTIMIZED_PROMPT = \"\"\"Translate to {target_lang}. Preserve Markdown.

{text}\"\"\"
```

**Expected savings**: ~30-50 tokens per call.

**Action**: Extract all prompts to `app/prompts/templates.py` and use the optimized versions.

---

### Strategy 6: Add Retry Logic with Exponential Backoff 🔧 **Medium Priority**

**Goal**: Handle transient API errors gracefully.

**Implementation**:

```bash
pip install tenacity
```

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.api_core.exceptions

class LLMService:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(google.api_core.exceptions.ResourceExhausted),
        reraise=True
    )
    async def generate_chat_completion(self, ...):
        # ... existing code ...
```

**Benefit**: Improves reliability, handles rate limits automatically.

---

## Centralized Prompt Management

**Current issue**: Prompts are scattered across `llm_service.py` and `rag_service.py`.

**Recommendation**: Create `app/prompts/templates.py` to centralize all prompts.

```python
# app/prompts/templates.py

RAG_PROMPT = \"\"\"Context:
{context}

Q: {question}
A: Cite sources [1], [2]. Be concise. If unsure, say \"Not enough information.\"\"\"

TRANSLATE_PROMPT = \"\"\"Translate to {target_lang}. Preserve Markdown.

{text}\"\"\"

TERMINOLOGY_PROMPT = \"\"\"Extract key terms as JSON:
[{{\"term\": \"...\", \"definition\": \"...\", \"translation\": \"...\"}}]

Text:
{text}\"\"\"

FLASHCARD_PROMPT = \"\"\"{count} flashcards in JSON:
[{{\"front\": \"Q\", \"back\": \"A\"}}]

Text:
{text}\"\"\"
```

Then import and use:

```python
from app.prompts import templates

async def translate_text(self, text: str, target_lang: str = \"en\", model_name: Optional[str] = None):
    prompt = templates.TRANSLATE_PROMPT.format(target_lang=target_lang, text=text)
    messages = [{\"role\": \"user\", \"content\": prompt}]
    return await self.generate_chat_completion(messages, model_name=model_name)
```

**Benefits**:
- Easier to A/B test prompts
- Version control for prompt evolution
- Cleaner service code

---

## Cost Monitoring

**Recommendation**: Track API usage per user and per endpoint.

```python
# app/core/analytics.py
async def log_api_usage(user_id: str, operation: str, tokens_used: int):
    db = get_firestore_client()
    db.collection(\"api_usage_logs\").add({
        \"user_id\": user_id,
        \"operation\": operation,
        \"tokens_used\": tokens_used,
        \"timestamp\": SERVER_TIMESTAMP
    })

# In llm_service.py:
response = await model.generate_content_async(...)
tokens_used = response.usage_metadata.total_token_count  # Gemini provides this
await log_api_usage(user_id, \"rag_query\", tokens_used)
```

**Analysis**: Run periodic queries to identify:
- Top users by API usage
- Most expensive operations
- Trends over time

---

## Summary

**Current state**: Gemini API is well-integrated but has cost optimization opportunities.

**Top 3 immediate actions**:
1. **Implement embedding cache** → ~80% reduction in embedding calls
2. **Add user quotas** → Cap costs, prevent abuse
3. **Batch embeddings with concurrency** → 10x faster, same cost but better UX

**Expected total cost reduction**: 60-80% through caching, quotas, and prompt optimization.

**Next steps**:
1. Review this document with the team
2. Prioritize strategies based on effort/impact
3. Implement high-priority optimizations first
4. Monitor API usage metrics post-deployment
