# Backend Deployment Guide (Prod + Lab)

## Workflows (GitHub Actions)
- **Prod**: `.github/workflows/deploy-backend.yml` → project `learningaier`, service `learningaier-api`, LLM provider: Google AI. Trigger: push to `main`.
- **Lab**: `.github/workflows/deploy-backend-lab.yml` → project `learningaier-lab`, service `learningaier-api-lab`, LLM provider: Vertex AI. Trigger: push to `main` or manual.

### Vertex AI Setup (Lab)
1) Update workflow env vars:
```yaml
--set-env-vars "LLM_PROVIDER=vertex_ai" \
--set-env-vars "VERTEX_PROJECT_ID=learningaier-lab" \
--set-env-vars "VERTEX_LOCATION=us-central1" \
--set-env-vars "VERTEX_GEMINI_MODEL=gemini-2.0-flash-exp" \
--set-env-vars "VERTEX_EMBEDDING_MODEL=text-embedding-004"
```
2) Service account permissions:
```bash
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:YOUR_SA_EMAIL" \
  --role="roles/aiplatform.user"
```
3) Enable API:
```bash
gcloud config set project learningaier-lab
gcloud services enable aiplatform.googleapis.com
```

### Local Commands
```bash
# Prod config
uvicorn app.main:app --reload --port 8080

# Lab config
ENV=lab uvicorn app.main:app --reload --port 8080
```

### Summary Table
| Env  | Local Command | Config File | LLM Provider | Deploy Workflow |
|------|---------------|-------------|--------------|-----------------|
| Prod | `uvicorn app.main:app --reload` | `.env.local` | Google AI | `deploy-backend.yml` |
| Lab  | `ENV=lab uvicorn app.main:app --reload` | `.env.lab` | Vertex AI | `deploy-backend-lab.yml` |

### Manual bootstrap (lab or new env)
1) Set project: `gcloud config set project learningaier-lab`  
2) Create deploy SA:
```bash
gcloud iam service-accounts create github-actions-lab \
  --display-name="GitHub Actions Lab Deployment"
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:github-actions-lab@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```
3) Create key and add to GitHub secret `GCP_SA_KEY_LAB`:
```bash
gcloud iam service-accounts keys create ~/learningaier-lab-key.json \
  --iam-account=github-actions-lab@learningaier-lab.iam.gserviceaccount.com
cat ~/learningaier-lab-key.json  # paste into GitHub secret
```
4) Initial manual deploy (one-time) if needed:
```bash
cd backend-fastapi
gcloud builds submit --tag gcr.io/learningaier-lab/backend-api
gcloud run deploy learningaier-api-lab \
  --image gcr.io/learningaier-lab/backend-api \
  --platform managed --region us-central1 --allow-unauthenticated \
  --set-env-vars "APP_ENV=lab"
```
5) Update frontend envs with the lab URL from the deploy output.

### Verification
```bash
gcloud run services describe learningaier-api       --region=us-central1 --project=learningaier
gcloud run services describe learningaier-api-lab   --region=us-central1 --project=learningaier-lab
```
Check env vars in the service descriptions and hit `/health` on each.
