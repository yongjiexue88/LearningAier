---
description: How to deploy and test the ML Flashcard Scheduler Pipeline
---

# Deploying the ML Flashcard Scheduler Pipeline

This workflow guides you through submitting the Vertex AI pipeline, retrieving the model endpoint ID, and configuring the application to use it.

## Prerequisites

Ensure you are authenticated with Google Cloud and have the necessary APIs enabled.

```bash
gcloud services enable aiplatform.googleapis.com cloudbuild.googleapis.com --project learningaier-lab
```

## 1. Authenticate with Google Cloud

First, set up Application Default Credentials:

```bash
gcloud auth application-default login
```

This will open a browser window for you to authenticate with your Google account.

## 2. Submit the Pipeline Job

You can submit the compiled pipeline JSON directly using `gcloud`.

```bash
# Navigate to the backend directory
cd backend-fastapi

# Compile the pipeline (if not already done)
# This generates flashcard_schedule_pipeline.json
python3 ml/pipelines/flashcard_schedule_pipeline.py

# NOTE: The gcloud CLI doesn't support Vertex AI Pipelines directly.
# Use the Python SDK instead:

python3 ml/pipelines/submit_pipeline.py
```

## 2. Monitor and Get Endpoint ID

1.  Go to the **[Vertex AI Pipelines Console](https://console.cloud.google.com/vertex-ai/pipelines/runs?project=learningaier-lab)**.
2.  Click on the `flashcard-scheduler-run-1` job to see progress.
3.  Wait for the pipeline to complete (this may take ~15-20 minutes).
4.  Once finished, the `deploy-model-to-endpoint` step will create an Endpoint.
5.  Go to **[Vertex AI Endpoints](https://console.cloud.google.com/vertex-ai/endpoints?project=learningaier-lab)**.
6.  Find `flashcard-schedule-endpoint`.
7.  Copy the **Endpoint ID** (a long numeric string, e.g., `1234567890123456789`).

## 3. Configure the Application

Update your local environment configuration.

1.  Open `backend-fastapi/.env.lab`.
2.  Add or update the variable:
    ```bash
    FLASHCARD_MODEL_ENDPOINT_ID=your_copied_endpoint_id
    ```
3.  Restart your backend server:
    ```bash
    # Ctrl+C to stop, then:
    ENV=lab uvicorn app.main:app --reload --port 8080
    ```

## 4. Test the Feature

1.  Open the frontend: [http://localhost:5173/flashcards](http://localhost:5173/flashcards)
2.  Select a deck/note.
3.  Toggle **"🧪 ML Scheduler"** to ON.
4.  Click "Show Answer" on a card.
5.  You should see a prediction message: *"📅 Next Review: SM-2 says 4d, ML says 5d"*.
