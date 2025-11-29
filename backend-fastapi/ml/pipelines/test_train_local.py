import logging
import os
import joblib
import pandas as pd
from google.cloud import bigquery
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report

# Configuration
PROJECT_ID = "learningaier-lab"
DATASET_ID = "learningaier_analytics"
VIEW_NAME = "flashcard_training_view"
OUTPUT_DIR = "local_model_artifacts"

def train_local():
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    logger.info(f"Fetching data from {PROJECT_ID}.{DATASET_ID}.{VIEW_NAME}...")
    client = bigquery.Client(project=PROJECT_ID)
    query = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.{VIEW_NAME}`"
    df = client.query(query).to_dataframe()
    logger.info(f"Data fetched successfully. Shape: {df.shape}")
    
    if len(df) < 10:
        logger.warning("Not enough data to train. Need at least 10 rows. Using dummy data for testing.")
        # Create dummy data if real data is insufficient
        data = {
            'category': ['A', 'B', 'A', 'B', 'A'] * 4,
            'word_count': [10, 20, 15, 25, 30] * 4,
            'rating': [1, 2, 3, 4, 5] * 4,
            'review_sequence_number': [1, 2, 3, 4, 5] * 4,
            'days_since_last_review': [1, 2, 3, 4, 5] * 4,
            'user_avg_rating': [3.0, 3.5, 4.0, 4.5, 5.0] * 4,
            'label_next_interval_bucket': ['short', 'medium', 'long', 'medium', 'short'] * 4
        }
        df = pd.DataFrame(data)
        logger.info(f"Created dummy data. Shape: {df.shape}")

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
    
    # Save artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(OUTPUT_DIR, 'model.joblib'))
    joblib.dump(le_category, os.path.join(OUTPUT_DIR, 'le_category.joblib'))
    joblib.dump(le_target, os.path.join(OUTPUT_DIR, 'le_target.joblib'))
    
    logger.info(f"Artifacts saved to {OUTPUT_DIR}")
    
    # Verify loading
    loaded_model = joblib.load(os.path.join(OUTPUT_DIR, 'model.joblib'))
    logger.info("Model loaded successfully")
    
    # Verify prediction
    sample_input = X_test.iloc[[0]]
    prediction = loaded_model.predict(sample_input)
    logger.info(f"Sample prediction: {prediction}")

if __name__ == "__main__":
    train_local()
