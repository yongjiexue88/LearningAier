#!/bin/bash
set -e

# Configuration
PROJECT_ID="learningaier-lab"
REGION="us-central1"
IMAGE_NAME="flashcard-trainer"
IMAGE_URI="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest"
STAGING_BUCKET="gs://${PROJECT_ID}-ml-staging"
MODEL_OUTPUT_DIR="gs://${PROJECT_ID}-ml-models/flashcard-model"

# Ensure buckets exist (optional, might fail if no permissions to create)
# gsutil mb -p ${PROJECT_ID} -l ${REGION} ${STAGING_BUCKET} || true
# gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-ml-models || true

echo "🔨 Building Docker image..."
gcloud builds submit --tag ${IMAGE_URI} . --project ${PROJECT_ID}

echo "🚀 Submitting Custom Job..."
python3 run_custom_job.py \
    --project-id ${PROJECT_ID} \
    --location ${REGION} \
    --staging-bucket ${STAGING_BUCKET} \
    --image-uri ${IMAGE_URI} \
    --model-output-dir ${MODEL_OUTPUT_DIR} \
    # --service-account "your-service-account@..."

echo "✅ Done."
