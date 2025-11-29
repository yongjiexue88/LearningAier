import random
from datetime import datetime, timedelta
from google.cloud import bigquery
import uuid

def generate_reviews():
    project_id = "learningaier-lab"
    dataset_id = "learningaier_analytics"
    client = bigquery.Client(project=project_id)
    
    # Get existing flashcards
    query = f"""
    SELECT id, user_id, created_at 
    FROM `{project_id}.{dataset_id}.flashcards`
    LIMIT 500
    """
    flashcards = list(client.query(query).result())
    
    if not flashcards:
        print("❌ No flashcards found to generate reviews for.")
        return

    print(f"Found {len(flashcards)} flashcards. Generating reviews...")
    
    reviews = []
    
    for card in flashcards:
        # Simulate 1-5 reviews per card
        num_reviews = random.randint(1, 5)
        
        # Start reviewing shortly after creation
        current_time = card.created_at + timedelta(hours=random.randint(1, 24))
        current_interval = 0
        
        for _ in range(num_reviews):
            rating = random.choice([1, 2, 3, 4]) # 1=Again, 2=Hard, 3=Good, 4=Easy
            
            # Simple SM-2 simulation logic for next interval
            if rating == 1:
                next_interval = 1
            elif rating == 2:
                next_interval = max(1, int(current_interval * 1.2))
            elif rating == 3:
                next_interval = max(1, int(current_interval * 2.5)) if current_interval > 0 else 1
            else: # 4
                next_interval = max(1, int(current_interval * 3.5)) if current_interval > 0 else 4
            
            review = {
                "id": str(uuid.uuid4()),
                "flashcard_id": card.id,
                "user_id": card.user_id,
                "rating": rating,
                "reviewed_at": current_time.isoformat(),
                "scheduled_interval": next_interval
            }
            reviews.append(review)
            
            # Advance time
            current_interval = next_interval
            current_time += timedelta(days=current_interval)
            
            # Stop if we go into the future too much (optional, but good for realism)
            if current_time > datetime.now(current_time.tzinfo):
                break
    
    if not reviews:
        print("⚠ No reviews generated.")
        return

    # Insert into BigQuery
    table_ref = f"{project_id}.{dataset_id}.flashcard_reviews"
    
    # Batch insert
    batch_size = 1000
    for i in range(0, len(reviews), batch_size):
        batch = reviews[i:i+batch_size]
        errors = client.insert_rows_json(table_ref, batch)
        if errors:
            print(f"❌ Error inserting batch {i}: {errors}")
        else:
            print(f"✅ Inserted {len(batch)} reviews.")

if __name__ == "__main__":
    generate_reviews()
