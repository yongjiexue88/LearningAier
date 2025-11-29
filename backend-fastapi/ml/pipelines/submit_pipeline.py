#!/usr/bin/env python3
"""
Submit the flashcard scheduler pipeline to Vertex AI Pipelines
"""

from google.cloud import aiplatform

# Configuration
PROJECT_ID = "learningaier-lab"
REGION = "us-central1"
PIPELINE_ROOT = "gs://learningaier-lab-pipelines/root"
PIPELINE_JSON = "flashcard_schedule_pipeline.json"
DISPLAY_NAME = "flashcard-scheduler-run-5"

# Dataset configuration
DATASET_ID = "learningaier_analytics"
VIEW_NAME = "flashcard_training_view"

def submit_pipeline():
    """Submit the pipeline to Vertex AI"""
    
    # Initialize Vertex AI
    aiplatform.init(
        project=PROJECT_ID,
        location=REGION
    )
    
    print(f"📦 Submitting pipeline from {PIPELINE_JSON}...")
    print(f"🌐 Project: {PROJECT_ID}")
    print(f"📍 Region: {REGION}")
    print(f"📁 Pipeline Root: {PIPELINE_ROOT}")
    
    # Create and submit the pipeline job
    job = aiplatform.PipelineJob(
        display_name=DISPLAY_NAME,
        template_path=PIPELINE_JSON,
        pipeline_root=PIPELINE_ROOT,
        parameter_values={
            "project_id": PROJECT_ID,
            "location": REGION,
            "staging_bucket": PIPELINE_ROOT,
            "image_uri": "gcr.io/learningaier-lab/flashcard-trainer:latest",
            "model_display_name": "flashcard-scheduler-sklearn-model",
            "dataset_id": DATASET_ID,
            "view_name": VIEW_NAME
        }
    )
    
    # Submit the job
    job.submit()
    
    print(f"\n✅ Pipeline submitted successfully!")
    print(f"🔗 Job Name: {job.resource_name}")
    print(f"📊 Monitor: https://console.cloud.google.com/vertex-ai/pipelines/runs/{job.resource_name.split('/')[-1]}?project={PROJECT_ID}")
    print(f"\n⏳ The pipeline will take approximately 15-20 minutes to complete.")
    
    return job

if __name__ == "__main__":
    submit_pipeline()
