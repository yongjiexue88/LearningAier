# Lab Deployment Setup Guide
## Complete Step-by-Step: Creating learningaier-api-lab Service

This guide documents the complete process of setting up the `learningaier-api-lab` Cloud Run service in the `learningaier-lab` GCP project.

---

## 📋 Overview

**Objective**: Deploy the backend API to a separate lab environment for testing
- **Project**: `learningaier-lab` (Project ID: 286370893156)
- **Service Name**: `learningaier-api-lab`
- **Region**: `us-central1`
- **Final URL**: `https://learningaier-api-lab-286370893156.us-central1.run.app`

---

## Step 1: Set Active GCP Project

First, set the active project to `learningaier-lab`:

```bash
gcloud config set project learningaier-lab
```

**Output**: `Updated property [core/project].`

---

## Step 2: Enable Required APIs

Enable all necessary Google Cloud APIs for Cloud Run, Cloud Build, and Container Registry:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  iam.googleapis.com
```

**What this does**:
- `run.googleapis.com` - Cloud Run for deploying containers
- `cloudbuild.googleapis.com` - Cloud Build for building Docker images
- `containerregistry.googleapis.com` - Container Registry for storing images
- `iam.googleapis.com` - IAM for managing service accounts and permissions

---

## Step 3: Create Service Account

Create a dedicated service account for GitHub Actions deployment:

```bash
gcloud iam service-accounts create github-actions-lab \
  --display-name="GitHub Actions Lab Deployment" \
  --description="Service account for deploying to Cloud Run from GitHub Actions (Lab Environment)"
```

**Service Account Created**: `github-actions-lab@learningaier-lab.iam.gserviceaccount.com`

---

## Step 4: Grant IAM Permissions (Initial)

Grant the initial set of permissions to the service account:

### 4.1 Cloud Run Admin
Allows deploying and managing Cloud Run services:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### 4.2 Cloud Build Editor
Allows creating and managing Cloud Build jobs:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"
```

### 4.3 Service Account User
Allows the service account to act as other service accounts:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 4.4 Storage Admin
Allows pushing/pulling container images to/from Google Container Registry:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

---

## Step 5: Create and Download Service Account Key

Generate a JSON key file for the service account:

```bash
gcloud iam service-accounts keys create ~/Downloads/github-actions-lab-key.json \
  --iam-account=github-actions-lab@learningaier-lab.iam.gserviceaccount.com
```

**Output**: Key saved to `/Users/yongjiexue/Downloads/github-actions-lab-key.json`

To view the key:
```bash
cat ~/Downloads/github-actions-lab-key.json
```

---

## Step 6: Add GitHub Secret

Add the service account key to GitHub repository secrets:

1. Go to: `https://github.com/[your-username]/LearningAier`
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name**: `GCP_SA_KEY_LAB`
5. **Value**: Paste the entire JSON content from the key file
6. Click **"Add secret"**

---

## Step 7: Create GitHub Actions Workflow

Created a new workflow file at `.github/workflows/deploy-backend-lab.yml`:

**Key Configuration**:
- Project: `learningaier-lab`
- Service: `learningaier-api-lab`
- Repository: `backend-api-lab`
- Environment: `lab`
- Uses same Firebase and Pinecone as production

---

## Step 8: First Deployment Attempt

Pushed code to trigger GitHub Actions workflow.

**Result**: ❌ Failed with permission error

**Error Message**:
```
ERROR: [github-actions-lab@learningaier-lab.iam.gserviceaccount.com] does not have 
permission to access namespaces instance [learningaier-lab] (or it may not exist): 
Permission "artifactregistry.repositories.downloadArtifacts" denied on resource 
"projects/learningaier-lab/locations/us/repositories/gcr.io"
```

---

## Step 9: Fix Missing Permissions 🔧

The error indicated missing Artifact Registry permissions. Added the required permissions:

### 9.1 Artifact Registry Reader
Allows the service account to pull/download container images:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### 9.2 Storage Admin for Cloud Build Service Account
Ensures Cloud Build can push images to GCR:

```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:286370893156@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"
```

---

## Step 10: Successful Deployment ✅

Re-ran the GitHub Actions workflow.

**Result**: ✅ Success!

**Service Created**:
- **Name**: `learningaier-api-lab`
- **URL**: `https://learningaier-api-lab-286370893156.us-central1.run.app`
- **Region**: `us-central1`
- **Status**: Active and running

---

## Step 11: Update Frontend Configuration

Updated environment files to include the lab API URL:

### 11.1 Updated `.env.local`
```bash
VITE_API_BASE_URL_LAB=https://learningaier-api-lab-286370893156.us-central1.run.app
```

### 11.2 Updated `.env.production`
```bash
VITE_API_BASE_URL_LAB=https://learningaier-api-lab-286370893156.us-central1.run.app
```

---

## 📊 Final IAM Permissions Summary

The `github-actions-lab` service account has the following roles:

| Role | Purpose |
|------|---------|
| `roles/run.admin` | Deploy and manage Cloud Run services |
| `roles/cloudbuild.builds.editor` | Create and manage Cloud Build jobs |
| `roles/iam.serviceAccountUser` | Act as other service accounts |
| `roles/storage.admin` | Manage Google Container Registry |
| `roles/artifactregistry.reader` | Pull container images from registry |

The Cloud Build service account (`286370893156@cloudbuild.gserviceaccount.com`) has:

| Role | Purpose |
|------|---------|
| `roles/storage.admin` | Push container images to GCR |

---

## 🔍 Key Differences from Production

| Aspect | Production | Lab |
|--------|-----------|-----|
| **Project** | `learningaier` | `learningaier-lab` |
| **Service Name** | `learningaier-api` | `learningaier-api-lab` |
| **URL** | `learningaier-api-330193246496...` | `learningaier-api-lab-286370893156...` |
| **Environment Variable** | `APP_ENV=production` | `APP_ENV=lab` |
| **GitHub Secret** | `GCP_SA_KEY` | `GCP_SA_KEY_LAB` |

**Shared Resources**:
- Same Firebase project
- Same Pinecone index
- Same LLM API keys

---

## 🚀 How to Deploy

The deployment happens automatically via GitHub Actions:

1. **Automatic**: Push to `main` branch
2. **Manual**: Go to Actions → "Deploy Backend to Cloud Run (Lab)" → "Run workflow"

The workflow:
1. Builds the Docker image
2. Pushes to Google Container Registry
3. Deploys to Cloud Run (creates service on first run)
4. Sets environment variables

---

## ✅ Verification

Check that the service is running:

```bash
# Set project
gcloud config set project learningaier-lab

# List Cloud Run services
gcloud run services list --region=us-central1

# Get service details
gcloud run services describe learningaier-api-lab --region=us-central1

# Test the API
curl https://learningaier-api-lab-286370893156.us-central1.run.app/health
```

---

## 🔐 Security Notes

1. **Service Account Key**: The JSON key file contains sensitive credentials
   - Added to GitHub Secrets (encrypted)
   - Local file should be deleted after adding to GitHub: `rm ~/Downloads/github-actions-lab-key.json`

2. **Public Access**: The service is currently set to `--allow-unauthenticated`
   - Anyone can access the API
   - Firebase Auth handles application-level authentication

3. **Environment Isolation**: Lab and Production are completely separate
   - Different GCP projects
   - Separate Cloud Run services
   - Same Firebase/Pinecone (shared data)

---

## 📝 Troubleshooting

If deployment fails, check:

1. **APIs Enabled**: Ensure all required APIs are enabled
2. **Permissions**: Verify service account has all required roles
3. **GitHub Secret**: Confirm `GCP_SA_KEY_LAB` is correctly set
4. **Workflow File**: Check `.github/workflows/deploy-backend-lab.yml` syntax
5. **Cloud Build Logs**: View in GCP Console → Cloud Build → History

---

## 🎯 Summary

**Total Steps**: 11 main steps
**Time to Complete**: ~15-20 minutes
**Command Count**: 10 gcloud commands executed
**Permissions Added**: 6 IAM role bindings (5 initial + 1 fix)
**Files Modified**: 3 files (2 env files + 1 workflow)

**Result**: Fully functional lab backend environment running in parallel with production! 🎉
