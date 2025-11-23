# LearningAier

> AI-powered bilingual (Chinese/English) note-taking and flashcard application with RAG-based question answering

## Features

- 📝 **Bilingual Notes**: Create and manage notes in Chinese and English with Markdown support
- 🤖 **AI Translation**: Automatic translation between Chinese and English using Google Gemini
- 💬 **Chat with Your Notes**: RAG-powered Q&A over your note collection
- 📄 **PDF Processing**: Upload PDFs, auto-extract text, and index for semantic search
- 🎴 **Smart Flashcards**: AI-generated flashcards with spaced repetition review
- 🔍 **Semantic Search**: Vector-based similarity search powered by Pinecone
- 📚 **Terminology Extraction**: Auto-extract bilingual technical terms from notes

## Tech Stack

### Frontend
- React 18 + Vite 5 + TypeScript
- Material UI 7 + Tailwind CSS
- TanStack Query (React Query) for state management
- Firebase SDK (Auth + Firestore client)
- Deployed on Firebase Hosting

### Backend
- FastAPI + Python 3.11
- Firebase Admin SDK (Auth + Firestore + Cloud Storage)
- Google Gemini API (LLM + Embeddings)
- Pinecone Vector Database
- Deployed on Google Cloud Run

### Infrastructure
- Firebase (Authentication, Firestore, Cloud Storage)
- Google Cloud Run (Backend API)
- GitHub Actions (CI/CD)
- Docker (Backend containerization)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Firebase project ([create one](https://console.firebase.google.com/))
- Google Gemini API key ([get one](https://ai.google.dev/))
- Pinecone account ([create one](https://www.pinecone.io/))

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.template .env.local
# Edit .env.local with your Firebase config
npm run dev
```

Frontend will run at http://localhost:5173

### Backend Setup

```bash
cd backend-fastapi
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.local.template .env.local
# Edit .env.local with your credentials
uvicorn app.main:app --reload --port 8787
```

Backend will run at http://localhost:8787

**API Docs**: http://localhost:8787/docs

### Environment Variables

#### Frontend (.env.local)
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:8787
```

#### Backend (.env.local)
See [backend-fastapi/.env.local.template](backend-fastapi/.env.local.template) for all required variables.

Key variables:
- `FIREBASE_CREDENTIALS_JSON`: Service account JSON
- `LLM_API_KEY`: Google Gemini API key
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_INDEX_HOST`: Vector DB config

## Project Structure

```
learningaier/
├── frontend/               # React application
│   ├── src/
│   │   ├── pages/         # Main pages (notes, documents, flashcards)
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API client + React Query hooks
│   │   └── lib/           # Utilities (Firebase, API client)
│   └── package.json
├── backend-fastapi/       # FastAPI backend
│   ├── app/
│   │   ├── api/           # Route handlers
│   │   ├── services/      # Business logic (LLM, RAG, Vector DB)
│   │   ├── core/          # Auth, Firebase, exceptions
│   │   └── models/        # Pydantic schemas
│   └── requirements.txt
├── .github/workflows/     # CI/CD pipelines
├── ARCHITECTURE.md        # Detailed architecture docs
├── .gemini.md            # AI/Gemini usage guide (legacy, see gemini.md)
├── gemini.md             # Updated AI optimization guide
└── TODO.md               # Prioritized action items
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture, data flows, deployment guide
- **[gemini.md](gemini.md)**: AI/Gemini usage patterns and optimization strategies
- **[TODO.md](TODO.md)**: Prioritized improvement roadmap
- **[Frontend API Guide](frontend/FRONTEND_API.md)**: API integration patterns
- **[Migration Guide](frontend/MIGRATION_GUIDE.md)**: Node.js → FastAPI migration notes

## Deployment

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting --project your-project-id
```

Auto-deploys via GitHub Actions on push to `main`.

### Backend (Google Cloud Run)
```bash
cd backend-fastapi
gcloud builds submit --tag gcr.io/your-project-id/backend-api
gcloud run deploy learningaier-api \\
  --image gcr.io/your-project-id/backend-api \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --env-vars-file env.yaml
```

See [backend-fastapi/README.md](backend-fastapi/README.md) for detailed deployment guide.

Auto-deploys via GitHub Actions on push to `main` (when `backend-fastapi/**` changes).

## Development Workflow

1. **Create a feature branch**: `git checkout -b feature/my-feature`
2. **Make changes** (frontend and/or backend)
3. **Test locally**: Run both frontend and backend dev servers
4. **Commit and push**: `git push origin feature/my-feature`
5. **Open PR**: GitHub Actions will run preview deployments
6. **Merge to main**: Auto-deploys to production

## Testing

### Backend Tests
```bash
cd backend-fastapi
source venv/bin/activate
PYTHONPATH=. pytest -v
```

### Frontend (Manual Testing)
- Run `npm run dev` and test in browser
- Check browser console for errors
- Verify Firebase Auth, Firestore, and API calls

## Contributing

1. Follow existing code style (TypeScript for frontend, Python PEP 8 for backend)
2. Add tests for new features
3. Update documentation as needed
4. Submit PR with clear description

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/LearningAier/issues)
- **Documentation**: See `/docs` directory and inline code comments
- **API Docs**: http://localhost:8787/docs (when backend is running)
