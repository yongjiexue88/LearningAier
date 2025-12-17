# Vertex AI Decommission Record

**Date:** 2025-12-07  
**Environment:** GCP project `learningaier-lab`, region `us-central1`  
**Goal:** Remove Vertex AI endpoints/models and disable the Vertex AI API to eliminate billing.

## Commands Run

1) List endpoints  
```bash
gcloud ai endpoints list --project learningaier-lab --region us-central1
```

2) Undeploy model from the endpoint (required before deletion)  
```bash
gcloud ai endpoints undeploy-model 3297434272188596224 \
  --deployed-model-id=718164711379566592 \
  --project learningaier-lab --region us-central1 --quiet
```

3) Delete the endpoint  
```bash
gcloud ai endpoints delete 3297434272188596224 \
  --project learningaier-lab --region us-central1 --quiet
```

4) List models  
```bash
gcloud ai models list --project learningaier-lab --region us-central1
```

5) Delete all Vertex models  
```bash
gcloud ai models delete 666470072688050176 --project learningaier-lab --region us-central1 --quiet
gcloud ai models delete 3305579454327160832 --project learningaier-lab --region us-central1 --quiet
gcloud ai models delete 2112231106190245888 --project learningaier-lab --region us-central1 --quiet
gcloud ai models delete 499836886475341824 --project learningaier-lab --region us-central1 --quiet
```

6) Disable Vertex AI API (prevents future usage/billing)  
```bash
gcloud services disable aiplatform.googleapis.com \
  --project learningaier-lab --quiet
```

7) Verify API is disabled  
```bash
gcloud services list --enabled --project learningaier-lab | grep aiplatform
```

## Result
- Endpoint `flashcard-schedule-endpoint` (3297434272188596224) removed after undeploying its deployed model `718164711379566592`.
- Models deleted: `flashcard-scheduler-sklearn-model`, `flashcard-schedule-model` (two versions), `flashcard-interval-model`.
- `aiplatform.googleapis.com` disabled in project `learningaier-lab`.
- No Vertex services remain enabled; no further Vertex AI billing expected.
