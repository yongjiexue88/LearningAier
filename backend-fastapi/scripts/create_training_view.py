from google.cloud import bigquery
import os

def create_view():
    project_id = "learningaier-lab"
    dataset_id = "learningaier_analytics"
    view_id = "flashcard_training_view"
    
    client = bigquery.Client(project=project_id)
    dataset_ref = f"{project_id}.{dataset_id}"
    view_ref = f"{dataset_ref}.{view_id}"
    
    view = bigquery.Table(view_ref)
    
    sql = f"""
    CREATE OR REPLACE VIEW `{view_ref}` AS
    WITH review_history AS (
      SELECT
        r.id as review_id,
        r.flashcard_id,
        r.user_id,
        r.rating,
        r.reviewed_at,
        r.scheduled_interval as next_interval,
        -- Feature: Interval BEFORE this review (derived from previous review outcome)
        LAG(r.scheduled_interval, 1, 0) OVER (PARTITION BY r.flashcard_id ORDER BY r.reviewed_at) as current_interval,
        -- Feature: User activity in last 7 days (rolling window)
        COUNT(*) OVER (
          PARTITION BY r.user_id 
          ORDER BY UNIX_SECONDS(r.reviewed_at) 
          RANGE BETWEEN 604800 PRECEDING AND 1 PRECEDING
        ) as user_review_count_7d
      FROM
        `{dataset_ref}.flashcard_reviews` r
    )
    SELECT
      rh.review_id,
      rh.user_id,
      rh.flashcard_id,
      rh.reviewed_at,
      -- Features
      COALESCE(f.category, 'vocabulary') as card_category,
      COALESCE(n.word_count, 0) as note_length,
      rh.rating as response,
      rh.current_interval,
      rh.user_review_count_7d,
      -- Label: Next Interval Bucket
      CASE
        WHEN rh.next_interval <= 1 THEN 1
        WHEN rh.next_interval <= 3 THEN 2
        WHEN rh.next_interval <= 7 THEN 3
        ELSE 4
      END as label_next_interval_bucket
    FROM
      review_history rh
    JOIN
      `{dataset_ref}.flashcards` f ON rh.flashcard_id = f.id
    LEFT JOIN
      `{dataset_ref}.notes` n ON f.note_id = n.id
    WHERE
      rh.rating IS NOT NULL;
    """
    
    print(f"Creating view {view_ref}...")
    try:
        # We use query() to execute DDL
        job = client.query(sql)
        job.result()  # Wait for job to complete
        print(f"✅ View {view_ref} created successfully.")
    except Exception as e:
        print(f"❌ Error creating view: {e}")

if __name__ == "__main__":
    create_view()
