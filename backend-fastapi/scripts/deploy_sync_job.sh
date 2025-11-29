#!/bin/bash
# Deploy Firestore to BigQuery Sync Job
# Usage: ./scripts/deploy_sync_job.sh

set -e

PROJECT_ID="learningaier-lab"
REGION="us-central1"
REPO_NAME="backend-api-lab"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${REPO_NAME}"
JOB_NAME="firestore-bq-sync"
SCHEDULER_JOB_NAME="trigger-firestore-bq-sync"
SERVICE_ACCOUNT="learningaier-lab-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account exists, if not use default compute
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT} --project ${PROJECT_ID} &>/dev/null; then
    echo "⚠️ Service account ${SERVICE_ACCOUNT} not found. Using default compute service account."
    SERVICE_ACCOUNT="$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
fi

# Read FIREBASE_CREDENTIALS_JSON from .env.local
# We use python to safely extract the value to handle potential quoting issues
FIREBASE_CREDENTIALS_JSON=$(python3 -c "
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
print(os.getenv('FIREBASE_CREDENTIALS_JSON', ''))
")

if [ -z "$FIREBASE_CREDENTIALS_JSON" ]; then
    echo "❌ Error: FIREBASE_CREDENTIALS_JSON not found in .env.local"
    exit 1
fi

echo "🔧 Configuration:"
echo "   Project: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo "   Job Name: ${JOB_NAME}"
echo "   Service Account: ${SERVICE_ACCOUNT}"
echo "   Credentials: Found (length: ${#FIREBASE_CREDENTIALS_JSON})"
echo ""

# 1. Setup Secret Manager
echo "🔐 Setting up Secret Manager..."
gcloud services enable secretmanager.googleapis.com --project ${PROJECT_ID}

SECRET_NAME="firebase-credentials"

# Create secret if not exists
if ! gcloud secrets describe ${SECRET_NAME} --project ${PROJECT_ID} &>/dev/null; then
    echo "   Creating secret ${SECRET_NAME}..."
    gcloud secrets create ${SECRET_NAME} --replication-policy="automatic" --project ${PROJECT_ID}
fi

# Add new version from env var
echo "   Adding new secret version..."
echo -n "${FIREBASE_CREDENTIALS_JSON}" | gcloud secrets versions add ${SECRET_NAME} --data-file=- --project ${PROJECT_ID}

# Grant access to service account
echo "   Granting access to service account..."
gcloud secrets add-iam-policy-binding ${SECRET_NAME} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project ${PROJECT_ID} \
    --condition=None

# 2. Build and Push Image
# (Skipping build if image exists to save time, uncomment to force build)
# echo "🔨 Building container image..."
# gcloud builds submit --tag ${IMAGE_NAME} . --project ${PROJECT_ID}

# 3. Create/Update Cloud Run Job
echo "🚀 Deploying Cloud Run Job: ${JOB_NAME}..."

gcloud run jobs create ${JOB_NAME} \
    --image ${IMAGE_NAME} \
    --command "python" \
    --args "scripts/export_firestore_to_bq.py,--env,lab" \
    --tasks 1 \
    --max-retries 0 \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --service-account ${SERVICE_ACCOUNT} \
    --set-env-vars "APP_ENV=lab" \
    --set-env-vars "BIGQUERY_PROJECT_ID=${PROJECT_ID}" \
    --set-env-vars "BIGQUERY_DATASET_ID=learningaier_analytics" \
    --set-env-vars "FIREBASE_PROJECT_ID=learningaier" \
    --set-env-vars "FIREBASE_STORAGE_BUCKET=learningaier.firebasestorage.app" \
    --set-secrets "FIREBASE_CREDENTIALS_JSON=${SECRET_NAME}:latest" \
    --set-env-vars "LLM_API_KEY=placeholder_for_validation" \
    --set-env-vars "EMBEDDINGS_API_KEY=placeholder_for_validation" \
    --set-env-vars "PINECONE_API_KEY=placeholder_for_validation" \
    --execute-now || gcloud run jobs update ${JOB_NAME} \
        --image ${IMAGE_NAME} \
        --command "python" \
        --args "scripts/export_firestore_to_bq.py,--env,lab" \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --set-env-vars "APP_ENV=lab" \
        --set-env-vars "BIGQUERY_PROJECT_ID=${PROJECT_ID}" \
        --set-env-vars "BIGQUERY_DATASET_ID=learningaier_analytics" \
        --set-env-vars "FIREBASE_PROJECT_ID=learningaier" \
        --set-env-vars "FIREBASE_STORAGE_BUCKET=learningaier.firebasestorage.app" \
        --set-secrets "FIREBASE_CREDENTIALS_JSON=${SECRET_NAME}:latest" \
        --set-env-vars "LLM_API_KEY=placeholder_for_validation" \
        --set-env-vars "EMBEDDINGS_API_KEY=placeholder_for_validation" \
        --set-env-vars "PINECONE_API_KEY=placeholder_for_validation"

# 3. Create Cloud Scheduler Job
echo "⏰ Creating Cloud Scheduler Job..."

# Enable Scheduler API
gcloud services enable cloudscheduler.googleapis.com --project ${PROJECT_ID}

# Create scheduler job
gcloud scheduler jobs create http ${SCHEDULER_JOB_NAME} \
    --schedule "0 3 * * *" \
    --uri "https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
    --http-method POST \
    --oauth-service-account-email ${SERVICE_ACCOUNT} \
    --location ${REGION} \
    --project ${PROJECT_ID} \
    --quiet || echo "Scheduler job already exists (or failed to create). You may need to update it manually."

echo "✅ Deployment complete! Job scheduled for 3 AM daily."
