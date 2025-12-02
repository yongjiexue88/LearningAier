# Environment Deployment Summary

## ✅ Completed Setup

### Local Development
- **Production**: `uvicorn app.main:app --reload --port 8080` (uses `.env.local` → Google AI)
- **Lab**: `ENV=lab uvicorn app.main:app --reload --port 8080` (uses `.env.lab` → Vertex AI)

### GitHub Actions Deployment
- **Production Workflow**: `.github/workflows/deploy-backend.yml`
  - Deploys to: `learningaier` project
  - Uses: Google AI
  - Trigger: Push to main

- **Lab Workflow**: `.github/workflows/deploy-backend-lab.yml`
  - Deploys to: `learningaier-lab` project  
  - Uses: Vertex AI (updated ✅)
  - Trigger: Push to main OR manual trigger

## Next Steps for Cloud Deployment

### 1. Grant Service Account Permissions
Your `GCP_SA_KEY_LAB` service account needs Vertex AI access:

```bash
# Get the service account email from the JSON in your GitHub secret
# Then run:
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

**Or via GCP Console:**
1. IAM & Admin → IAM
2. Find your `github-actions-deploy` service account
3. Edit → Add role: "Vertex AI User"

### 2. Enable Vertex AI API
```bash
gcloud config set project learningaier-lab
gcloud services enable aiplatform.googleapis.com
```

### 3. Deploy
**Option A:** Manual trigger (recommended for first time)
1. Go to GitHub → Actions
2. Select "Deploy Backend to Cloud Run (Lab)"
3. Click "Run workflow"

**Option B:** Automatic (commits the changes)
```bash
git add .
git commit -m "feat: enable Vertex AI for lab deployment"
git push origin main
```

## Documentation Added

1. **README.md** - Added "Environment Switching" section showing:
   - How to run locally with production config
   - How to run locally with lab config (Vertex AI)
   - Comparison table of differences

2. **DEPLOYMENT_ENVIRONMENTS.md** - Complete guide on:
   - How GitHub Actions workflows differ
   - How to configure Vertex AI in Cloud Run deployment
   - Troubleshooting steps
   - Verification after deployment

## Summary

| Env | Local Command | Config File | LLM Provider | Deploy Workflow |
|-----|--------------|-------------|--------------|-----------------|
| **Prod** | `uvicorn app.main:app --reload` | `.env.local` | Google AI | `deploy-backend.yml` |
| **Lab** | `ENV=lab uvicorn app.main:app --reload` | `.env.lab` | Vertex AI | `deploy-backend-lab.yml` ✅ |

Both environments can run simultaneously at different ports or in different terminal windows!
