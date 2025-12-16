#!/bin/bash
set -e

# Configuration
PROJECT_ID="learningaier-lab"
REGION="us-central1"
BACKEND_SERVICE="learningaier-backend-prod"
WORKER_SERVICE="learningaier-worker-prod"

echo "========================================================"
echo "🚀 Starting Migration Deployment to Cloud Run (Production)"
echo "========================================================"

# 1. Deploy Worker Service
echo "deploying worker service..."
gcloud run services replace deploy-manifests/worker-prod.yaml \
    --region "$REGION" \
    --project "$PROJECT_ID"

# 2. Get Worker URL
echo "Getting Worker URL..."
WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format 'value(status.url)')

echo "✅ Worker URL: $WORKER_URL"

# 2a. Make Worker Public (optional but likely needed for inter-service if not using internal auth)
echo "Making Worker public..."
gcloud run services add-iam-policy-binding "$WORKER_SERVICE" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region "$REGION" \
    --project "$PROJECT_ID"

# 3. Deploy Backend Service with Worker URL
echo "Deploying Backend service..."
# We use 'replace' to apply the YAML, but we also want to inject the dynamic WORKER_URL.
# 'gcloud run services replace' doesn't easily support env var overrides on the fly without editing the file.
# So we will:
#   a. Apply the YAML first to establish the baseline configuration.
#   b. Update the service to set the WORKER_SERVICE_URL env var.

echo "Applying backend manifest..."
gcloud run services replace deploy-manifests/backend-prod.yaml \
    --region "$REGION" \
    --project "$PROJECT_ID"

echo "Updating backend with Worker URL..."
gcloud run services update "$BACKEND_SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-env-vars WORKER_SERVICE_URL="$WORKER_URL"

# 3a. Make Backend Public
echo "Making Backend public..."
gcloud run services add-iam-policy-binding "$BACKEND_SERVICE" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region "$REGION" \
    --project "$PROJECT_ID"

# 4. Final verification
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format 'value(status.url)')

echo "========================================================"
echo "✅ Deployment Complete!"
echo "backend URL: $BACKEND_URL"
echo "Worker URL:  $WORKER_URL"
echo "========================================================"
echo "Next Steps:"
echo "1. Verify health: curl $BACKEND_URL/health"
echo "2. Update your frontend to point to $BACKEND_URL (or map your custom domain to this service)"
