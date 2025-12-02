# Backend Deployment & CORS Fix - Dec 2, 2025

## Issue

Frontend at `https://learningaier-lab.web.app` was getting CORS errors when calling backend at `https://api.learningaier.com`:
```
Access to fetch at 'https://api.learningaier.com/api/*' from origin 'https://learningaier-lab.web.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Root Cause

The deployed backend at `https://api.learningaier.com` was running old code without proper CORS configuration. Local code had `allow_origins=["*"]` but it wasn't deployed.

## Actions Taken

### 1. Created Automated Deployment Workflow
- **File**: `.github/workflows/deploy-backend.yml`
- **Trigger**: Pushes to `main` branch affecting `backend-fastapi/**`
- **Deploys to**: Cloud Run service `learningaier-api` in `learningaier-lab` project

### 2. Manual Redeployment
- Deployed latest backend code with CORS fix to Cloud Run
- Command: `gcloud run deploy learningaier-api --source . --region us-central1 --project learningaier-lab`

## Setup Required

### GitHub Secret Needed

To use the automated workflow, create this GitHub Secret:

**Name**: `GCP_SA_KEY`  
**Value**: Service account JSON key with permissions:
- Cloud Run Admin
- Service Account User  
- Storage Admin (for Cloud Build)

### How to Create Service Account Key

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --project learningaier-lab \
  --display-name="GitHub Actions Deployment"

# Grant permissions
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create github-sa-key.json \
  --iam-account=github-actions@learningaier-lab.iam.gserviceaccount.com

# Copy the contents of github-sa-key.json to GitHub Secrets
cat github-sa-key.json
```

## Current CORS Configuration

```python
# backend-fastapi/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Verification

After deployment completes:
1. Visit `https://learningaier-lab.web.app`
2. Try generating flashcards or loading data
3. Check browser console - CORS errors should be gone
4. API calls should succeed with 200 status codes

## Future Improvements

Consider restricting CORS to specific origins in production:
```python
allow_origins=[
    "https://learningaier-lab.web.app",
    "https://learningaier-lab.firebaseapp.com",
    "http://localhost:5173",  # For local development
]
```
