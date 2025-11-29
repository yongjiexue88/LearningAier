from google.cloud import aiplatform
import argparse
import time

def run_custom_job(
    project_id: str,
    location: str,
    staging_bucket: str,
    image_uri: str,
    model_output_dir: str,
    service_account: str = None
):
    aiplatform.init(project=project_id, location=location, staging_bucket=staging_bucket)

    job_name = f"flashcard-training-{int(time.time())}"
    
    # Define the Custom Job
    job = aiplatform.CustomContainerTrainingJob(
        display_name=job_name,
        container_uri=image_uri,
        # We don't use python_package_spec here because we have a custom container with entrypoint
    )

    print(f"🚀 Submitting Custom Job {job_name}...")
    print(f"   Image: {image_uri}")
    print(f"   Output: {model_output_dir}")

    # Run the job
    job.run(
        args=[
            f"--project-id={project_id}",
            f"--model-dir={model_output_dir}",
            # Add other args if needed, e.g. dataset-id
        ],
        replica_count=1,
        machine_type="n1-standard-4",
        service_account=service_account,
        sync=True  # Wait for completion
    )
    
    print("✅ Job completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-id", default="learningaier-lab")
    parser.add_argument("--location", default="us-central1")
    parser.add_argument("--staging-bucket", required=True, help="gs://bucket-name for staging")
    parser.add_argument("--image-uri", required=True, help="gcr.io/project/image:tag")
    parser.add_argument("--model-output-dir", required=True, help="gs://bucket/path/to/save/model")
    parser.add_argument("--service-account", help="Service account for the job")
    
    args = parser.parse_args()
    
    run_custom_job(
        project_id=args.project_id,
        location=args.location,
        staging_bucket=args.staging_bucket,
        image_uri=args.image_uri,
        model_output_dir=args.model_output_dir,
        service_account=args.service_account
    )
