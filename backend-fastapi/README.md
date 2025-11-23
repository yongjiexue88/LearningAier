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

### Running Tests

The backend includes automated tests using pytest. All tests use mocks for Firebase, Pinecone, and Gemini, so they can run without real credentials.

**Run all tests:**
```bash
PYTHONPATH=. pytest -v
```

**Run with coverage:**
```bash
PYTHONPATH=. pytest --cov=app --cov-report=term
```

**Run specific test:**
```bash
PYTHONPATH=. pytest tests/test_api.py::test_health_check
```

**Available tests:**
- `test_health_check` - Health endpoint
- `test_ai_qa` - RAG Q&A endpoint
- `test_ai_translate` - Translation endpoint
- `test_ai_terminology` - Terminology extraction
- `test_generate_flashcards` - Flashcard generation
- `test_review_flashcard` - Flashcard review

**Note:** Tests require virtual environment to be activated:
```bash
source venv/bin/activate
PYTHONPATH=. pytest -v
```

## Deployment

### Docker (Recommended)

### Docker (Recommended)

1. **Build the image:**
   ```bash
   docker build -t learningaier-backend .
   ```

2. **Run locally (passing environment variables):**
   ```bash
   docker run -p 8080:8080 --env-file .env.local learningaier-backend
   ```
   *Note: Ensure your `.env.local` file exists and contains all required credentials.*

### Google Cloud Run Deployment Guide

This guide details how to deploy the FastAPI backend to Google Cloud Run, a serverless container platform.

#### 1. Prerequisites
- **Google Cloud CLI (`gcloud`)**: Installed and authenticated.
- **Billing Enabled**: You must enable billing for your Google Cloud project.
  - *Error if missing*: `FAILED_PRECONDITION: Billing account for project ... is not found.`
  - *Fix*: Go to [Google Cloud Billing](https://console.cloud.google.com/billing) and link a billing account.

#### 2. Initial Setup
Run these commands once to set up your environment.

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project learningaier

# Set your preferred region
gcloud config set run/region us-central1

# Enable required APIs
# - run.googleapis.com: For Cloud Run
# - artifactregistry.googleapis.com: To store Docker images
# - cloudbuild.googleapis.com: To build images in the cloud
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com
```

#### 3. Build and Push Docker Image
We use Cloud Build to build the Docker image and push it to the Google Container Registry (GCR).

```bash
# Submit a build to Cloud Build
# --tag: Specifies the image name and location (gcr.io/PROJECT_ID/IMAGE_NAME)
gcloud builds submit --tag gcr.io/learningaier/backend-api
```

#### 4. Prepare Environment Variables
Cloud Run needs your secrets (API keys, credentials). We use a YAML file to pass them securely.

1. Create a file named `env.yaml` (do NOT commit this to Git).
2. Add your variables. **Important**: All values must be strings (quote numbers).

**`env.yaml` example:**
```yaml
APP_ENV: production
FIREBASE_PROJECT_ID: learningaier
FIREBASE_STORAGE_BUCKET: learningaier.firebasestorage.app
# Paste your full JSON service account key as a single line string
FIREBASE_CREDENTIALS_JSON: '{"type":"service_account",...}'
LLM_PROVIDER: gemini
LLM_MODEL: gemini-2.0-flash-lite
LLM_API_KEY: AIzaSy...
EMBEDDINGS_PROVIDER: gemini
EMBEDDINGS_MODEL: text-embedding-004
EMBEDDINGS_API_KEY: AIzaSy...
EMBEDDINGS_DIMENSIONS: '768'
VECTOR_DB_PROVIDER: pinecone
PINECONE_API_KEY: pcsk_...
PINECONE_INDEX_NAME: learningaier-index
PINECONE_INDEX_HOST: https://...
PINECONE_ENVIRONMENT: us-east-1
```

> **Note**: Do NOT include `PORT` in `env.yaml`. Cloud Run sets this automatically. If you include it, deployment will fail with: `The following reserved env names were provided: PORT`.

#### 5. Deploy to Cloud Run
Deploy the container image to a Cloud Run service.

```bash
# Deploy command breakdown:
# learningaier-api: Name of the Cloud Run service
# --image: The image we built in Step 3
# --platform managed: Use the fully managed Cloud Run platform
# --region: The region to deploy to (us-central1)
# --allow-unauthenticated: Make the API public (required for frontend access)
# --env-vars-file: Load environment variables from our yaml file
gcloud run deploy learningaier-api \
  --image gcr.io/learningaier/backend-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml
```

#### 6. Verification
After deployment, you will see a Service URL (e.g., `https://learningaier-api-xyz.run.app`).

Test the health endpoint:
```bash
curl https://YOUR_SERVICE_URL/health
# Output: {"status":"healthy"}
```

#### 7. Management
You can manage your service (view logs, update variables, rollback) via the Google Cloud Console:
- **Dashboard**: [Cloud Run Console](https://console.cloud.google.com/run)
- **Logs**: [Cloud Logging](https://console.cloud.google.com/logs)

#### Troubleshooting Common Errors

1.  **`FAILED_PRECONDITION: Billing account ... not found`**
    *   **Cause**: Project has no billing account linked.
    *   **Fix**: Enable billing in the Google Cloud Console.

2.  **`The following reserved env names were provided: PORT`**
    *   **Cause**: You included `PORT` in your `env.yaml`.
    *   **Fix**: Remove `PORT` from `env.yaml`. Cloud Run handles port binding automatically.

3.  **`Environment variable values must be strings`**
    *   **Cause**: You had a number (e.g., `8080` or `768`) without quotes in YAML.
    *   **Fix**: Quote all numbers: `PORT: '8080'`, `DIMENSIONS: '768'`.

4.  **`503 Service Unavailable`**
    *   **Cause**: Application failed to start (crashed).
    *   **Fix**: Check Cloud Run logs. Common reasons: missing env vars, invalid API keys, or code errors.

## Automated Deployment (GitHub Actions)

You can set up automated deployment to Cloud Run whenever you push to the `main` branch.

### 1. GitHub Workflow File

The workflow is already configured in `.github/workflows/deploy-backend.yml`. It triggers on:
- Push to `main` branch
- Changes to `backend-fastapi/**` files

### 2. Required GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `GCP_SA_KEY` | Google Cloud service account JSON key | See instructions below |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK credentials | Copy entire content of your Firebase service account JSON file |
| `LLM_API_KEY` | Google Gemini API key | From your `backend-fastapi/.env.local` |
| `PINECONE_API_KEY` | Pinecone API key | From your `backend-fastapi/.env.local` |
| `PINECONE_INDEX_HOST` | Pinecone index URL | From your `backend-fastapi/.env.local` |

### 3. Creating GCP Service Account for Deployment

The `GCP_SA_KEY` needs special permissions to deploy your app. Here's how to create it:

#### Step 1: Create Service Account
1. Go to [GCP Console > IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Name: `github-actions-deploy` (or any name you prefer)
4. Click **"Create and Continue"**

#### Step 2: Grant Required Roles
Add these 3 roles to the service account:

| Role | Why It's Needed | How to Find It |
|------|----------------|----------------|
| **Cloud Run Admin** | Deploy and update Cloud Run services | Search "cloud run" → Select "Cloud Run Admin" |
| **Cloud Build Service Account** | Build Docker images in the cloud | Search "cloud build" → Select "Cloud Build Service Account" |
| **Storage Admin** | Upload build artifacts during deployment | Search "storage admin" → Select "Storage Admin" |

**How roles work**: The service account is like a robot user for GitHub Actions. The JSON key is its password, and roles determine what it can do. Without these roles, the key would be valid but powerless.

Click **"Add another role"** to add all 3 roles to the same service account.

#### Step 3: Generate JSON Key
1. Click **"Done"** to create the service account
2. Find it in the list and **click on the email** to open details
3. Go to the **"KEYS"** tab
4. Click **"ADD KEY" → "Create new key"**
5. Select **"JSON"** format
6. Click **"CREATE"**
7. The JSON file will download automatically

#### Step 4: Add to GitHub Secrets
1. Open the downloaded JSON file in a text editor
2. Copy the **entire contents**
3. Go to GitHub → Settings → Secrets → **"New repository secret"**
4. Name: `GCP_SA_KEY`
5. Value: Paste the JSON content
6. Click **"Add secret"**

**Security**: Delete or secure the downloaded JSON file after adding it to GitHub. Never commit it to Git!

### 4. Testing the Workflow

After adding all secrets, test the deployment:

```bash
# Make a small change to trigger deployment
cd backend-fastapi
echo "# Auto-deploy enabled" >> README.md
git add .
git commit -m "test: trigger auto-deployment"
git push origin main
```

Watch the deployment progress:
1. Go to your GitHub repo → **Actions** tab
2. You'll see the workflow running
3. Click on it to see live logs
4. Once complete, visit your Cloud Run URL to verify

### 5. Managing Deployments

- **View Services**: [Cloud Run Console](https://console.cloud.google.com/run)
- **Check Logs**: Click on your service → **LOGS** tab
- **Rollback**: Click on service → **REVISIONS** → Select previous revision → **Manage traffic**

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
