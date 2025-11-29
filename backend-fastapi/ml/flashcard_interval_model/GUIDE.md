# Flashcard Model MLOps Guide

This guide explains how the Flashcard Interval Prediction model is trained, where data comes from, and how the model is deployed.

## 1. Data Collection Pipeline 📊

The data flows from the application to the model in three steps:

1.  **User Action**: When a user reviews a flashcard, the app saves the review (rating, time, etc.) to **Firestore** in the `flashcard_reviews` collection.
2.  **Sync to BigQuery**: A **Cloud Run Job** (`firestore-bq-sync`) runs nightly (e.g., 3 AM). It copies all new data from Firestore into **BigQuery**.
3.  **Training View**: A SQL view `flashcard_training_view` in BigQuery automatically joins the raw reviews with note metadata to create the final "training dataset" (features + labels) whenever the training job runs.

## 2. Training Process 🧠

Training happens in the cloud on **Vertex AI** using a containerized workflow:

1.  **Pipeline Trigger**: You trigger the process by running `python3 run_pipeline.py`.
2.  **Custom Job**: The pipeline launches a **Docker container** (using the image `gcr.io/learningaier-lab/flashcard-trainer`) on Google Cloud servers.
3.  **Execution**: Inside the container, the `train_cloud.py` script executes the following steps:
    *   **Loads Data**: Queries the `flashcard_training_view` from BigQuery to get the latest data.
    *   **Preprocesses**: Converts text categories to numbers (OneHotEncoder) and scales numerical features (StandardScaler).
    *   **Trains**: Fits a **RandomForestClassifier** (Scikit-Learn) to predict the optimal next review interval.
    *   **Evaluates**: Checks the model's accuracy on a held-out test set.

## 3. Model Weights & Artifacts 💾

Once training is complete, the model (the "weights") is saved and stored:

1.  **File Format**: The model pipeline is serialized into a file named `model.joblib`.
2.  **Storage Location**: The script uploads this file to your **Google Cloud Storage (GCS)** bucket.
    *   **Path**: `gs://learningaier-lab-ml-staging/model_output/model.joblib`
3.  **Model Registry**: The pipeline "registers" this file with **Vertex AI Model Registry**, creating a versioned model resource.
4.  **Serving**: This model resource is then deployed to a **Vertex AI Endpoint**, which the backend API calls to get predictions.

## 4. Scheduling ⏰

*   **Current State**: The training process runs **manually** when you execute the `run_pipeline.py` script.
*   **Automation**: To run this automatically (e.g., weekly), you can update `run_pipeline.py` to create a `PipelineJobSchedule` with a cron expression (e.g., `0 2 * * 0` for Sundays at 2 AM).
