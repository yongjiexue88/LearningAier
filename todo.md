# LearningAier TODO

Prioritized action items based on comprehensive project review (2025-11-23).

---

## ✅ ML Pipeline Deployment (Completed)
- Successfully deployed RandomForest model to Vertex AI
- Verified predictions and integration with backend
- Updated documentation in `ml/flashcard_interval_model/GUIDE.md`

---

## 🚀 Phase 4: CI/CD & LLMOps Deployment

### Manual Setup Required:

- [x] **Follow Cloud Build Setup**
  - File: `CLOUD_BUILD_DEPLOY.md`
  - Action: Enable APIs (Done), create Artifact Registry (Done), set up build triggers (Done)
  - Effort: 30 minutes
  - Impact: Automated deployments on every push

- [x] **Create GKE Cluster**
  - File: `GKE_WORKER_ARCHITECTURE.md`
  - Action: Create Autopilot cluster, configure Workload Identity, deploy worker (Done)
  - Effort: 45 minutes
  - Impact: Dedicated PDF processing service

- [x] **Set Up LLMOps Logging**
  - File: `LLMOPS_GUIDE.md`
  - Action: Create log-based metrics (Done), set up BigQuery export (Optional)
  - Effort: 20 minutes
  - Impact: Track prompt versions, token usage, costs

- [ ] **Deploy and Test**
  - Action: Push to main, verify Cloud Build triggers, test worker health, activate A/B experiment
  - Effort: 1 hour
  - Impact: Full Phase 4 infrastructure live

---

## 🔴 High Priority (Critical for Production)

### Security

- [ ] **Fix CORS Configuration**
  - File: `backend-fastapi/app/main.py:L35`
  - Action: Replace `allow_origins=["*"]` with specific domains from config
  - Effort: 15 minutes
  - Impact: Prevents CSRF attacks, unauthorized API access

- [ ] **Add Rate Limiting**
  - Files: All API routes in `backend-fastapi/app/api/`
  - Action: Install `slowapi`, add limits to expensive endpoints (RAG, reindex, flashcards)
  - Suggested limits: 10/min for RAG, 5/min for reindex
  - Effort: 1 hour
  - Impact: Prevents abuse, protects backend from overload

- [ ] **Improve Error Handling**
  - Files: `backend-fastapi/app/api/notes.py`, `documents.py`, `flashcards.py`
  - Action: Add logging, return generic error messages to client
  - Effort: 30 minutes
  - Impact: Prevents leaking internal details (API keys, paths)

### Cost Optimization

- [ ] **Implement Embedding Cache**
  - Files: `backend-fastapi/app/services/note_service.py`, `document_service.py`
  - Action: Hash content, check Firestore cache before generating embeddings
  - Effort: 2 hours
  - Impact: **~80% reduction in embedding API calls**
  - See: [gemini.md Strategy 1](gemini.md#strategy-1-implement-embedding-cache-)

- [ ] **Add User Quotas**
  - Files: New `backend-fastapi/app/core/quota.py`, API middleware
  - Action: Track monthly usage per user, enforce limits (100 RAG queries/month, 50 reindexes, 30 flashcards)
  - Effort: 3 hours
  - Impact: **Caps costs, prevents abuse**
  - See: [gemini.md Strategy 3](gemini.md#strategy-3-add-user-quotas-)

---

## 🟡 Medium Priority (Quality & Performance)

### Code Quality

- [ ] **Extract Chunking Logic to Shared Utility**
  - Files: `backend-fastapi/app/services/note_service.py:L93-113`, `document_service.py:L119-127`
  - Action: Create `backend-fastapi/app/utils/text_utils.py` with `chunk_text_with_overlap()`
  - Effort: 30 minutes
  - Impact: DRY principle, easier to upgrade to semantic chunking

- [ ] **Extract Prompt Templates**
  - Files: `backend-fastapi/app/services/llm_service.py`, `rag_service.py`
  - Action: Create `backend-fastapi/app/prompts/templates.py` with all prompts
  - Effort: 1 hour
  - Impact: Easier A/B testing, version control for prompts
  - See: [gemini.md Centralized Prompt Management](gemini.md#centralized-prompt-management)

- [ ] **Cache LLM Model Instances**
  - File: `backend-fastapi/app/services/llm_service.py:L54-56`
  - Action: Add `_model_cache` dict to avoid repeated `GenerativeModel()` initialization
  - Effort: 20 minutes
  - Impact: Minor performance improvement

### Performance

- [ ] **Batch Embeddings with Concurrency**
  - File: `backend-fastapi/app/services/llm_service.py:L76-85`
  - Action: Use `asyncio.gather` or `ThreadPoolExecutor` to parallelize embedding calls
  - Effort: 1 hour
  - Impact: **~10x faster** (100ms instead of 1s for 10 chunks)
  - See: [gemini.md Strategy 2](gemini.md#strategy-2-batch-embeddings-with-concurrency-)

- [ ] **Add Retry Logic for API Calls**
  - Files: `backend-fastapi/app/services/llm_service.py`, `vector_service.py`
  - Action: Install `tenacity`, add `@retry` decorators with exponential backoff
  - Effort: 1 hour
  - Impact: Handles transient errors (rate limits, network issues) gracefully
  - See: [gemini.md Strategy 6](gemini.md#strategy-6-add-retry-logic-with-exponential-backoff-)

- [ ] **Reduce RAG Context Size**
  - File: `backend-fastapi/app/services/rag_service.py:L58-62`
  - Action: Filter chunks by similarity score threshold (e.g., > 0.7)
  - Effort: 30 minutes
  - Impact: **~20-30% fewer tokens per query**
  - See: [gemini.md Strategy 4](gemini.md#strategy-4-reduce-rag-context-size-)

### Infrastructure

- [ ] **Implement Missing API Endpoints**
  - [ ] `POST /api/notes/ai-translate` (already implemented, needs testing)
  - [ ] `POST /api/notes/ai-terminology` (already implemented, needs testing)
  - [ ] `POST /api/flashcards/generate` (TODO in backend)
  - [x] `POST /api/flashcards/review` (Implemented with ML integration)
  - Effort: 2-3 hours per endpoint
  - Files: `backend-fastapi/app/api/flashcards.py`, `app/services/flashcard_service.py`

- [ ] **Deploy Firestore Indexes**
  - File: `firestore.indexes.json`
  - Action: `firebase deploy --only firestore:indexes --project learningaier`
  - Effort: 5 minutes
  - Impact: Ensures complex queries work in production

---

## 🟢 Low Priority (Future Enhancements)

### Cost Optimization (Advanced)

- [ ] **Optimize Pinecone Metadata**
  - Files: `backend-fastapi/app/services/note_service.py:L80`, `rag_service.py:L75`
  - Action: Store only preview in Pinecone metadata, fetch full chunks from Firestore when needed
  - Effort: 2 hours
  - Impact: Reduces Pinecone storage/bandwidth costs
  - Tradeoff: Adds Firestore reads
  - See: Project Review, Improvement #12

- [ ] **Use Smaller Models for Simple Tasks**
  - Files: `backend-fastapi/app/services/llm_service.py`
  - Action: For translation, try `gemini-1.5-flash` (if faster/cheaper)
  - Effort: 30 minutes testing + config updates
  - Impact: Potential cost reduction for non-critical tasks

### Security (Advanced)

- [ ] **Migrate to Secret Manager for Credentials**
  - Files: `backend-fastapi/app/config.py`, `.github/workflows/deploy-backend.yml`
  - Action: Use Google Cloud Secret Manager instead of env vars for Firebase credentials
  - Effort: 2 hours
  - Impact: More secure, eliminates risk of malformed JSON in env vars
  - See: Project Review, Improvement #10

### Features

- [ ] **Implement Semantic Chunking**
  - Files: `backend-fastapi/app/utils/text_utils.py` (after extracting chunking logic)
  - Action: Replace character-based chunking with langchain `RecursiveCharacterTextSplitter`
  - Effort: 3 hours
  - Impact: Better chunk boundaries (e.g., end on sentence/paragraph), improved RAG quality

- [ ] **Add API Usage Monitoring**
  - Files: New `backend-fastapi/app/core/analytics.py`, update `llm_service.py`
  - Action: Log every API call (user, operation, tokens used) to Firestore
  - Effort: 2 hours
  - Impact: Visibility into costs, identify heavy users
  - See: [gemini.md Cost Monitoring](gemini.md#cost-monitoring)

- [ ] **Add Observability (Sentry, Cloud Logging)**
  - Files: `backend-fastapi/app/main.py`, new config
  - Action: Install Sentry SDK, configure Cloud Logging integration
  - Effort: 2 hours
  - Impact: Better error tracking, debugging in production

- [ ] **Reintroduce Note Editor Image Upload**
  - Files: Frontend note editor components
  - Action: Implement image upload to Cloud Storage, inject Markdown link
  - Effort: 3 hours
  - Impact: Better UX for visual content

### Frontend

- [ ] **Audit Firestore Query Patterns**
  - Files: Frontend components in `frontend/src/pages/`, `frontend/src/services/`
  - Action: Check for N+1 queries, optimize with batch reads or denormalization
  - Effort: 1 hour audit + variable fixes
  - Impact: Faster load times, fewer Firestore reads
  - See: Project Review, Improvement #6

- [ ] **Optimize Frontend Bundle Size**
  - Files: `frontend/vite.config.ts`, lazy loading in routes
  - Action: Analyze bundle with `vite-bundle-visualizer`, split large chunks
  - Effort: 2 hours
  - Impact: Faster initial load time

---

## 📚 Documentation

- [ ] **Update ARCHITECTURE.md**
  - Action: Use proposed content from project review
  - File: `ARCHITECTURE.md`
  - Effort: 15 minutes (copy-paste + review)

- [ ] **Create gemini.md**
  - Action: Use proposed content from project review
  - File: `gemini.md` (new file)
  - Effort: 15 minutes (copy-paste + review)

- [ ] **Update README.md**
  - Action: Use proposed content from project review
  - File: `README.md`
  - Effort: 15 minutes (copy-paste + review)

---

## 🧪 Testing

- [ ] **Test PDF Document Processing End-to-End**
  - Action: Upload a real PDF, verify extraction, indexing, and RAG Q&A
  - Tools: Postman or frontend UI
  - Effort: 30 minutes

- [x] **Test Flashcard Review**
  - Action: Verified ML model integration and SM-2 fallback
  - Status: ✅ Working (ML predicts realistic intervals)

- [ ] **Test Flashcard Generation**
  - Action: Generate flashcards from a note
  - Note: Flashcard generation endpoint is TODO

- [ ] **Verify Firebase Auth Token Handling**
  - Action: Test all API endpoints with valid/invalid/expired tokens
  - Effort: 1 hour

- [ ] **Load Test RAG Q&A Endpoint**
  - Action: Use `locust` or `ab` to simulate 100 concurrent users
  - Goal: Verify rate limiting, identify bottlenecks
  - Effort: 2 hours

---

## 🎯 Next Steps (Quick Wins)

If you want to start immediately, do these in order:

1. **Fix CORS** (15 min) → Security
2. **Implement embedding cache** (2 hrs) → **80% cost reduction**
3. **Add rate limiting** (1 hr) → Security + cost protection
4. **Batch embeddings with concurrency** (1 hr) → 10x faster
5. **Update documentation** (45 min total) → Better onboarding

**Total time for quick wins**: ~5 hours  
**Expected impact**: Secure production deployment + major cost savings + faster backend

---

## Notes

- **Effort estimates** are approximate and assume familiarity with the codebase.
- **Impact ratings** are based on production readiness, cost, and UX improvements.
- See **[Project Review](project_review.md)** for detailed explanations of each item.
- See **[gemini.md](gemini.md)** for AI optimization strategies with code examples.
