
import os
import argparse
import logging
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

def get_data(project_id, dataset_id, view_name):
    """Fetch data from BigQuery view."""
    client = bigquery.Client(project=project_id)
    query = f"""
    SELECT * FROM `{project_id}.{dataset_id}.{view_name}`
    """
    logger.info(f"Fetching data from {project_id}.{dataset_id}.{view_name}...")
    df = client.query(query).to_dataframe()
    logger.info(f"Data fetched successfully. Shape: {df.shape}")
    return df

def preprocess_data(df):
    """Preprocess features and target."""
    # Drop rows with missing values
    df = df.dropna()
    
    # Features to use
    feature_cols = [
        'category', 
        'word_count', 
        'rating', 
        'review_sequence_number', 
        'days_since_last_review', 
        'user_avg_rating'
    ]
    
    # Target
    target_col = 'label_next_interval_bucket'
    
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # Encode categorical features
    le_category = LabelEncoder()
    X['category'] = le_category.fit_transform(X['category'].astype(str))
    
    # Encode target
    le_target = LabelEncoder()
    y = le_target.fit_transform(y)
    
    logger.info(f"Target classes: {le_target.classes_}")
    
    return X, y, le_category, le_target

def train_model(X, y):
    """Train XGBoost classifier."""
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
    logger.info("\n" + classification_report(y_test, y_pred))
    
    return model

def save_artifacts(model, le_category, le_target, output_dir):
    """Save model and encoders."""
    os.makedirs(output_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(output_dir, 'model.joblib'))
    joblib.dump(le_category, os.path.join(output_dir, 'le_category.joblib'))
    joblib.dump(le_target, os.path.join(output_dir, 'le_target.joblib'))
    
    logger.info(f"Artifacts saved to {output_dir}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project-id', type=str, required=True, help='GCP Project ID')
    parser.add_argument('--dataset-id', type=str, default='learningaier_analytics', help='BigQuery Dataset ID')
    parser.add_argument('--view-name', type=str, default='flashcard_training_view', help='BigQuery View Name')
    parser.add_argument('--output-dir', type=str, default='model_artifacts', help='Directory to save model artifacts')
    args = parser.parse_args()
    
    try:
        df = get_data(args.project_id, args.dataset_id, args.view_name)
        
        if len(df) < 10:
            logger.warning("Not enough data to train. Need at least 10 rows.")
            return

        X, y, le_category, le_target = preprocess_data(df)
        model = train_model(X, y)
        save_artifacts(model, le_category, le_target, args.output_dir)
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise

if __name__ == '__main__':
    main()
