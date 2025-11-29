from google.cloud import aiplatform
import argparse
from pipeline import flashcard_pipeline
from kfp.v2 import compiler

def run_pipeline(
    project_id: str,
    location: str,
    staging_bucket: str,
    image_uri: str,
    model_display_name: str,
    service_account: str = None
):
    aiplatform.init(project=project_id, location=location, staging_bucket=staging_bucket)
    
    # Compile the pipeline
    compiler.Compiler().compile(
        pipeline_func=flashcard_pipeline,
        package_path="flashcard_pipeline.json"
    )
    
    # Define pipeline job
    job = aiplatform.PipelineJob(
        display_name="flashcard-schedule-pipeline-job",
        template_path="flashcard_pipeline.json",
        pipeline_root=f"{staging_bucket}/pipeline_root",
        parameter_values={
            "project_id": project_id,
            "location": location,
            "staging_bucket": staging_bucket,
            "image_uri": image_uri,
            "model_display_name": model_display_name,
        },
        enable_caching=True
    )
    
    print("🚀 Submitting Pipeline Job...")
    job.submit(service_account=service_account)
    print("✅ Pipeline submitted. Check Vertex AI Console for progress.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-id", default="learningaier-lab")
    parser.add_argument("--location", default="us-central1")
    parser.add_argument("--staging-bucket", required=True, help="gs://bucket-name for staging")
    parser.add_argument("--image-uri", required=True, help="gcr.io/project/image:tag")
    parser.add_argument("--model-display-name", default="flashcard-interval-model")
    parser.add_argument("--service-account", help="Service account for the job")
    
    args = parser.parse_args()
    
    run_pipeline(
        project_id=args.project_id,
        location=args.location,
        staging_bucket=args.staging_bucket,
        image_uri=args.image_uri,
        model_display_name=args.model_display_name,
        service_account=args.service_account
    )
