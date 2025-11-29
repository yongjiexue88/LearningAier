from google.cloud import bigquery
import os

def check_data():
    project_id = "learningaier-lab"
    dataset_id = "learningaier_analytics"
    
    client = bigquery.Client(project=project_id)
    dataset_ref = f"{project_id}.{dataset_id}"
    
    tables = ["flashcards", "flashcard_reviews", "notes"]
    
    print(f"Checking tables in {dataset_ref}...")
    for table_name in tables:
        table_ref = f"{dataset_ref}.{table_name}"
        try:
            query = f"SELECT COUNT(*) as count FROM `{table_ref}`"
            job = client.query(query)
            result = job.result()
            for row in result:
                print(f"  {table_name}: {row.count} rows")
        except Exception as e:
            print(f"  {table_name}: ❌ Error ({e})")

if __name__ == "__main__":
    check_data()
