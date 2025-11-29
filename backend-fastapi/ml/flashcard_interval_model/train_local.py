import os
import argparse
import joblib
import pandas as pd
import numpy as np
from google.cloud import bigquery
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def load_data(project_id, dataset_id, view_name="flashcard_training_view"):
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
    # Features and Target
    feature_cols = ['card_category', 'note_length', 'response', 'current_interval', 'user_review_count_7d']
    target_col = 'label_next_interval_bucket'
    
    X = df[feature_cols]
    y = df[target_col]
    
    # Define preprocessing for numeric and categorical columns
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
    # Using XGBoost Classifier
    # Note: Classes are 1, 2, 3, 4. XGBoost expects 0-indexed classes usually, 
    # but sklearn wrapper handles it or we might need to map.
    # Let's use RandomForest for simplicity and robustness first, or XGBClassifier with label encoder.
    
    # Using RandomForest for simplicity in this phase
    clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    print("⏳ Training model...")
    clf.fit(X_train, y_train)
    print("✅ Model trained.")
    return clf

def evaluate_model(clf, X_test, y_test):
    """Evaluate the model."""
    print("\n📊 Evaluation Metrics:")
    y_pred = clf.predict(X_test)
    
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

def save_model(clf, output_path):
    """Save the trained model."""
    joblib.dump(clf, output_path)
    print(f"\n💾 Model saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Train Flashcard Interval Model Locally")
    parser.add_argument("--project-id", default="learningaier-lab", help="GCP Project ID")
    parser.add_argument("--dataset-id", default="learningaier_analytics", help="BigQuery Dataset ID")
    parser.add_argument("--output-dir", default=".", help="Output directory for model artifact")
    
    args = parser.parse_args()
    
    # 1. Load Data
    try:
        df = load_data(args.project_id, args.dataset_id)
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
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # 4. Train
    clf = train_model(X_train, y_train, preprocessor)
    
    # 5. Evaluate
    evaluate_model(clf, X_test, y_test)
    
    # 6. Save
    os.makedirs(args.output_dir, exist_ok=True)
    model_path = os.path.join(args.output_dir, "model.joblib")
    save_model(clf, model_path)

if __name__ == "__main__":
    main()
