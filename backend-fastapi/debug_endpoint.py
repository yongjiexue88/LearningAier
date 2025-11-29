
import logging
from google.cloud import aiplatform

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = "learningaier-lab"
LOCATION = "us-central1"
ENDPOINT_ID = "3297434272188596224"

def test_prediction():
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    endpoint = aiplatform.Endpoint(ENDPOINT_ID)
    
    # Test case 1: List of lists (Standard)
    instance_list = [
        3,  # category (vocabulary)
        10, # word_count
        4,  # rating
        1,  # review_sequence_number
        0,  # days_since_last_review
        3.0 # user_avg_rating
    ]
    
    try:
        logger.info(f"Sending request with instance: {instance_list}")
        prediction = endpoint.predict(instances=[instance_list])
        logger.info(f"Prediction success: {prediction}")
    except Exception as e:
        logger.error(f"Prediction failed: {e}")

if __name__ == "__main__":
    test_prediction()
