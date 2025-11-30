# Local Frontend Testing with GKE Backend

**Goal**: Test the GKE backend (`http://34.123.200.75`) from your local frontend without HTTPS mixed content issues.

---

## Quick Start

### 1. Update Frontend Environment
**File**: `frontend/.env.local`

```bash
# Backend API (GKE lab backend)
VITE_API_BASE_URL_LAB=http://34.123.200.75
VITE_API_BASE_URL=http://34.123.200.75

# Or keep localhost for local backend testing
# VITE_API_BASE_URL=http://localhost:8080
```

### 2. Set Backend Preference in Firebase
In your Firebase Firestore, set your user's backend preference:

```javascript
// profiles/{userId}
{
  backend_environment: "lab"  // Uses VITE_API_BASE_URL_LAB
}
```

Or use the frontend Settings page to switch environment.

### 3. Start Local Frontend
```bash
cd frontend
npm run dev
```

**Opens**: `http://localhost:5173` (Vite dev server)

**Why this works**: HTTP frontend can call HTTP backend ✅

---

## Testing Steps

### 1. Open Local Frontend
```bash
cd /Users/yongjiexue/Documents/GitHub/LearningAier/frontend
npm run dev
```

Browser opens at: `http://localhost:5173`

### 2. Check Backend Connection
Open browser console (F12), you should see:

```
🌐 BACKEND ENVIRONMENT
📍 Environment: LAB (Testing)
🔗 Base URL: http://34.123.200.75
```

### 3. Upload a PDF
1. Go to Documents page
2. Upload a PDF
3. Watch the console for:
   - Backend API calls
   - Worker processing logs

### 4. Monitor Backend Logs (in terminal)
```bash
# Watch backend logs for upload requests
kubectl logs -l app=learningaier-backend -f --tail=50

# Watch worker logs for PDF processing
kubectl logs -l app=document-worker -f --tail=50
```

---

## Expected Flow

```
1. Frontend (http://localhost:5173)
   ↓
2. POST http://34.123.200.75/api/documents/upload-process
   ↓
3. Backend Pod processes request
   ↓
4. Backend calls Worker: http://document-worker:8000/process-pdf
   ↓
5. Worker processes PDF
   ↓
6. Frontend polls for completion
```

---

## Common Issues

### Issue: "Backend environment shows Default"
**Solution**: Clear browser cache and reload, or manually call:
```javascript
// In browser console
await apiClient.reload();
```

### Issue: "CORS error"
**Check**: Backend allows localhost origin
```bash
kubectl logs -l app=learningaier-backend --tail=100 | grep CORS
```

### Issue: "Network error"
**Verify**: Backend is accessible
```bash
curl http://34.123.200.75/health
# Should return: {"status":"healthy"}
```

---

## Environment Variables Reference

### Frontend `.env.local`
```bash
# Firebase (same as production)
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=learningaier.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=learningaier
VITE_FIREBASE_STORAGE_BUCKET=learningaier.appspot.com

# Backend URLs
VITE_API_BASE_URL=http://localhost:8080              # For local backend
VITE_API_BASE_URL_LAB=http://34.123.200.75          # For GKE lab backend
VITE_API_BASE_URL_PRODUCTION=https://api.learningaier.com  # For production
```

**How it works**:
- Default: Uses `VITE_API_BASE_URL`
- User sets "lab" in Firestore: Uses `VITE_API_BASE_URL_LAB`
- User sets "production": Uses `VITE_API_BASE_URL_PRODUCTION`

---

## Testing Redis Caching

### 1. Test RAG Cache
```bash
# In browser console, ask same question twice
const question = "What is machine learning?";

// First request (cache miss - slow)
await apiClient.post('/api/notes/ai-qa', {
  question,
  note_id: 'test-note-123'
});

// Second request (cache hit - fast!)
await apiClient.post('/api/notes/ai-qa', {
  question,
  note_id: 'test-note-123'
});
```

Watch backend logs for:
```
❌ RAG cache miss for key: rag:user123:test-note-123:...
💾 Cached RAG result for key: rag:user123:test-note-123:...
✅ RAG cache hit for key: rag:user123:test-note-123:...
```

### 2. Test Rate Limiting
```bash
# Send 25 requests quickly (limit is 20/min for RAG)
for (let i = 0; i < 25; i++) {
  apiClient.post('/api/notes/ai-qa', {
    question: `Test ${i}`,
    note_id: 'test'
  }).catch(e => console.log(`Request ${i}: ${e.message}`));
}
```

Expected: First 20 succeed, last 5 fail with rate limit error

---

## Advantages of Local Testing

✅ **No HTTPS required**: HTTP → HTTP works fine  
✅ **Hot reload**: Frontend changes apply instantly  
✅ **Full DevTools**: React DevTools, Network tab, etc.  
✅ **Easy debugging**: Console logs, breakpoints  
✅ **Fast iteration**: No need to deploy frontend  

---

## Production Deployment (Later)

For production, you'll need:

1. **Domain**: e.g., `api-lab.learningaier.com`
2. **GKE Ingress with SSL**:
   - Google-managed certificate
   - HTTPS → HTTP backend (Ingress terminates SSL)
3. **Update frontend**: `VITE_API_BASE_URL_LAB=https://api-lab.learningaier.com`

But for now, **local testing is the fastest way** to verify everything works!

---

## Summary

**Run this**:
```bash
# 1. Update frontend env (if needed)
# Edit frontend/.env.local: VITE_API_BASE_URL_LAB=http://34.123.200.75

# 2. Start frontend
cd frontend
npm run dev

# 3. In another terminal, watch logs
kubectl logs -l app=learningaier-backend -f
```

**Then**: Open `http://localhost:5173`, upload a PDF, and watch it process! 🎉
