# Dual Environment Setup Instructions

This guide walks you through the remaining manual steps to complete the dual-environment setup for learningaier-lab.

## Prerequisites

✅ **Completed:**
- Created `learningaier-lab` Google Cloud project
- Enabled required APIs (Cloud Run, AI Platform, Container Registry, Cloud Build, BigQuery)
- Updated frontend environment files
- Added backend environment toggle to Settings page
- Updated CI/CD workflow to deploy to both environments

## Required Manual Steps

### 1. Create Service Account for Lab Environment

You need a service account key for the `learningaier-lab` project to enable CI/CD deployments.

```bash
# Set project to learningaier-lab
gcloud config set project learningaier-lab

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment"

# Grant necessary permissions
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create ~/learningaier-lab-key.json \
  --iam-account=github-actions@learningaier-lab.iam.gserviceaccount.com

# Display the key (copy this for GitHub secrets)
cat ~/learningaier-lab-key.json
```

### 2. Add GitHub Secret

1. Go to your GitHub repository: https://github.com/[username]/LearningAier
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY_LAB`
5. Value: Paste the entire contents of `learningaier-lab-key.json`
6. Click **Add secret**

### 3. Initial Lab Deployment

Before the CI/CD can work, you need to deploy the Cloud Run service manually once:

```bash
# Ensure you're in the project root
cd /Users/yongjiexue/Documents/GitHub/LearningAier

# Set project to learningaier-lab
gcloud config set project learningaier-lab

# Build and deploy
cd backend-fastapi
gcloud builds submit --tag gcr.io/learningaier-lab/backend-api

# Deploy to Cloud Run (replace secrets with actual values)
gcloud run deploy learningaier-lab-api \
  --image gcr.io/learningaier-lab/backend-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout=300 \
  --cpu-boost \
  --set-env-vars "APP_ENV=lab" \
  --set-env-vars "FIREBASE_PROJECT_ID=learningaier" \
  --set-env-vars "FIREBASE_STORAGE_BUCKET=learningaier.firebasestorage.app" \
  --set-env-vars "FIREBASE_CREDENTIALS_JSON=<BASE64_ENCODED_CREDENTIALS>" \
  --set-env-vars "LLM_PROVIDER=gemini" \
  --set-env-vars "LLM_MODEL=gemini-2.0-flash-lite" \
  --set-env-vars "LLM_API_KEY=<YOUR_API_KEY>" \
  --set-env-vars "EMBEDDINGS_PROVIDER=gemini" \
  --set-env-vars "EMBEDDINGS_MODEL=text-embedding-004" \
  --set-env-vars "EMBEDDINGS_API_KEY=<YOUR_API_KEY>" \
  --set-env-vars "EMBEDDINGS_DIMENSIONS=768" \
  --set-env-vars "VECTOR_DB_PROVIDER=pinecone" \
  --set-env-vars "PINECONE_API_KEY=<YOUR_PINECONE_KEY>" \
  --set-env-vars "PINECONE_INDEX_NAME=learningaier-index" \
  --set-env-vars "PINECONE_INDEX_HOST=<YOUR_PINECONE_HOST>" \
  --set-env-vars "PINECONE_ENVIRONMENT=us-east-1"
```

After deployment, note the URL (e.g., `https://learningaier-lab-api-286370893156.us-central1.run.app`)

### 4. Update Environment Files with Lab URL

Once you have the lab URL, update the following files:

**`frontend/.env.local`:**
```env
VITE_API_BASE_URL_LAB=https://learningaier-lab-api-286370893156.us-central1.run.app
```

**`frontend/.env.production`:**
```env
VITE_API_BASE_URL_LAB=https://learningaier-lab-api-286370893156.us-central1.run.app
```

Replace `TBD` with the actual lab URL.

### 5. Test the Setup

1. **Local Testing:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Navigate to Settings
   - Switch between Production and Lab environments
   - Check browser console for API client reload logs

2. **Verify CI/CD:**
   - Commit and push any small change to the `main` branch
   - Go to GitHub Actions and watch the deployment
   - Both `deploy-production` and `deploy-lab` jobs should run in parallel
   - Both should complete successfully

3. **Test Environment Switching:**
   - Open the deployed frontend
   - Go to Settings
   - Switch to "Lab" environment and save
   - Trigger an API call (e.g., generate flashcards)
   - Check browser DevTools Network tab to confirm requests go to lab URL
   - Switch back to "Production" and verify requests go to production URL

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           GitHub Actions (CI/CD)            │
│  ┌────────────────────────────────────┐    │
│  │  1. Build (once)                   │    │
│  │     gcr.io/learningaier/backend    │    │
│  └────────────────────────────────────┘    │
│           │                      │          │
│           ▼                      ▼          │
│  ┌──────────────────┐  ┌──────────────────┐│
│  │ deploy-production│  │   deploy-lab     ││
│  │  learningaier    │  │ learningaier-lab ││
│  └──────────────────┘  └──────────────────┘│
└─────────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐    ┌──────────────────┐
│   Production     │    │   Lab Environment│
│  learningaier-api│    │learningaier-lab  │
│  (Stable)        │    │     (Testing)    │
└──────────────────┘    └──────────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
              ┌──────────────┐
              │   Firebase   │
              │ (Shared Data)│
              └──────────────┘
```

## Troubleshooting

**Issue: CI/CD fails with "permission denied"**
- Ensure `GCP_SA_KEY_LAB` secret is set correctly in GitHub
- Verify the service account has the required IAM roles

**Issue: Lab deployment shows "service not found"**
- Run the initial manual deployment (step 3) first
- Cloud Run services must exist before CI/CD can update them

**Issue: Environment toggle doesn't work**
- Check browser console for errors
- Verify `VITE_API_BASE_URL_PRODUCTION` and `VITE_API_BASE_URL_LAB` are set in `.env` files
- Clear browser cache and hard refresh

**Issue: Docker image copy fails in CI/CD**
- The workflow pulls from production registry and pushes to lab registry
- Ensure both service accounts have storage admin permissions

## Next Steps

After completing this setup:
- You can develop and test new features on the lab backend
- Production remains stable and unchanged
- Switch between environments using the Settings page toggle
- Every commit to `main` automatically deploys to both environments
