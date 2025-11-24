# 🚀 How to Run LearningAier Locally

This guide will help you set up and run the LearningAier application locally.

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.11 or higher)
- **Firebase Project** with Firestore and Storage enabled
- **API Keys**:
  - Google Gemini API key (for LLM and embeddings)
  - Pinecone API key (for vector database)

---

## 📁 Project Structure

```
LearningAier/
├── frontend/              # React + Vite frontend
│   ├── firestore.indexes.json # Firestore composite indexes
│   └── ...
├── backend-fastapi/       # FastAPI backend
└── ...
```

---

## 🔧 Step 1: Backend Setup

### 1.1 Navigate to Backend Directory

```bash
cd backend-fastapi
```

### 1.2 Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 1.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 1.4 Configure Environment Variables

Create a `.env.local` file in the `backend-fastapi` directory:

```bash
cp .env.local.template .env.local
```

Edit `.env.local` with your configuration:

```env
# Environment: local
APP_ENV=local
PORT=8080

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# LLM Configuration
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash-lite
LLM_API_KEY=your-gemini-api-key

# Embeddings Configuration
EMBEDDINGS_PROVIDER=gemini
EMBEDDINGS_MODEL=text-embedding-004
EMBEDDINGS_API_KEY=your-gemini-api-key
EMBEDDINGS_DIMENSIONS=768

# Vector DB Configuration (Pinecone)
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=learningaier-index
PINECONE_INDEX_HOST=https://your-index.pinecone.io
PINECONE_ENVIRONMENT=us-east-1
```

> **Important**: For `FIREBASE_CREDENTIALS_JSON`, download your Firebase service account JSON from the Firebase Console and paste the **entire JSON object** as a single line.

### 1.5 Start Backend Server

```bash
uvicorn app.main:app --reload --port 8080
```

You should see:

```
🚀 LearningAier API Starting Up
📍 Environment: local
🔌 Port: 8080
🔥 Firebase Project: your-project-id
✅ Firebase Admin SDK initialized successfully
```

---

## 🎨 Step 2: Frontend Setup

Open a **new terminal window**.

### 2.1 Navigate to Frontend Directory

```bash
cd frontend
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_API_BASE_URL=http://localhost:8080
```

> **Note**: Get these values from your Firebase Project Settings → General → Your apps → Web app.

### 2.4 Start Frontend Dev Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## 🔥 Step 3: Create Firestore Indexes

When you first run the app, you'll see warnings about missing Firestore indexes:

```
Firestore missing index for notes (user_id + sort_order)
Firestore missing index for folders (user_id + sort_order)
```

### Option 1: Automatic (Recommended)

1. Click on the console warning links
2. They will take you directly to the Firebase Console to create the indexes
3. Click "Create Index" and wait 5-10 minutes for them to build

### Option 2: Manual via Firebase CLI

Deploy the indexes from the frontend directory:

```bash
cd frontend
firebase deploy --only firestore:indexes
```

The `firestore.indexes.json` file already contains the required indexes:

```json
{
  "indexes": [
    {
      "collectionGroup": "notes",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "user_id", "order": "ASCENDING"},
        {"fieldPath": "sort_order", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "folders",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "user_id", "order": "ASCENDING"},
        {"fieldPath": "sort_order", "order": "ASCENDING"}
      ]
    }
  ]
}
```

---

## 🎯 Step 4: Test the Application

### 4.1 Sign In

1. Open `http://localhost:5173`
2. Sign in with your Google account (or other configured provider)

### 4.2 Create a Note

1. Navigate to the Notes page
2. Create a new note
3. Add some content

### 4.3 Generate Flashcards

1. Select a note
2. Click "Generate Flashcards"
3. Verify the backend processes the request successfully

---

## 🐛 Troubleshooting

### Authentication Failed Error

**Symptom:**
```
Authentication failed: The default Firebase app does not exist
```

**Solution:**
- Ensure `FIREBASE_CREDENTIALS_JSON` is correctly set in `backend-fastapi/.env.local`
- Restart the backend server
- Check the startup logs for "✅ Firebase Admin SDK initialized successfully"

### Port Already in Use

**Symptom:**
```
Error: Address already in use
```

**Solution:**

```bash
# Find the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change the port in .env.local
PORT=8787
```

### Firestore Indexes Not Building

**Symptom:**
- Warnings persist after creating indexes

**Solution:**
- Indexes can take 5-15 minutes to build
- Check index status in Firebase Console → Firestore → Indexes
- The app will work with client-side sorting until indexes are ready

### CORS Errors

**Symptom:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
- Ensure backend is running on `http://localhost:8080`
- Ensure frontend `.env.local` has `VITE_API_BASE_URL=http://localhost:8080`
- Check backend CORS configuration allows `http://localhost:5173`

---

## 📝 Development Workflow

### Running Both Services Together

**Terminal 1 - Backend:**
```bash
cd backend-fastapi
source venv/bin/activate
uvicorn app.main:app --reload --port 8080
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Viewing API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

### Checking Logs

Both services provide detailed logging:

**Backend logs:**
- Request/response details
- Authentication status
- Database queries
- LLM API calls

**Frontend logs:**
- API requests (in browser console)
- Firebase configuration
- Query status

---

## 🔐 Security Notes

- **Never commit** `.env.local` files to git (they're in `.gitignore`)
- **Never share** your service account JSON or API keys
- For production, use environment-specific configurations
- The backend CORS is set to `allow_origins=["*"]` for local development - **restrict this in production**

---

## 📚 Next Steps

- [Architecture Documentation](./ARCHITECTURE.md)
- [Project Overview](./README.md)
- [Development Guide](./.gemini.md)
- [Todo List](./todo.md)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs in both frontend and backend
2. Verify all environment variables are correctly set
3. Ensure Firebase project has Firestore and Storage enabled
4. Check that Pinecone index is created and accessible
5. Review the [troubleshooting section](#-troubleshooting) above
