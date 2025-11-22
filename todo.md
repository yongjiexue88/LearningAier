# LearningAier To-Do List

## 🚀 Immediate Priorities

### Backend (Node.js) - Vector DB Migration
- [ ] Add `PINECONE_API_KEY` to `backend/.env.local`:
  ```env
  PINECONE_API_KEY=your_api_key_here
  ```
- [ ] Create Pinecone index named `learningaier-index` (dimensions: 1536, metric: cosine)
- [ ] Run migration script:
  ```bash
  cd backend
  npx tsx scripts/migrate_to_pinecone.ts
  ```
- [ ] Test RAG functionality with "Chat with Note" feature

### Backend-FastAPI - Setup & Configuration
- [ ] Create `.env.local` from template:
  ```bash
  cd backend-fastapi
  cp .env.local.template .env.local
  ```
- [ ] Configure `.env.local` with:
  - Firebase service account credentials
  - Google Gemini API key
  - Pinecone API key
- [ ] Test FastAPI backend startup:
  ```bash
  uvicorn app.main:app --reload --port 8787
  ```

### Frontend - Backend Migration
- [ ] Update `VITE_API_BASE_URL` in `frontend/.env.local`:
  ```env
  # Point to FastAPI backend (when ready)
  VITE_API_BASE_URL=http://localhost:8787
  ```
- [ ] Review `frontend/MIGRATION_GUIDE.md` for API changes
- [ ] Test all React Query hooks with new backend

## 📋 Feature Development

### Notes API (FastAPI)
- [ ] Implement `POST /api/notes/ai-translate` endpoint
- [ ] Implement `POST /api/notes/ai-terminology` endpoint

### Flashcards API (FastAPI)
- [ ] Implement `POST /api/flashcards/generate` endpoint
- [ ] Implement `POST /api/flashcards/review` endpoint

### Backend (Node.js)
- [ ] Reintroduce note editor image upload/insert flow
- [ ] Upload to Cloud Storage and inject markdown image link

## 🔧 Infrastructure

### Firebase
- [ ] Deploy Firestore indexes:
  ```bash
  firebase deploy --only firestore:indexes --project learningaier
  ```
- [ ] Verify Cloud Storage structure:
  - `documents/{uid}/*.pdf`
  - `note-assets/{uid}/*.png`

### Deployment
- [ ] Build and deploy frontend:
  ```bash
  cd frontend
  npm run build
  firebase deploy --only hosting --project learningaier
  ```
- [ ] Consider deploying FastAPI backend to Google Cloud Run

## 📚 Documentation
- [ ] Review `backend/README.md` for environment variable requirements
- [ ] Review `backend-fastapi/README.md` for FastAPI setup
- [ ] Review `frontend/FRONTEND_API.md` for new API usage patterns
- [ ] Update main README with architecture overview

## 🧪 Testing
- [ ] Test PDF document processing (both backends)
- [ ] Test flashcard generation and review (spaced repetition)
- [ ] Test RAG Q&A with different scopes (note, folder, all)
- [ ] Verify Firebase Auth token handling in all API calls

## 🎯 Next Steps (After Basics)
- [ ] Monitor Pinecone usage and optimize chunk size
- [ ] Implement error logging and monitoring
- [ ] Add rate limiting to API endpoints
- [ ] Consider caching strategies for embeddings
- [ ] Optimize frontend bundle size
