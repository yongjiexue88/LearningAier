#!/bin/bash
# Create Flashcard Training View for ML Pipeline

PROJECT_ID="learningaier-lab"
DATASET="learningaier_analytics"

echo "📊 Creating flashcard_training_view..."

bq query --use_legacy_sql=false --project_id="${PROJECT_ID}" <<'EOF'
CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.flashcard_training_view` AS
SELECT
  f.id as flashcard_id,
  -- Features
  'General' as category, -- Placeholder, ideally join with notes tags
  CAST(IFNULL(n.word_count, 0) AS INT64) as word_count,
  fr.rating,
  ROW_NUMBER() OVER (PARTITION BY f.id ORDER BY fr.reviewed_at) as review_sequence_number,
  DATE_DIFF(DATE(fr.reviewed_at), DATE(f.created_at), DAY) as days_since_last_review, -- Approximation
  3.0 as user_avg_rating, -- Placeholder
  
  -- Target
  CASE
    WHEN fr.scheduled_interval < 4 THEN 'short'
    WHEN fr.scheduled_interval < 21 THEN 'medium'
    ELSE 'long'
  END as label_next_interval_bucket

FROM
  `learningaier-lab.learningaier_analytics.flashcard_reviews` fr
JOIN
  `learningaier-lab.learningaier_analytics.flashcards` f ON fr.flashcard_id = f.id
LEFT JOIN
  `learningaier-lab.learningaier_analytics.notes` n ON f.note_id = n.id
WHERE
  fr.rating IS NOT NULL
EOF

echo "✅ View created successfully!"
