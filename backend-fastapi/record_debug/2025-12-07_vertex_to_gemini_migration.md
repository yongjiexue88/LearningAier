# Vertex AI to Gemini API Migration Progress

**Date**: 2025-12-07  
**Status**: ✅ Config complete across environments; 🚀 production rollout pending (see checklist)

## Summary

Backend and worker were switched from Vertex AI to the Gemini API (`google_ai`). Router logic already supported Gemini, so only configuration changes were required. Local, Cloud Run (dev/staging), and GKE manifests now point to Gemini with API-key auth.

## Environment Readiness

| Environment | File/Service | LLM Provider | Secret Source | Status |
|-------------|--------------|--------------|---------------|--------|
| Local | `backend-fastapi/.env.local` | `google_ai` | Direct API key | ✅ Tested |
| Cloud Run Dev | `deploy-manifests/backend-dev.yaml` | `google_ai` | Secret Manager `gemini-api-key` | ✅ Ready |
| Cloud Run Staging | `deploy-manifests/backend-staging.yaml` | `google_ai` | Secret Manager `gemini-api-key` | ✅ Ready |
| GKE Backend | `k8s/backend-deployment.yaml` | `google_ai` | K8s secret `gemini-config` | 🟡 Needs apply + secret |
| GKE Worker | `k8s/worker-deployment.yaml` | `google_ai` | K8s secret `gemini-config` | 🟡 Needs apply + secret |

## Files Modified

### Local Environment
- `backend-fastapi/.env.local`: set `LLM_PROVIDER=google_ai`, `LLM_MODEL=gemini-2.0-flash-exp`, and Gemini API key

### Kubernetes Manifests (GKE)
- `k8s/backend-deployment.yaml`: set LLM/embeddings provider to Google AI; pull `LLM_API_KEY`/`EMBEDDINGS_API_KEY` from `gemini-config`; explicit embeddings model
- `k8s/worker-deployment.yaml`: same Gemini switch and secret wiring; removed Vertex-only vars

### Cloud Run Manifests
- `deploy-manifests/backend-dev.yaml`: `LLM_PROVIDER=google_ai`, `LLM_API_KEY`/`EMBEDDINGS_API_KEY` from Secret Manager `gemini-api-key`
- `deploy-manifests/backend-staging.yaml`: same as dev

## Testing Results

### Local ✅
- Server boots showing `🤖 LLM Provider: google_ai`
- Health and root endpoints passing
- API tests: `20 passed, 6 failed` (known worker test issues pre-migration)
  - Passing coverage includes: `test_ai_qa`, `test_ai_translate`, `test_ai_terminology`, `test_generate_flashcards`, `test_review_flashcard`, etc.

## Production Deployment (GKE)

1. **Create or update secret**  
   ```bash
   kubectl create secret generic gemini-config \
     --from-literal=api_key="$GEMINI_API_KEY" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. **Apply manifests**  
   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/worker-deployment.yaml
   ```

3. **Verify rollout and logs**  
   ```bash
   kubectl rollout status deployment/learningaier-backend
   kubectl rollout status deployment/document-worker
   kubectl logs -l app=learningaier-backend --tail=100
   kubectl logs -l app=document-worker --tail=100
   ```

4. **Smoke tests (prod endpoints)**  
   - Chat: `POST /api/chat/send`
   - Flashcards: `POST /api/flashcards/generate`
   - RAG: `POST /api/notes/ai-qa`
   Confirm responses come from Gemini and no Vertex-specific errors appear.

## Cloud Run Dev/Staging Promotion
- Ensure Secret Manager `gemini-api-key` latest version holds the Gemini API key
- Deploy manifests via Cloud Deploy or `gcloud run services replace deploy-manifests/backend-<env>.yaml`
- Hit dev/staging endpoints to confirm Gemini responses

## Rollback Plan

If issues occur after production deployment:

1. Change `LLM_PROVIDER` back to `vertex_ai` in manifests
2. Re-apply the previous manifests
3. Existing Workload Identity configuration remains valid for Vertex

## Notes

- `/reindex-lab-vertex` remains Vertex-specific and will return 400 under Gemini
- ML Prediction Service uses local model (not a Vertex AI Endpoint)
- `FLASHCARD_MODEL_ENDPOINT_ID` config is unused; can be removed in a later cleanup
