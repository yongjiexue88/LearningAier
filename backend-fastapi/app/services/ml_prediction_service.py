
import logging
from typing import Dict, Any, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

class MLPredictionService:
    """Service for interacting with Vertex AI ML models."""
    
    def __init__(self):
        self.settings = get_settings()
        self.model = None
        
        # Load local model artifacts
        try:
            import joblib
            import os
            
            # Path relative to this file: ../../local_model_artifacts
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(os.path.dirname(current_dir))
            model_path = os.path.join(backend_dir, "local_model_artifacts", "model.joblib")
            
            if os.path.exists(model_path):
                logger.info(f"Loading local ML model from {model_path}")
                self.model = joblib.load(model_path)
                logger.info("Local ML model loaded successfully")
            else:
                logger.warning(f"Local model not found at {model_path}")
                
        except Exception as e:
            logger.error(f"Failed to load local ML model: {e}")

    async def predict_next_interval(self, features: Dict[str, Any]) -> Optional[int]:
        """
        Predict the next interval for a flashcard using the local ML model.
        
        Args:
            features: Dictionary of features expected by the model.
            
        Returns:
            Predicted interval in days, or None if prediction fails.
        """
        if not self.model:
            logger.warning("No local ML model loaded. Skipping prediction.")
            return None
            
        try:
            # Prepare instance for prediction
            # The model was trained with a DataFrame and ColumnTransformer using column names.
            # We pass a dictionary which Vertex AI sklearn container converts to a DataFrame.
            # Manual label encoding to match training (sorted unique values)
            # Categories: code, concept, definition, vocabulary
            category_map = {
                "code": 0,
                "concept": 1,
                "definition": 2,
                "vocabulary": 3,
                "General": 3 # Default to vocabulary/general
            }
            cat_val = category_map.get(str(features.get('category', 'vocabulary')), 3)

            # Create list of values in exact order of feature_cols in training script
            # ['category', 'word_count', 'rating', 'review_sequence_number', 'days_since_last_review', 'user_avg_rating']
            instance = [
                cat_val,
                int(features.get('word_count', 0)),
                int(features.get('rating', 3)),
                int(features.get('review_sequence_number', 1)),
                int(features.get('current_interval', 0)),
                float(features.get('user_avg_rating', 3.0))
            ]
            
            # Run prediction locally
            # Scikit-learn expects 2D array [n_samples, n_features]
            prediction = self.model.predict([instance])
            
            # Parse prediction result
            # Model returns buckets: 1, 2, 3, 4
            predicted_bucket = int(prediction[0])
            
            # Map bucket to days
            # 1: 1 day
            # 2: 2-3 days -> 2
            # 3: 4-7 days -> 5
            # 4: >7 days -> 14 (conservative estimate)
            mapping = {
                1: 1,
                2: 2,
                3: 5,
                4: 14
            }
            
            result = mapping.get(predicted_bucket, 1)
            
            # Log prediction for monitoring
            log_payload = {
                "event": "ml_prediction_local",
                "features": instance,
                "predicted_bucket": predicted_bucket,
                "predicted_days": result
            }
            logger.info(f"ML Prediction: {log_payload}")
            
            return result
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return None
