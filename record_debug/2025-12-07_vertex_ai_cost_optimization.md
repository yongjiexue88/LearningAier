# Vertex AI Cost Optimization - 2025-12-07

## Goal
Reduce Vertex AI costs (~$4.70/day) and Cloud Build costs (~$1.30).

## Changes Made

### 1. ML Prediction - Local Inference
- Migrated from Vertex AI Endpoint to local `joblib`/`xgboost` model
- Model path: `backend-fastapi/local_model_artifacts/model.joblib`
- Added dependencies: `scikit-learn`, `joblib`, `xgboost`

### 2. LLM Provider - Google AI (Gemini API)
- Updated `k8s/backend-deployment.yaml` to use `google_ai` provider
- Requires k8s secret `google-ai-config` with `api_key`

### 3. Cloud Build
- Downgraded machine type from `E2_HIGHCPU_8` to `E2_MEDIUM`

### 4. Embedding Optimization
- Changed `vertex_llm_client.py` to use batch embedding requests

## Verification
- Local ML model: ✅ Working
- Backend tests: ✅ 5/5 passed

## Deployment Notes
Before deploying to GKE:
```bash
kubectl create secret generic google-ai-config --from-literal=api_key=YOUR_GEMINI_API_KEY
kubectl apply -f k8s/backend-deployment.yaml
```

## Files Modified
- `backend-fastapi/app/services/ml_prediction_service.py`
- `backend-fastapi/app/services/vertex_llm_client.py`
- `backend-fastapi/requirements.txt`
- `backend-fastapi/cloudbuild.yaml`
- `k8s/backend-deployment.yaml`
- `backend-fastapi/tests/test_api_flashcards.py`
