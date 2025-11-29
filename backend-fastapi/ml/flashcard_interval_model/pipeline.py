from kfp import dsl
from kfp.v2 import compiler
from kfp.dsl import importer
from google_cloud_pipeline_components.v1.custom_job import CustomTrainingJobOp
from google_cloud_pipeline_components.v1.endpoint import EndpointCreateOp

# Redefine upload_model to return Output[VertexModel]
@dsl.component(packages_to_install=["google-cloud-aiplatform"])
def upload_model_v2(
    project_id: str,
    location: str,
    display_name: str,
    serving_container_image_uri: str,
    artifact_uri: str,
    model: dsl.Output[dsl.Model], # Use generic Model, hoping it's compatible or we cast it
) -> str:
    from google.cloud import aiplatform
    aiplatform.init(project=project_id, location=location)
    
    uploaded_model = aiplatform.Model.upload(
        display_name=display_name,
        artifact_uri=artifact_uri,
        serving_container_image_uri=serving_container_image_uri,
    )
    
    # Set metadata for the output artifact so downstream components recognize it
    model.metadata["resourceName"] = uploaded_model.resource_name
    model.uri = f"https://{location}-aiplatform.googleapis.com/v1/{uploaded_model.resource_name}"
    
    return uploaded_model.resource_name

@dsl.component(packages_to_install=["google-cloud-aiplatform"])
def deploy_model(
    project_id: str,
    location: str,
    endpoint: dsl.Input[dsl.Artifact],
    model: dsl.Input[dsl.Model],
    deployed_model_display_name: str,
):
    from google.cloud import aiplatform
    aiplatform.init(project=project_id, location=location)
    
    # Extract resource names from artifacts
    # VertexEndpoint artifact usually has resourceName in metadata
    endpoint_name = endpoint.metadata["resourceName"]
    model_name = model.metadata["resourceName"]
    
    endpoint = aiplatform.Endpoint(endpoint_name=endpoint_name)
    model_obj = aiplatform.Model(model_name=model_name)
    
    endpoint.deploy(
        model=model_obj,
        deployed_model_display_name=deployed_model_display_name,
        machine_type="n1-standard-2",
        min_replica_count=1,
        max_replica_count=1,
    )

@dsl.pipeline(
    name="flashcard-schedule-pipeline",
    description="Train and deploy flashcard interval prediction model"
)
def flashcard_pipeline(
    project_id: str,
    location: str,
    staging_bucket: str,
    image_uri: str,
    model_display_name: str,
    dataset_id: str = "learningaier_analytics",
    view_name: str = "flashcard_training_view",
):
    # Construct a timestamped model directory or use a fixed one for the pipeline run
    model_output_dir = f"{staging_bucket}/model_output"
    
    # 1. Train Model (Custom Job)
    train_task = CustomTrainingJobOp(
        project=project_id,
        location=location,
        display_name="flashcard-training-job",
        worker_pool_specs=[{
            "machine_spec": {
                "machine_type": "n1-standard-4",
            },
            "replica_count": 1,
            "container_spec": {
                "image_uri": image_uri,
                "args": [
                    f"--project-id={project_id}",
                    f"--dataset-id={dataset_id}",
                    f"--view-name={view_name}",
                    f"--model-dir={model_output_dir}",
                ]
            }
        }],
        base_output_directory=staging_bucket
    )
    
    # 2. Upload Model (Custom Component)
    upload_task = upload_model_v2(
        project_id=project_id,
        location=location,
        display_name=model_display_name,
        serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-3:latest",
        artifact_uri=model_output_dir,
    )
    upload_task.after(train_task)
    
    # 3. Create Endpoint (or use existing)
    endpoint_create_task = EndpointCreateOp(
        project=project_id,
        location=location,
        display_name="flashcard-schedule-endpoint",  # Match existing endpoint name
    )
    endpoint_create_task.after(upload_task)
    
    deploy_task = deploy_model(
        project_id=project_id,
        location=location,
        endpoint=endpoint_create_task.outputs["endpoint"],
        model=upload_task.outputs["model"],
        deployed_model_display_name=model_display_name,
    )
    deploy_task.after(endpoint_create_task)

if __name__ == "__main__":
    compiler.Compiler().compile(
        pipeline_func=flashcard_pipeline,
        package_path="flashcard_pipeline.json"
    )
