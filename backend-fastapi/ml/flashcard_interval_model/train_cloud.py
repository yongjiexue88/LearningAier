import os
import argparse
import joblib
import pandas as pd
from google.cloud import bigquery
from google.cloud import storage
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

def load_data(project_id, dataset_id, view_name):
    """Load data from BigQuery view."""
    client = bigquery.Client(project=project_id)
    query = f"""
    SELECT * FROM `{project_id}.{dataset_id}.{view_name}`
    """
    print(f"⏳ Loading data from BigQuery: {project_id}.{dataset_id}.{view_name}...")
    df = client.query(query).to_dataframe()
    print(f"✅ Loaded {len(df)} rows.")
    return df

def preprocess_data(df):
    """Preprocess features and split data."""
    # Use exact column names from BigQuery view
    feature_cols = [
        'category',               # matches BigQuery
        'word_count',            # matches BigQuery  
        'rating',                # matches BigQuery
        'review_sequence_number', # matches BigQuery
        'days_since_last_review', # matches BigQuery
        'user_avg_rating'        # matches BigQuery
    ]
    target_col = 'label_next_interval_bucket'
    
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # Encode categorical features (category column)
    from sklearn.preprocessing import LabelEncoder
    le_category = LabelEncoder()
    X['category'] = le_category.fit_transform(X['category'].astype(str))
    
    # Encode target
    le_target = LabelEncoder()
    y = le_target.fit_transform(y)
    
    return X, y, le_category, le_target

def train_model(X_train, y_train):
    """Train RandomForest model."""
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    print("⏳ Training model...")
    model.fit(X_train, y_train)
    print("✅ Model trained.")
    return model

def upload_to_gcs(local_path, gcs_path):
    """Upload local file to GCS."""
    # gcs_path format: gs://bucket-name/path/to/object
    if not gcs_path.startswith("gs://"):
        print(f"⚠ Output path {gcs_path} is not a GCS path. Skipping upload.")
        return

    bucket_name = gcs_path.split("/")[2]
    blob_name = "/".join(gcs_path.split("/")[3:])
    
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    
    print(f"⏳ Uploading {local_path} to {gcs_path}...")
    blob.upload_from_filename(local_path)
    print("✅ Upload complete.")

def main():
    parser = argparse.ArgumentParser(description="Train Flashcard Interval Model on Vertex AI")
    parser.add_argument("--project-id", required=True, help="GCP Project ID")
    parser.add_argument("--dataset-id", default="learningaier_analytics", help="BigQuery Dataset ID")
    parser.add_argument("--view-name", default="flashcard_training_view", help="BigQuery View Name")
    parser.add_argument("--model-dir", required=True, help="GCS path to save model artifact (e.g., gs://bucket/model/)")
    
    args = parser.parse_args()
    
    # 1. Load Data
    try:
        df = load_data(args.project_id, args.dataset_id, args.view_name)
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return

    if len(df) < 10:
        print("⚠ Not enough data to train (need at least 10 rows).")
        return

    # 2. Preprocess
    X, y, le_category, le_target = preprocess_data(df)
    
    # 3. Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Train
    model = train_model(X_train, y_train)
    
    # 5. Evaluate
    y_pred = model.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    
    # 6. Save model and encoders
    local_model_path = "model.joblib"
    joblib.dump(model, local_model_path)
    
    # Also save the label encoders for prediction time
    joblib.dump(le_category, "le_category.joblib")
    joblib.dump(le_target, "le_target.joblib")
    
    # Upload all artifacts to GCS
    gcs_model_path = os.path.join(args.model_dir, "model.joblib")
    upload_to_gcs(local_model_path, gcs_model_path)
    
    # Upload encoders too
    upload_to_gcs("le_category.joblib", os.path.join(args.model_dir, "le_category.joblib"))
    upload_to_gcs("le_target.joblib", os.path.join(args.model_dir, "le_target.joblib"))

if __name__ == "__main__":
    main()
