import asyncio
import os
import sys

# Ensure we're in the backend directory context
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Force lab environment for testing
os.environ["ENV"] = "lab"

from app.services.ml_prediction_service import MLPredictionService

async def verify_deployment():
    print("🔍 Initializing ML Prediction Service...")
    try:
        ml = MLPredictionService()
        print(f"✅ Service initialized.")
        print(f"📍 Endpoint ID: {ml.endpoint_id}")
    except Exception as e:
        print(f"❌ Failed to initialize service: {e}")
        return

    # Sample features matching the training data schema
    features = {
        'category': 'vocabulary',
        'word_count': 15,
        'rating': 3,
        'review_sequence_number': 2,
        'current_interval': 1,
        'user_avg_rating': 3.5
    }
    
    print("\n🧪 Testing prediction with features:")
    for k, v in features.items():
        print(f"  - {k}: {v}")

    print("\n⏳ Sending request to Vertex AI...")
    try:
        result = await ml.predict_next_interval(features)
        
        if result:
            print(f"\n🎉 SUCCESS! Prediction received.")
            print(f"📅 Recommended Interval: {result} days")
            
            # Check if it's a realistic value (1, 2, 5, or 14)
            if result in [1, 2, 5, 14]:
                print("✅ Value matches expected bucket mapping.")
            else:
                print(f"⚠️ Value {result} is unexpected (expected 1, 2, 5, or 14).")
        else:
            print(f"\n❌ FAILED: Service returned None (fallback triggered internally?)")
            
    except Exception as e:
        print(f"\n❌ EXCEPTION during prediction: {e}")

if __name__ == "__main__":
    asyncio.run(verify_deployment())
