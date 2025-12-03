# BigQuery Analytics Setup & Command Guide

This guide documents the commands and steps used to set up the BigQuery analytics infrastructure for LearningAier (Phase 3).

## 1. Prerequisites & Setup

### Environment Configuration
Ensure your `.env.lab` (or relevant environment file) has the following BigQuery configuration:

```env
BIGQUERY_PROJECT_ID=learningaier-lab
BIGQUERY_DATASET_ID=learningaier_analytics
```

### Authentication
Authenticate with Google Cloud and set the correct project.

```bash
# Login with Application Default Credentials (ADC)
gcloud auth application-default login

# Set the project context
gcloud config set project learningaier-lab

# Verify current project
gcloud config get-value project
```

### Enable BigQuery API
Ensure the BigQuery API is enabled for your project.
```bash
gcloud services enable bigquery.googleapis.com
```

---

## 2. Data Export (Firestore → BigQuery)

We use Python scripts to export/sync Firestore to BigQuery.

### Dry Run (Validation)
Check what data will be exported without actually inserting it.

```bash
# Run from backend-fastapi directory
python3 scripts/export_firestore_to_bq.py --env lab --dry-run
```

### Full Export
Export all collections (notes, flashcards, reviews) to BigQuery. This creates the dataset and tables if they don't exist.

```bash
python3 scripts/export_firestore_to_bq.py --env lab
```

### Export Specific Collections
If you only need to update specific tables (e.g., just flashcards).

```bash
python3 scripts/export_firestore_to_bq.py --env lab --collections flashcards
```

### Quick minimal cheatsheet (from CLI)
```bash
gcloud auth application-default login
gcloud config set project learningaier-lab
cd backend-fastapi && source venv/bin/activate
python scripts/export_firestore_to_bq.py --env lab --dry-run --collections notes,flashcards,flashcard_reviews,note_chunks
python scripts/export_firestore_to_bq.py --env lab --collections notes,flashcards,flashcard_reviews,note_chunks
```

### Troubleshooting: Flashcard Export
If the standard export fails or results in 0 rows (due to schema issues like missing `user_id`), use the fix script which uses batch loading (`load_table_from_json`) and validation.

```bash
python3 scripts/fix_flashcards_export.py
```

---

## 3. Automated Daily Sync (Cloud Run Jobs)

We have set up a Cloud Run Job to automatically sync data every night at 3 AM UTC.

### Deployment (with Secret Manager)
The deployment script automatically handles secure credential storage using Google Secret Manager. It reads your local `FIREBASE_CREDENTIALS_JSON` from `.env.local` and securely mounts it into the Cloud Run Job.

```bash
# This script will:
# 1. Enable Secret Manager API
# 2. Create/Update 'firebase-credentials' secret
# 3. Deploy Cloud Run Job with secret mounted
# 4. Create Cloud Scheduler trigger
./scripts/deploy_sync_job.sh
```

### Manually Trigger the Job
If you want to run the sync immediately in the cloud:

```bash
gcloud run jobs execute firestore-bq-sync --region us-central1
```

### View Job Status
```bash
gcloud run jobs executions list --job firestore-bq-sync --region us-central1
```

---

## 4. Creating Analytics Views

We use SQL views to aggregate data for the dashboard.

### Automated View Creation
Run the shell script to create all 4 standard views (`user_study_stats`, `flashcard_difficulty_stats`, `daily_review_activity`, `note_activity_stats`).

```bash
# Make script executable
chmod +x scripts/create_bq_views.sh

# Run the script
./scripts/create_bq_views.sh
```

### Manual View Creation (CLI)
You can also create views individually using the `bq` command line tool.

**Example: Creating User Study Stats View**
```bash
bq query --use_legacy_sql=false --project_id=learningaier-lab '
CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.user_study_stats` AS
SELECT
  n.user_id,
  COUNT(DISTINCT n.id) as total_notes,
  COUNT(DISTINCT f.id) as total_flashcards,
  COUNT(DISTINCT fr.id) as total_reviews,
  ROUND(AVG(f.interval), 1) as avg_interval,
  ROUND(
    COUNTIF(f.interval >= 21) * 100.0 / NULLIF(COUNT(DISTINCT f.id), 0),
    1
  ) as mastery_rate_percent
FROM
  `learningaier-lab.learningaier_analytics.notes` n
LEFT JOIN
  `learningaier-lab.learningaier_analytics.flashcards` f ON n.user_id = f.user_id
LEFT JOIN
  `learningaier-lab.learningaier_analytics.flashcard_reviews` fr ON f.id = fr.flashcard_id
GROUP BY
  n.user_id;'
```

---

## 5. Verification & Testing

### Run Integration Test
Run the Python test script to verify the Analytics Service can connect to BigQuery.

```bash
python3 scripts/test_analytics.py
```

### Verify Tables & Views (Quick Check)
Run the verification script to list all tables/views and check row counts.

```bash
python3 scripts/verify_bigquery.py
```

### Direct BigQuery Queries (CLI)
Query tables directly to inspect data.

**Check row counts:**
```bash
bq query --use_legacy_sql=false "SELECT COUNT(*) as count FROM \`learningaier-lab.learningaier_analytics.notes\`"
```

**Preview data (JSON format):**
```bash
bq query --use_legacy_sql=false --format=json "SELECT * FROM \`learningaier-lab.learningaier_analytics.user_study_stats\` LIMIT 1"
```

---

## 6. Key Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| `test_analytics.py` | Tests backend service integration | `backend-fastapi/scripts/` |

---

## 7. Credential Strategy

Understanding when to use which credential is key to this dual-environment setup.

### 1. Production Service Account Key (`FIREBASE_CREDENTIALS_JSON`)
This is the "Master Key" for your Production project (`learningaier`).
*   **What it is:** A JSON file containing the private key for the `firebase-adminsdk` service account.
*   **Where it lives:**
    *   **Locally:** In your `.env.local` file.
    *   **Cloud Run (Lab):** Stored in **Secret Manager** and mounted as an environment variable.
    *   **GitHub Actions:** Stored as a GitHub Secret (`FIREBASE_CREDENTIALS_JSON`).
*   **When to use it:**
    *   **Cross-Project Access:** When a service in the Lab environment (like the sync job) needs to read/write to the Production database.
    *   **Local Development:** When you run the app locally (`ENV=local`) and want to connect to the real production database.

### 2. Application Default Credentials (ADC)
This is the "Native Identity" of the environment where the code is running.
*   **What it is:** Credentials automatically provided by Google Cloud Platform based on the service account attached to the resource (e.g., Cloud Run Service Account).
*   **Where it lives:** Managed transparently by GCP.
*   **When to use it:**
    *   **Same-Project Access:** When a service running in `learningaier-lab` needs to access resources *within* `learningaier-lab` (e.g., the Lab BigQuery dataset).
    *   **Simplicity:** It's the preferred method because you don't manage keys. We use this for BigQuery access in the Lab environment.

### Summary Table

| Scenario | Environment | Credential Used | Why? |
| :--- | :--- | :--- | :--- |
| **Sync Job** (Lab) | Cloud Run | `FIREBASE_CREDENTIALS_JSON` | Needs to read **Production** Firestore (Cross-Project). |
| **Backend API** (Lab) | Cloud Run | `ADC` (Default) | Accesses **Lab** BigQuery (Same-Project). |
| **Local Dev** | Your Laptop | `FIREBASE_CREDENTIALS_JSON` | Needs to access **Production** Firestore. |
| **GitHub Actions** | CI/CD | `GCP_SA_KEY_LAB` (JSON) | Needs to deploy to **Lab** project. |
