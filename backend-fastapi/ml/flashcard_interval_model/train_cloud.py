import os
import argparse
import joblib
import pandas as pd
from google.cloud import bigquery
from google.cloud import storage
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
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
    feature_cols = ['card_category', 'note_length', 'response', 'current_interval', 'user_review_count_7d']
    target_col = 'label_next_interval_bucket'
    
    X = df[feature_cols]
    y = df[target_col]
    
    numeric_features = ['note_length', 'response', 'current_interval', 'user_review_count_7d']
    categorical_features = ['card_category']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    return X, y, preprocessor

def train_model(X_train, y_train, preprocessor):
    """Train the model pipeline."""
    clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    print("⏳ Training model...")
    clf.fit(X_train, y_train)
    print("✅ Model trained.")
    return clf

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
    X, y, preprocessor = preprocess_data(df)
    
    # 3. Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Train
    clf = train_model(X_train, y_train, preprocessor)
    
    # 5. Evaluate
    y_pred = clf.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    
    # 6. Save & Upload
    local_model_path = "model.joblib"
    joblib.dump(clf, local_model_path)
    
    # Construct full GCS path for the file
    # Vertex AI expects the directory, so we append filename if needed, 
    # but usually we pass the directory as --model-dir.
    # Standard convention: save as model.joblib in the directory.
    gcs_model_path = os.path.join(args.model_dir, "model.joblib")
    upload_to_gcs(local_model_path, gcs_model_path)

if __name__ == "__main__":
    main()
