# BigQuery Export Scripts

This directory contains scripts for exporting Firestore data to BigQuery for analytics.

## export_firestore_to_bq.py

Exports Firestore collections to BigQuery tables for analytics and ML preparation.

### Prerequisites

1. **Enable BigQuery API** in your GCP project:
   ```bash
   gcloud services enable bigquery.googleapis.com --project learningaier-lab
   ```

2. **Grant BigQuery Permissions** to the service account:
   ```bash
   gcloud projects add-iam-policy-binding learningaier-lab \
     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@learningaier-lab.iam.gserviceaccount.com" \
     --role="roles/bigquery.dataEditor"
   
   gcloud projects add-iam-policy-binding learningaier-lab \
     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@learningaier-lab.iam.gserviceaccount.com" \
     --role="roles/bigquery.jobUser"
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Usage

**Dry Run** (preview data without inserting):
```bash
ENV=lab python scripts/export_firestore_to_bq.py --user-id YOUR_USER_ID --dry-run
```

**Export Specific User's Data**:
```bash
ENV=lab python scripts/export_firestore_to_bq.py --user-id YOUR_USER_ID
```

**Export All Users**:
```bash
ENV=lab python scripts/export_firestore_to_bq.py
```

**Export Specific Collections**:
```bash
ENV=lab python scripts/export_firestore_to_bq.py \
  --collections notes,flashcards \
  --user-id YOUR_USER_ID
```

### Options

- `--user-id`: Filter by specific user ID
- `--collections`: Comma-separated list of collections to export (default: notes,flashcards,flashcard_reviews)
- `--env`: Environment to use (default: local.lab)
- `--dry-run`: Preview data without inserting to BigQuery

### What It Does

1. Creates the `learningaier_analytics` dataset if it doesn't exist
2. Creates tables:
   - `notes` (id, user_id, word_count, folder_id, created_at, updated_at)
   - `flashcards` (id, user_id, note_id, category, status, interval, ease_factor, created_at, next_due_at)
   - `flashcard_reviews` (id, flashcard_id, user_id, rating, reviewed_at, scheduled_interval)
   - `note_chunks` (id, note_id, chunk_index, content_preview, created_at)
3. Exports selected Firestore collections to corresponding BigQuery tables
4. Uses batch inserts for efficiency

## bigquery_views.sql

SQL view definitions for analytics queries. These provide pre-computed aggregations for common analytics queries.

### Views Included

1. **`user_study_stats`**: Overall study statistics per user
   - total_notes, total_flashcards, total_reviews
   - avg_interval, mastery_rate_percent

2. **`flashcard_difficulty_stats`**: Per-flashcard difficulty metrics
   - Review counts by rating (again/hard/good/easy)
   - Average interval, difficulty score

3. **`daily_review_activity`**: Daily review activity (last 30 days)
   - Review count per day
   - Average rating per day

4. **`note_activity_stats`**: Note creation patterns
   - Notes created per day
   - Average and total word counts

### Creating Views

Run these SQL statements in the BigQuery console or via `bq` CLI:

```bash
bq query --project_id=learningaier-lab < scripts/bigquery_views.sql
```

Or copy/paste the SQL into the BigQuery console query editor.

## Troubleshooting

### Permission Errors

If you see permission errors like "Access Denied: BigQuery BigQuery: Permission denied":
1. Verify the service account has `bigquery.dataEditor` and `bigquery.jobUser` roles
2. Check that the BigQuery API is enabled in your project

### "Dataset not found" Errors

The script creates the dataset automatically. If you're getting this error:
1. Check that your project ID is correct
2. Verify you have permissions to create datasets

### Empty Results

If queries return no data:
1. Run the export script first to populate tables
2. Verify data exists in Firestore
3. Check that you're filtering by the correct user_id

## Costs

BigQuery charges for:
- **Storage**: ~$0.02/GB/month (first 10GB free)
- **Queries**: ~$5/TB scanned (first 1TB/month free)

Expected costs for typical usage:
- Small dataset (< 1GB): **Free**
- Medium dataset (1-10GB): **< $1/month**

Monitor usage in GCP Console → BigQuery → Project Details → Storage/Queries.
