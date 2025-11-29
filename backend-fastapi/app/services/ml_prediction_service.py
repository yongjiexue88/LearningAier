
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
            # The model expects a list of instances, where each instance is a list/dict of features
            # Adjust this based on how the model was trained and what signature it expects
            # For XGBoost/Sklearn in Vertex AI, it usually expects a list of feature values
            
            # Map features to the order expected by the model
            # ['category', 'word_count', 'rating', 'review_sequence_number', 'days_since_last_review', 'user_avg_rating']
            instance = [
                str(features.get('category', 'General')),
                int(features.get('word_count', 0)),
                int(features.get('rating', 3)),
                int(features.get('review_sequence_number', 1)),
                int(features.get('days_since_last_review', 0)),
                float(features.get('user_avg_rating', 3.0))
            ]
            
            endpoint = aiplatform.Endpoint(self.endpoint_id)
            prediction = endpoint.predict(instances=[instance])
            
            # Parse prediction result
            # Assuming the model returns the bucket index or label
            # We need to map the bucket back to days
            # 0: '1_day', 1: '15_30_days', 2: '2_3_days', 3: '30_plus_days', 4: '4_7_days', 5: '8_14_days'
            # This mapping depends on LabelEncoder order. 
            # For a robust system, we should load the encoder or have a fixed mapping.
            # For this lab, let's assume a simplified mapping or just return the raw value for now.
            
            predicted_bucket_idx = int(prediction.predictions[0])
            
            # Approximate mapping based on alphabetical sort of labels:
            # '1_day', '15_30_days', '2_3_days', '30_plus_days', '4_7_days', '8_14_days'
            # 0 -> 1
            # 1 -> 21 (avg of 15-30)
            # 2 -> 3
            # 3 -> 45 (30+)
            # 4 -> 5
            # 5 -> 10
            
            mapping = {
                0: 1,
                1: 21,
                2: 3,
                3: 45,
                4: 5,
                5: 10
            }
            
            return mapping.get(predicted_bucket_idx, 1)
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return None
