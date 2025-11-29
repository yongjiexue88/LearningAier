
import logging
from typing import Dict, Any, Optional
from google.cloud import aiplatform
from app.config import get_settings

logger = logging.getLogger(__name__)

class MLPredictionService:
    """Service for interacting with Vertex AI ML models."""
    
    def __init__(self):
        self.settings = get_settings()
        self.project_id = self.settings.vertex_project_id or self.settings.firebase_project_id
        self.location = self.settings.vertex_location
        self.endpoint_id = self.settings.flashcard_model_endpoint_id
        
        # Initialize Vertex AI SDK
        try:
            aiplatform.init(project=self.project_id, location=self.location)
        except Exception as e:
            logger.warning(f"Failed to initialize Vertex AI: {e}")

    async def predict_next_interval(self, features: Dict[str, Any]) -> Optional[int]:
        """
        Predict the next interval for a flashcard using the ML model.
        
        Args:
            features: Dictionary of features expected by the model.
            
        Returns:
            Predicted interval in days, or None if prediction fails.
        """
        if not self.endpoint_id:
            logger.warning("No ML endpoint ID configured. Skipping prediction.")
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
            
            endpoint = aiplatform.Endpoint(self.endpoint_id)
            prediction = endpoint.predict(instances=[instance])
            
            # Parse prediction result
            # Model returns buckets: 1, 2, 3, 4
            predicted_bucket = int(prediction.predictions[0])
            
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
                "event": "ml_prediction",
                "features": instance,
                "predicted_bucket": predicted_bucket,
                "predicted_days": result,
                "model_endpoint": self.endpoint_id
            }
            logger.info(f"ML Prediction: {log_payload}")
            
            return result
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return None
