# Cloud Build & Cloud Deploy Guide

This guide explains how to use the CI/CD pipeline for automated builds and deployments.

## Overview

The LearningAier project uses:
- **Cloud Build** for automated container image builds
- **Cloud Deploy** for progressive delivery (dev → staging → prod)
- **GKE Autopilot** for worker microservices

## Architecture

```
GitHub Push → Cloud Build Trigger → Build Image → Push to Artifact Registry
                                                           ↓
                                            Cloud Deploy → Dev → Staging
```

## Setup (One-Time)

### 1. Enable APIs

```bash
gcloud config set project learningaier-lab

gcloud services enable \
  cloudbuild.googleapis.com \
  clouddeploy.googleapis.com \
  artifactregistry.googleapis.com \
  container.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create backend-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Container images for LearningAier backend and workers"
```

### 3. Grant Cloud Build Permissions

```bash
# Get Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe learningaier-lab --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant permissions
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"
```

### 4. Connect GitHub Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **Connect Repository**
3. Select **GitHub** → Authenticate → Select `LearningAier` repo
4. Click **Connect**

### 5. Create Build Triggers

**Backend Trigger:**
```bash
gcloud builds triggers create github \
  --name="backend-build-main" \
  --repo-name="LearningAier" \
  --repo-owner="yongjiexue88" \
  --branch-pattern="^main$" \
  --build-config="backend-fastapi/cloudbuild.yaml" \
  --substitutions="_ENV=dev"
```

**Worker Trigger:**
```bash
gcloud builds triggers create github \
  --name="worker-build-main" \
  --repo-name="LearningAier" \
  --repo-owner="yongjiexue88" \
  --branch-pattern="^main$" \
  --build-config="backend-fastapi/cloudbuild-worker.yaml"
```

### 6. Deploy Cloud Deploy Pipeline

```bash
cd /Users/yongjiexue/Documents/GitHub/LearningAier

gcloud deploy apply \
  --file=clouddeploy.yaml \
  --region=us-central1 \
  --project=learningaier-lab
```

## Usage

### Automatic Deployment on Git Push

1. Make code changes
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```
3. Cloud Build automatically:
   - Builds Docker image
   - Pushes to Artifact Registry
   - Triggers Cloud Deploy to **dev** environment
4. Check deployment status:
   ```bash
   gcloud deploy releases list \
     --delivery-pipeline=learningaier-backend-pipeline \
     --region=us-central1
   ```

### Manual Promotion to Staging

1. Go to [Cloud Deploy console](https://console.cloud.google.com/deploy/delivery-pipelines)
2. Select `learningaier-backend-pipeline`
3. Find the latest release in **dev**
4. Click **Promote** → **Promote to staging**
5. Review changes and **Confirm**

**Or via CLI:**
```bash
# Get latest release name
RELEASE=$(gcloud deploy releases list \
  --delivery-pipeline=learningaier-backend-pipeline \
  --region=us-central1 \
  --limit=1 \
  --format="value(name)")

# Promote to staging
gcloud deploy releases promote \
  --release=$RELEASE \
  --delivery-pipeline=learningaier-backend-pipeline \
  --region=us-central1 \
  --to-target=learningaier-backend-stg
```

### Manual Build Trigger

```bash
# Trigger backend build
gcloud builds triggers run backend-build-main --branch=main

# Trigger worker build
gcloud builds triggers run worker-build-main --branch=main
```

### View Build Logs

```bash
# List recent builds
gcloud builds list --limit=5

# View specific build
BUILD_ID=<build-id-from-above>
gcloud builds log $BUILD_ID
```

## Rollback

If a deployment has issues:

```bash
# List releases
gcloud deploy releases list \
  --delivery-pipeline=learningaier-backend-pipeline \
  --region=us-central1

# Find previous good release and promote it
gcloud deploy releases promote \
  --release=<previous-release-name> \
  --delivery-pipeline=learningaier-backend-pipeline \
  --region=us-central1 \
  --to-target=learningaier-backend-stg
```

Or via Cloud Run directly:
```bash
gcloud run services update-traffic learningaier-api-stg \
  --to-revisions=<previous-revision-name>=100 \
  --region=us-central1
```

## Cost Monitoring

- **Cloud Build**: First 120 build-minutes/day free, then $0.003/build-minute
- **Cloud Deploy**: Free for basic pipelines
- **Artifact Registry**: $0.10/GB/month storage

Set up budget alerts:
```bash
gcloud billing budgets create \
  --billing-account=<your-billing-account-id> \
  --display-name="Cloud Build Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=90
```

## Troubleshooting

**Build fails with "Permission denied":**
- Check Cloud Build service account has required roles (see Setup step 3)

**Cloud Deploy stuck on "Pending":**
- Check Cloud Run service exists: `gcloud run services list`
- Verify image exists in Artifact Registry

**Image not found:**
- Confirm build completed successfully
- Check Artifact Registry: `gcloud artifacts docker images list us-central1-docker.pkg.dev/learningaier-lab/backend-images`
