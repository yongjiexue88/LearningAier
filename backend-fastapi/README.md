# LearningAier FastAPI Backend

FastAPI backend for LearningAier - an AI-powered note-taking and flashcard application with RAG (Retrieval-Augmented Generation) capabilities.

## Features

- Firebase Authentication with ID token verification
- Firestore for data persistence
- Cloud Storage for file management
- Google Gemini for LLM operations (chat, embeddings)
- Pinecone for vector similarity search
- RAG-based question answering over notes
- PDF document processing and indexing

## Tech Stack

- **Framework**: FastAPI 0.115.0
- **Runtime**: Python 3.11+
- **Database**: Firestore
- **Storage**: Cloud Storage
- **Vector DB**: Pinecone
- **LLM**: Google Gemini (gemini-2.0-flash-exp, text-embedding-004)
- **PDF**: PyPDF2

## Project Structure

```
backend-fastapi/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration management
│   ├── api/                 # API route handlers
│   │   ├── notes.py         # Notes endpoints
│   │   ├── documents.py     # Documents endpoints
│   │   └── flashcards.py    # Flashcards endpoints
│   ├── core/                # Core framework components
│   │   ├── firebase.py      # Firebase initialization
│   │   ├── auth.py          # Auth middleware
│   │   └── exceptions.py    # Custom exceptions
│   ├── models/              # Pydantic schemas
│   │   ├── notes.py
│   │   └── documents.py
│   └── services/            # Business logic
│       ├── llm_service.py      # LLM operations
│       ├── vector_service.py   # Vector DB operations
│       ├── rag_service.py      # RAG pipeline
│       ├── pdf_service.py      # PDF parsing
│       ├── note_service.py     # Note operations
│       └── document_service.py # Document processing
├── requirements.txt
├── .env.local.template
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Firebase project with Firestore and Cloud Storage enabled
- Google Gemini API key
- Pinecone account and API key

### Installation

1. **Clone the repository**
   ```bash
   cd backend-fastapi
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your credentials
   ```

### Configuration

Edit `.env.local` with your credentials:

- **Firebase**: Get service account JSON from Firebase Console → Project Settings → Service Accounts
- **Gemini**: Get API key from Google AI Studio
- **Pinecone**: Get API key from Pinecone console

### Running the Server

**Development mode (with hot reload):**
```bash
uvicorn app.main:app --reload --port 8787
```

**Production mode:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8787 --workers 4
```

The API will be available at:
- API: http://localhost:8787
- Interactive docs: http://localhost:8787/docs
- Alternative docs: http://localhost:8787/redoc

## API Endpoints

### Notes

- `POST /api/notes/ai-qa` - RAG-based question answering
- `POST /api/notes/reindex` - Rebuild embeddings for a note
- `POST /api/notes/ai-translate` - Translate note content (TODO)
- `POST /api/notes/ai-terminology` - Extract terminology (TODO)

### Documents

- `POST /api/documents/upload-process` - Process uploaded PDF

### Flashcards

- `POST /api/flashcards/generate` - Generate flashcards (TODO)
- `POST /api/flashcards/review` - Submit review (TODO)

All endpoints require Firebase ID token in `Authorization: Bearer <token>` header.

## Example Usage

### Question Answering

```bash
curl -X POST http://localhost:8787/api/notes/ai-qa \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note_123",
    "question": "What are the key concepts?",
    "top_k": 5
  }'
```

### Document Processing

```bash
curl -X POST http://localhost:8787/api/documents/upload-process \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc_456",
    "file_path": "documents/user123/file.pdf",
    "chunk_size": 500
  }'
```

## Development

### Code Style

- Follow PEP 8
- Use type hints
- Use async/await for I/O operations
- Document functions with docstrings

### Adding New Endpoints

1. Create Pydantic models in `app/models/`
2. Implement business logic in `app/services/`
3. Create route handler in `app/api/`
4. Register router in `app/main.py`

## Deployment

### Docker (Recommended)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
```

### Google Cloud Run

```bash
gcloud run deploy learningaier-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Migration from Node.js Backend

This FastAPI backend replaces the Node.js/Express backend. Key differences:

- Routes now under `/api/*` instead of `/functions/v1/*`
- Update frontend `VITE_API_BASE_URL` to point to new backend
- Same Firebase project and Firestore schema
- Vector embeddings moved from Firestore to Pinecone

## Troubleshooting

**Firebase auth errors**: Verify service account credentials and project ID

**Pinecone connection issues**: Check API key and region/environment

**Import errors**: Ensure virtual environment is activated and dependencies installed

**Port already in use**: Change port in `.env.local` or use `--port` flag

## License

MIT
