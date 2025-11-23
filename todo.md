# LearningAier To-Do List

## 🚀 Immediate Priorities

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

### Vector DB Setup
- [ ] Create Pinecone index named `learningaier-index` (dimensions: 1536, metric: cosine)
- [ ] Test RAG functionality with "Chat with Note" feature

### Frontend - Backend Migration
- [ ] Update `VITE_API_BASE_URL` in `frontend/.env.local`:
  ```env
  # Point to FastAPI backend
  VITE_API_BASE_URL=http://localhost:8787
  ```
- [ ] Review `frontend/MIGRATION_GUIDE.md` for API changes
- [ ] Test all React Query hooks with new backend

## 📋 Feature Development

### Notes API (FastAPI)
- [ ] Implement `POST /api/notes/ai-translate` endpoint
- [ ] Implement `POST /api/notes/ai-terminology` endpoint
- [ ] Reintroduce note editor image upload/insert flow
- [ ] Upload to Cloud Storage and inject markdown image link

### Flashcards API (FastAPI)
- [ ] Implement `POST /api/flashcards/generate` endpoint
- [ ] Implement `POST /api/flashcards/review` endpoint

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
- [ ] Deploy FastAPI backend to Google Cloud Run
- [ ] **CRITICAL**: Add GitHub Secrets for Firebase Deployment:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID`
  - `VITE_API_BASE_URL`

## 📚 Documentation
- [ ] Review `backend-fastapi/README.md` for FastAPI setup
- [ ] Review `frontend/FRONTEND_API.md` for new API usage patterns
- [ ] Update main README with architecture overview

## 🧪 Testing
- [ ] Test PDF document processing
- [ ] Test flashcard generation and review (spaced repetition)
- [ ] Test RAG Q&A with different scopes (note, folder, all)
- [ ] Verify Firebase Auth token handling in all API calls

## 🎯 Next Steps (After Basics)
- [ ] Monitor Pinecone usage and optimize chunk size
- [ ] Implement error logging and monitoring
- [ ] Add rate limiting to API endpoints
- [ ] Consider caching strategies for embeddings
- [ ] Optimize frontend bundle size
