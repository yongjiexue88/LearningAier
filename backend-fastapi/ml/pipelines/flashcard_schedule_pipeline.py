
from typing import NamedTuple
from kfp import dsl
from kfp import compiler
from google_cloud_pipeline_components.v1.endpoint import EndpointCreateOp, ModelDeployOp
from google_cloud_pipeline_components.v1.model import ModelUploadOp

@dsl.component(
    base_image="python:3.9",
    packages_to_install=[
        "google-cloud-bigquery>=3.11.0",
        "pandas>=2.0.0",
        "scikit-learn>=1.3.0",
        "xgboost==1.7.6",
        "db-dtypes>=1.2.0",
        "joblib>=1.3.0"
    ]
)
def train_flashcard_model(
    project_id: str,
    dataset_id: str,
    view_name: str,
    model_artifact: dsl.Output[dsl.Model],
    metrics: dsl.Output[dsl.Metrics]
) -> NamedTuple("Outputs", [("accuracy", float)]):
    import logging
    import os
    import joblib
    import pandas as pd
    from google.cloud import bigquery
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBClassifier
    from sklearn.metrics import accuracy_score, classification_report

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    logger.info(f"Fetching data from {project_id}.{dataset_id}.{view_name}...")
    client = bigquery.Client(project=project_id)
    query = f"SELECT * FROM `{project_id}.{dataset_id}.{view_name}`"
    df = client.query(query).to_dataframe()
    logger.info(f"Data fetched successfully. Shape: {df.shape}")
    
    if len(df) < 10:
        raise ValueError("Not enough data to train. Need at least 10 rows.")

    # Preprocess
    df = df.dropna()
    feature_cols = [
        'category', 
        'word_count', 
        'rating', 
        'review_sequence_number', 
        'days_since_last_review', 
        'user_avg_rating'
    ]
    target_col = 'label_next_interval_bucket'
    
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # Encode categorical features
    le_category = LabelEncoder()
    X['category'] = le_category.fit_transform(X['category'].astype(str))
    
    # Encode target
    le_target = LabelEncoder()
    y = le_target.fit_transform(y)
    
    # Train
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42,
        use_label_encoder=False,
        eval_metric='mlogloss'
    )
    
    logger.info("Training model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Model Accuracy: {accuracy:.4f}")
    
    # Log metrics
    metrics.log_metric("accuracy", accuracy)
    
    # Save artifacts
    os.makedirs(model_artifact.path, exist_ok=True)
    model.save_model(os.path.join(model_artifact.path, 'model.bst'))
    joblib.dump(le_category, os.path.join(model_artifact.path, 'le_category.joblib'))
    joblib.dump(le_target, os.path.join(model_artifact.path, 'le_target.joblib'))
    
    # Save encoders as separate files for easy loading in serving
    # Note: In a real prod scenario, we'd bundle these better or use a custom container
    
    return (accuracy,)

@dsl.component(
    base_image="python:3.9",
    packages_to_install=["google-cloud-aiplatform"]
)
def upload_model_to_registry(
    project_id: str,
    location: str,
    display_name: str,
    model_artifact: dsl.Input[dsl.Model],
    serving_container_image_uri: str,
    model_resource_name: dsl.Output[dsl.Artifact]
):
    from google.cloud import aiplatform
    
    aiplatform.init(project=project_id, location=location)
    
    model = aiplatform.Model.upload(
        display_name=display_name,
        artifact_uri=model_artifact.uri,
        serving_container_image_uri=serving_container_image_uri
    )
    
    model_resource_name.metadata["resourceName"] = model.resource_name
    model_resource_name.uri = model.uri

@dsl.component(
    base_image="python:3.9",
    packages_to_install=["google-cloud-aiplatform"]
)
def deploy_model_to_endpoint(
    project_id: str,
    location: str,
    endpoint_resource_name: dsl.Input[dsl.Artifact],
    model_resource_name: dsl.Input[dsl.Artifact]
):
    from google.cloud import aiplatform
    
    aiplatform.init(project=project_id, location=location)
    
    # Parse resource names from metadata or URI if needed
    # The standard components return artifacts with specific metadata
    # Here we assume we passed the resource name in metadata or we can just use the ID if we had it.
    
    # For EndpointCreateOp, the output 'endpoint' is an Artifact of type VertexEndpoint.
    # Its .uri usually contains the resource name.
    
    endpoint_name = endpoint_resource_name.metadata.get("resourceName") or endpoint_resource_name.uri
    model_name = model_resource_name.metadata.get("resourceName")
    
    # Clean up URI if it's a path
    if endpoint_name.startswith("https://"):
        # Extract resource name from URL if needed, but SDK usually handles it or we need the name
        # For now, let's assume it works or we might need to parse it.
        pass

    endpoint = aiplatform.Endpoint(endpoint_name=endpoint_name)
    model = aiplatform.Model(model_name=model_name)
    
    endpoint.deploy(
        model=model,
        machine_type="n1-standard-2",
        min_replica_count=1,
        max_replica_count=1
    )

@dsl.pipeline(
    name="flashcard-schedule-pipeline",
    description="Train and deploy flashcard scheduling model"
)
def flashcard_pipeline(
    project_id: str,
    location: str = "us-central1",
    dataset_id: str = "learningaier_analytics",
    view_name: str = "flashcard_training_view",
    serving_container_image_uri: str = "us-docker.pkg.dev/vertex-ai/prediction/xgboost-cpu.1-7:latest"
):
    # Train
    train_task = train_flashcard_model(
        project_id=project_id,
        dataset_id=dataset_id,
        view_name=view_name
    )
    
    # Upload Model (Custom Component)
    upload_task = upload_model_to_registry(
        project_id=project_id,
        location=location,
        display_name="flashcard-schedule-model",
        model_artifact=train_task.outputs["model_artifact"],
        serving_container_image_uri=serving_container_image_uri
    )
    
    # Create Endpoint
    endpoint_task = EndpointCreateOp(
        project=project_id,
        location=location,
        display_name="flashcard-schedule-endpoint"
    )
    
    # Deploy Model (Custom Component)
    deploy_task = deploy_model_to_endpoint(
        project_id=project_id,
        location=location,
        endpoint_resource_name=endpoint_task.outputs["endpoint"],
        model_resource_name=upload_task.outputs["model_resource_name"]
    )

if __name__ == "__main__":
    compiler.Compiler().compile(
        pipeline_func=flashcard_pipeline,
        package_path="flashcard_schedule_pipeline.json"
    )
