# Export Firestore → BigQuery (LearningAier)

Minimal steps to run the export locally.

## 1) One-time setup
- Auth: `gcloud auth application-default login` and ensure project is `learningaier-lab` (`gcloud config get-value project`).
- Env vars: in `.env.lab` (or `.env.local`) set `FIREBASE_CREDENTIALS_JSON`, `BIGQUERY_PROJECT_ID=learningaier-lab`, `BIGQUERY_DATASET_ID=learningaier_analytics`.
- Python env: `cd backend-fastapi && source venv/bin/activate`.
  - If the venv defaults to Python 3.9, install BigQuery client into that interpreter: `python -m pip install --upgrade google-cloud-bigquery`.
  - If you want to use Python 3.13 in the same venv, call the script with `./venv/bin/python3.13 ...`.

## 2) Dry run (no writes)
```
cd backend-fastapi
source venv/bin/activate
python scripts/export_firestore_to_bq.py --env lab --dry-run --collections notes,flashcards,flashcard_reviews,note_chunks
```
You should see counts and a sample row for each collection; no data is written.

## 3) Full export
```
cd backend-fastapi
source venv/bin/activate
python scripts/export_firestore_to_bq.py --env lab --collections notes,flashcards,flashcard_reviews,note_chunks
```

### Useful variants
- Filter to one user: add `--user-id YOUR_USER_ID`.
- Export specific collections: `--collections note_chunks` (or any subset).

## 4) Quick verification
```
bq query --use_legacy_sql=false \
  "SELECT COUNT(*) AS rows FROM \`learningaier-lab.learningaier_analytics.note_chunks\`"
```
Replace table name as needed to spot-check other tables.***
