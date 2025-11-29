#!/usr/bin/env python3
"""
Export flashcards using load_table_from_json (more reliable than streaming inserts)
"""
import sys
import os
import json
import tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from google.cloud import bigquery
from app.core.firebase import get_firestore_client
from app.config import get_settings
from datetime import datetime

def convert_timestamp(ts):
    """Convert Firestore timestamp to ISO string."""
    if ts is None:
        return None
    if hasattr(ts, 'timestamp'):
        return datetime.fromtimestamp(ts.timestamp()).isoformat()
    elif isinstance(ts, datetime):
        return ts.isoformat()
    elif isinstance(ts, str):
        return ts
    return None

def main():
    os.environ["ENV"] = "lab"
    settings = get_settings()
    
    print("🎴 Exporting flashcards to BigQuery using load_table_from_json...")
    
    # Initialize clients
    db = get_firestore_client()
    project_id = settings.bigquery_project_id or settings.firebase_project_id
    client = bigquery.Client(project=project_id)
    
    # Fetch flashcards from Firestore
    print("  Fetching flashcards from Firestore...")
    flashcards = db.collection("flashcards").stream()
    
    rows = []
    skipped = 0
    for doc in flashcards:
        data = doc.to_dict()
        
        # Skip if user_id is missing (required field in BigQuery)
        if not data.get("user_id"):
            skipped += 1
            continue
            
        row = {
            "id": doc.id,
            "user_id": data.get("user_id"),
            "note_id": data.get("note_id"),
            "category": data.get("category", "vocabulary"),
            "status": data.get("status", "new"),
            "created_at": convert_timestamp(data.get("created_at")),
            "next_due_at": convert_timestamp(data.get("next_review")),
            "interval": data.get("interval", 0),
            "ease_factor": data.get("ease_factor", 2.5),
        }
        rows.append(row)
    
    print(f"  Found {len(rows)} valid flashcards")
    if skipped > 0:
        print(f"  ⚠️  Skipped {skipped} flashcards with missing user_id")
    
    if not rows:
        print("  ⚠️  No flashcards to export")
        return 0
    
    # Write to temp JSON file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        for row in rows:
            f.write(json.dumps(row) + '\n')
        temp_file = f.name
    
    print(f"  Wrote data to {temp_file}")
    
    # Load into BigQuery
    table_id = f"{project_id}.{settings.bigquery_dataset_id}.flashcards"
    
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,  # Replace existing data
    )
    
    with open(temp_file, 'rb') as source_file:
        job = client.load_table_from_file(source_file, table_id, job_config=job_config)
    
    print("  Loading data into BigQuery...")
    job.result()  # Wait for the job to complete
    
    # Cleanup
    os.unlink(temp_file)
    
    # Verify
    table = client.get_table(table_id)
    print(f"  ✅ Loaded {table.num_rows} rows into {table_id}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
