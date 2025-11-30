#!/usr/bin/env python3
"""
Export Firestore data to BigQuery for analytics.

Usage:
    python scripts/export_firestore_to_bq.py --user-id <user_id>
    python scripts/export_firestore_to_bq.py --collections notes,flashcards --dry-run
"""
import argparse
import sys
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from google.cloud import bigquery
from app.core.firebase import get_firestore_client
from app.config import get_settings


def create_dataset_if_not_exists(client: bigquery.Client, dataset_id: str, project_id: str):
    """Create BigQuery dataset if it doesn't exist."""
    dataset_ref = f"{project_id}.{dataset_id}"
    try:
        client.get_dataset(dataset_ref)
        print(f"✓ Dataset {dataset_ref} already exists")
    except Exception:
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "US"
        dataset = client.create_dataset(dataset, timeout=30)
        print(f"✓ Created dataset {dataset_ref}")


def create_tables_if_not_exist(client: bigquery.Client, dataset_ref: str):
    """Create BigQuery tables if they don't exist."""
    
    # Notes table
    notes_schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("title", "STRING"),
        bigquery.SchemaField("word_count", "INTEGER"),
        bigquery.SchemaField("folder_id", "STRING"),
        bigquery.SchemaField("created_at", "TIMESTAMP"),
        bigquery.SchemaField("updated_at", "TIMESTAMP"),
    ]
    create_table(client, dataset_ref, "notes", notes_schema)
    
    # Flashcards table
    flashcards_schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("note_id", "STRING"),
        bigquery.SchemaField("category", "STRING"),
        bigquery.SchemaField("status", "STRING"),
        bigquery.SchemaField("created_at", "TIMESTAMP"),
        bigquery.SchemaField("next_due_at", "TIMESTAMP"),
        bigquery.SchemaField("interval", "INTEGER"),
        bigquery.SchemaField("ease_factor", "FLOAT"),
    ]
    create_table(client, dataset_ref, "flashcards", flashcards_schema)
    
    # Flashcard reviews table
    reviews_schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("flashcard_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("rating", "INTEGER"),
        bigquery.SchemaField("reviewed_at", "TIMESTAMP"),
        bigquery.SchemaField("scheduled_interval", "INTEGER"),
    ]
    create_table(client, dataset_ref, "flashcard_reviews", reviews_schema)
    
    # Note chunks table (optional)
    chunks_schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("note_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("chunk_index", "INTEGER"),
        bigquery.SchemaField("content_preview", "STRING"),
        bigquery.SchemaField("created_at", "TIMESTAMP"),
    ]
    create_table(client, dataset_ref, "note_chunks", chunks_schema)


def create_table(client: bigquery.Client, dataset_ref: str, table_name: str, schema: List[bigquery.SchemaField]):
    """Create a single table if it doesn't exist."""
    table_ref = f"{dataset_ref}.{table_name}"
    try:
        client.get_table(table_ref)
        print(f"✓ Table {table_name} already exists")
    except Exception:
        table = bigquery.Table(table_ref, schema=schema)
        table = client.create_table(table)
        print(f"✓ Created table {table_name}")


def export_notes(db, bq_client, dataset_ref: str, user_id: Optional[str] = None, dry_run: bool = False) -> int:
    """Export notes collection to BigQuery."""
    print("\n📝 Exporting notes...")
    
    query = db.collection("notes")
    if user_id:
        query = query.where("user_id", "==", user_id)
    
    rows = []
    for doc in query.stream():
        data = doc.to_dict()
        
        # Calculate word count
        content_zh = data.get("content_md_zh", "")
        content_en = data.get("content_md_en", "")
        word_count = len(content_zh.split()) + len(content_en.split())
        
        row = {
            "id": doc.id,
            "user_id": data.get("user_id"),
            "title": data.get("title", ""),
            "word_count": word_count,
            "folder_id": data.get("folder_id"),
            "created_at": convert_timestamp(data.get("created_at")),
            "updated_at": convert_timestamp(data.get("updated_at")),
        }
        rows.append(row)
    
    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} notes")
        if rows:
            print(f"  Sample: {rows[0]}")
    else:
        if rows:
            table_ref = f"{dataset_ref}.notes"
            errors = bq_client.insert_rows_json(table_ref, rows)
            if errors:
                print(f"  ❌ Errors: {errors}")
            else:
                print(f"  ✓ Inserted {len(rows)} notes")
        else:
            print(f"  ⚠ No notes found")
    
    return len(rows)


def export_flashcards(db, bq_client, dataset_ref: str, user_id: Optional[str] = None, dry_run: bool = False) -> int:
    """Export flashcards collection to BigQuery."""
    print("\n🎴 Exporting flashcards...")
    
    query = db.collection("flashcards")
    if user_id:
        query = query.where("user_id", "==", user_id)
    
    rows = []
    for doc in query.stream():
        data = doc.to_dict()
        
        # Skip if user_id is missing (required field in BigQuery)
        if not data.get("user_id"):
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
    
    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} flashcards")
        if rows:
            print(f"  Sample: {rows[0]}")
    else:
        if rows:
            table_ref = f"{dataset_ref}.flashcards"
            errors = bq_client.insert_rows_json(table_ref, rows)
            if errors:
                print(f"  ❌ Errors: {errors}")
            else:
                print(f"  ✓ Inserted {len(rows)} flashcards")
        else:
            print(f"  ⚠ No flashcards found")
    
    return len(rows)


def export_flashcard_reviews(db, bq_client, dataset_ref: str, user_id: Optional[str] = None, dry_run: bool = False) -> int:
    """Export flashcard reviews collection to BigQuery."""
    print("\n📊 Exporting flashcard reviews...")
    
    query = db.collection("flashcard_reviews")
    if user_id:
        query = query.where("user_id", "==", user_id)
    
    rows = []
    for doc in query.stream():
        data = doc.to_dict()
        row = {
            "id": doc.id,
            "flashcard_id": data.get("flashcard_id"),
            "user_id": data.get("user_id"),
            "rating": data.get("rating"),
            "reviewed_at": convert_timestamp(data.get("reviewed_at")),
            "scheduled_interval": data.get("scheduled_interval", 0),
        }
        rows.append(row)
    
    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} reviews")
        if rows:
            print(f"  Sample: {rows[0]}")
    else:
        if rows:
            table_ref = f"{dataset_ref}.flashcard_reviews"
            errors = bq_client.insert_rows_json(table_ref, rows)
            if errors:
                print(f"  ❌ Errors: {errors}")
            else:
                print(f"  ✓ Inserted {len(rows)} reviews")
        else:
            print(f"  ⚠ No reviews found")
    
    return len(rows)

def export_note_chunks(db, bq_client, dataset_ref: str, user_id: Optional[str] = None, dry_run: bool = False) -> int:
    """Export note chunks collection (for RAG) to BigQuery."""
    print("\n🧩 Exporting note chunks...")

    # If a user filter is provided, precompute that user's note ids for filtering
    allowed_note_ids = None
    if user_id:
        allowed_note_ids = set()
        for note_doc in db.collection("notes").where("user_id", "==", user_id).stream():
            allowed_note_ids.add(note_doc.id)
        print(f"  User {user_id} has {len(allowed_note_ids)} notes for chunk export")

    rows = []
    for doc in db.collection("note_chunks").stream():
        data = doc.to_dict()

        # Try to resolve note_id from document data or path
        note_id = data.get("note_id")
        if not note_id:
            try:
                # Handles nested path like notes/{note_id}/chunks/{chunk_id}
                note_id = doc.reference.parent.parent.id if doc.reference.parent and doc.reference.parent.parent else None
            except Exception:
                note_id = None

        if not note_id:
            # Skip records we can't associate to a note
            continue

        if allowed_note_ids is not None and note_id not in allowed_note_ids:
            continue

        content_preview = data.get("content_preview")
        if not content_preview:
            # Fall back to a shortened content field if present
            content_preview = (data.get("content") or "")[:200]

        row = {
            "id": doc.id,
            "note_id": note_id,
            "chunk_index": data.get("chunk_index", 0),
            "content_preview": content_preview,
            "created_at": convert_timestamp(data.get("created_at")),
        }
        rows.append(row)

    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} note chunks")
        if rows:
            print(f"  Sample: {rows[0]}")
    else:
        if rows:
            table_ref = f"{dataset_ref}.note_chunks"
            errors = bq_client.insert_rows_json(table_ref, rows)
            if errors:
                print(f"  ❌ Errors: {errors}")
            else:
                print(f"  ✓ Inserted {len(rows)} note chunks")
        else:
            print("  ⚠ No note chunks found")

    return len(rows)


def convert_timestamp(ts) -> Optional[str]:
    """Convert Firestore timestamp to BigQuery-compatible ISO string."""
    if ts is None:
        return None
    
    if hasattr(ts, 'timestamp'):
        # Firestore timestamp
        return datetime.fromtimestamp(ts.timestamp()).isoformat()
    elif isinstance(ts, datetime):
        return ts.isoformat()
    elif isinstance(ts, str):
        return ts
    else:
        return None


def main():
    parser = argparse.ArgumentParser(description="Export Firestore data to BigQuery")
    parser.add_argument("--user-id", help="Filter by specific user ID")
    parser.add_argument(
        "--collections",
        default="notes,flashcards,flashcard_reviews,note_chunks",
        help="Comma-separated list of collections to export"
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview data without inserting")
    parser.add_argument("--env", default="local.lab", help="Environment (e.g., local.lab)")
    
    args = parser.parse_args()
    
    # Set ENV environment variable
    os.environ["ENV"] = args.env.replace("local.", "")
    
    # Load settings
    settings = get_settings()
    
    # Initialize clients
    print("🔧 Initializing clients...")
    db = get_firestore_client()
    
    bq_project = settings.bigquery_project_id or settings.firebase_project_id
    bq_client = bigquery.Client(project=bq_project)
    
    print(f"  BigQuery Project: {bq_project}")
    print(f"  Dataset: {settings.bigquery_dataset_id}")
    if args.user_id:
        print(f"  User Filter: {args.user_id}")
    
    dataset_ref = f"{bq_project}.{settings.bigquery_dataset_id}"
    
    # Create dataset and tables
    if not args.dry_run:
        create_dataset_if_not_exists(bq_client, settings.bigquery_dataset_id, bq_project)
        create_tables_if_not_exist(bq_client, dataset_ref)
    
    # Export collections
    collections = [c.strip() for c in args.collections.split(",")]
    total_exported = 0
    
    if "notes" in collections:
        total_exported += export_notes(db, bq_client, dataset_ref, args.user_id, args.dry_run)
    
    if "flashcards" in collections:
        total_exported += export_flashcards(db, bq_client, dataset_ref, args.user_id, args.dry_run)
    
    if "flashcard_reviews" in collections:
        total_exported += export_flashcard_reviews(db, bq_client, dataset_ref, args.user_id, args.dry_run)

    if "note_chunks" in collections:
        total_exported += export_note_chunks(db, bq_client, dataset_ref, args.user_id, args.dry_run)
    
    print(f"\n✅ Export complete! Total records: {total_exported}")
    if args.dry_run:
        print("   (Dry run - no data was actually inserted)")


if __name__ == "__main__":
    main()
