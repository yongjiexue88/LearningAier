#!/usr/bin/env python3
"""
Quick verification script to check BigQuery tables and views.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from google.cloud import bigquery
from app.config import get_settings

def main():
    # Set environment
    os.environ["ENV"] = "lab"
    settings = get_settings()
    
    project_id = settings.bigquery_project_id or settings.firebase_project_id
    dataset_id = settings.bigquery_dataset_id
    
    print(f"🔍 Verifying BigQuery Setup")
    print(f"   Project: {project_id}")
    print(f"   Dataset: {dataset_id}\n")
    
    try:
        client = bigquery.Client(project=project_id)
        
        # List tables
        print("📋 Tables in dataset:")
        dataset_ref = f"{project_id}.{dataset_id}"
        tables = list(client.list_tables(dataset_ref))
        
        for table in tables:
            print(f"   • {table.table_id} ({table.table_type})")
            
            # Get row count for tables (not views)
            if table.table_type == "TABLE":
                query = f"SELECT COUNT(*) as count FROM `{project_id}.{dataset_id}.{table.table_id}`"
                result = client.query(query).result()
                for row in result:
                    print(f"     → {row.count} rows")
        
        print("\n✅ BigQuery verification complete!")
        
        # Test a simple view query
        print("\n🧪 Testing user_study_stats view...")
        query = f"""
        SELECT * FROM `{project_id}.{dataset_id}.user_study_stats`
        LIMIT 1
        """
        result = client.query(query).result()
        
        for row in result:
            print(f"   User ID: {row.user_id}")
            print(f"   Total Notes: {row.total_notes}")
            print(f"   Total Flashcards: {row.total_flashcards}")
            print(f"   Total Reviews: {row.total_reviews}")
            print(f"   Avg Interval: {row.avg_interval}")
            print(f"   Mastery Rate: {row.mastery_rate_percent}%")
        
        print("\n✅ All checks passed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
