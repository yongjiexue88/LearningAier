import sys
import os
import asyncio
import logging

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_ml():
    try:
        from app.services.ml_prediction_service import MLPredictionService
        
        logger.info("Initializing MLPredictionService...")
        service = MLPredictionService()
        
        if not service.model:
            logger.error("❌ Model failed to load!")
            return
            
        logger.info("✅ Model loaded successfully!")
        
        # Test prediction
        # Features: category, word_count, rating, review_sequence_number, current_interval, user_avg_rating
        features = {
            "category": "vocabulary",
            "word_count": 10,
            "rating": 4, # Easy
            "review_sequence_number": 2,
            "current_interval": 1,
            "user_avg_rating": 3.5
        }
        
        logger.info(f"Predicting for features: {features}")
        prediction = await service.predict_next_interval(features)
        
        if prediction is not None:
            logger.info(f"✅ Prediction result: {prediction} days")
        else:
            logger.error("❌ Prediction returned None")
            
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(verify_ml())
