# GitHub Actions Deployment for Different Environments

## Overview

You have **two GitHub Actions workflows** for automated deployment:

1. **`deploy-backend.yml`** → Production (`learningaier` project, Google AI)
2. **`deploy-backend-lab.yml`** → Lab (`learningaier-lab` project, configurable for Vertex AI)

## Current Setup

### Production Workflow (`deploy-backend.yml`)
- **Project:** `learningaier`
- **Service:** `learningaier-api`
- **LLM Provider:** Google AI (`LLM_PROVIDER=gemini`)
- **Triggers:** Push to `main` branch
- **Secret:** `GCP_SA_KEY`

### Lab Workflow (`deploy-backend-lab.yml`)
- **Project:** `learningaier-lab`
- **Service:** `learningaier-api-lab` 
- **LLM Provider:** Currently Google AI (line 80: `LLM_PROVIDER=gemini`)
- **Triggers:** Push to `main` branch OR manual trigger
- **Secret:** `GCP_SA_KEY_LAB`

## ✅ How to Deploy with Vertex AI in Lab Environment

To use Vertex AI in the lab deployment, you need to:

### 1. Update Environment Variables in Workflow

Edit `.github/workflows/deploy-backend-lab.yml` and change line 80:

**FROM:**
```yaml
--set-env-vars "LLM_PROVIDER=gemini" \
```

**TO:**
```yaml
--set-env-vars "LLM_PROVIDER=vertex_ai" \
```

### 2. Add Vertex AI Environment Variables

Add these lines after line 80 in `deploy-backend-lab.yml`:

```yaml
--set-env-vars "VERTEX_PROJECT_ID=learningaier-lab" \
--set-env-vars "VERTEX_LOCATION=us-central1" \
--set-env-vars "VERTEX_GEMINI_MODEL=gemini-2.0-flash-exp" \
--set-env-vars "VERTEX_EMBEDDING_MODEL=text-embedding-004" \
```

### 3. Grant Service Account Permissions

The service account for `GCP_SA_KEY_LAB` needs the **Vertex AI User** role:

```bash
# Get the service account email from your GCP_SA_KEY_LAB secret
# It looks like: github-actions-deploy@learningaier-lab.iam.gserviceaccount.com

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

Or via GCP Console:
1. Go to **IAM & Admin** → **IAM**
2. Find your `github-actions-deploy` service account
3. Click **Edit** (pencil icon)
4. **Add Another Role** → Search "Vertex AI User"
5. **Save**

### 4. Enable Vertex AI API

```bash
gcloud config set project learningaier-lab
gcloud services enable aiplatform.googleapis.com
```

### 5. Deploy

**Option 1: Push to trigger auto-deploy**
```bash
git add .github/workflows/deploy-backend-lab.yml
git commit -m "feat: enable Vertex AI for lab environment"
git push origin main
```

**Option 2: Manual trigger**
1. Go to GitHub → Actions tab
2. Select "Deploy Backend to Cloud Run (Lab)"
3. Click "Run workflow"

## Workflow Comparison After Changes

| Setting | Production | Lab (with Vertex AI) |
|---------|-----------|----------------------|
| **Project** | `learningaier` | `learningaier-lab` |
| **LLM Provider** | Google AI | Vertex AI |
| **Service Name** | `learningaier-api` | `learningaier-api-lab` |
| **Trigger** | Push to main only | Push to main OR manual |
| **GCP Secret** | `GCP_SA_KEY` | `GCP_SA_KEY_LAB` |
| **Firebase Project** | `learningaier` | `learningaier` (shared) |
| **Embeddings Namespace** | Default | Lab-isolated |

## Verification After Deployment

1. **Check Cloud Run Service:**
   ```bash
   gcloud run services describe learningaier-api-lab --region=us-central1 --project=learningaier-lab
   ```

2. **Check Environment Variables:**
   ```bash
   gcloud run services describe learningaier-api-lab \
     --region=us-central1 \
     --project=learningaier-lab \
     --format="value(spec.template.spec.containers[0].env)"
   ```

   Look for:
   ```
   LLM_PROVIDER=vertex_ai
   VERTEX_PROJECT_ID=learningaier-lab
   ```

3. **Test the Deployed Service:**
   ```bash
   curl https://learningaier-api-lab-YOUR-URL.run.app/health
   # Should return: {"status":"healthy"}
   ```

4. **Check Logs for Vertex AI Initialization:**
   - Go to Cloud Run Console → `learningaier-api-lab` → **LOGS**
   - Look for: `✅ Vertex AI initialized (Project: learningaier-lab, Location: us-central1)`

## Troubleshooting

**Error: "Permission denied for Vertex AI"**
- Solution: Grant `roles/aiplatform.user` to the service account (see step 3 above)

**Error: "API aiplatform.googleapis.com is not enabled"**
- Solution: Enable the API (see step 4 above)

**Deployment succeeds but app crashes on startup**
- Check Cloud Run logs for the actual error
- Common issue: Missing `VERTEX_PROJECT_ID` environment variable

## Best Practices

1. **Keep Production Separate:** Never deploy Vertex AI changes to production without thorough testing in lab first
2. **Use Manual Triggers:** The lab workflow supports manual triggers - use them for testing
3. **Monitor Costs:** Vertex AI pricing differs from Google AI - monitor your usage in GCP Console
4. **Version Control:** Always commit workflow changes so they're tracked and reviewable
