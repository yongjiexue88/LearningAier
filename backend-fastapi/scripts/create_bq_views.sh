#!/bin/bash
# Create BigQuery views for analytics

PROJECT_ID="learningaier-lab"
DATASET="learningaier_analytics"

echo "Creating BigQuery views in ${PROJECT_ID}.${DATASET}..."

# View 1: User Study Stats
echo "📊 Creating user_study_stats view..."
bq query --use_legacy_sql=false --project_id="${PROJECT_ID}" <<'EOF'
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
  n.user_id;
EOF

# View 2: Flashcard Difficulty Stats
echo "📊 Creating flashcard_difficulty_stats view..."
bq query --use_legacy_sql=false --project_id="${PROJECT_ID}" <<'EOF'
CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.flashcard_difficulty_stats` AS
SELECT
  f.id as flashcard_id,
  f.user_id,
  f.note_id,
  f.status,
  f.interval as current_interval,
  f.ease_factor as current_ease_factor,
  COUNT(fr.id) as total_reviews,
  COUNTIF(fr.rating = 1) as again_count,
  COUNTIF(fr.rating = 2) as hard_count,
  COUNTIF(fr.rating = 3) as good_count,
  COUNTIF(fr.rating = 4) as easy_count,
  ROUND(AVG(fr.scheduled_interval), 1) as avg_scheduled_interval,
  ROUND(
    (COUNTIF(fr.rating = 1) * 3 + COUNTIF(fr.rating = 2) * 1) * 100.0 / 
    NULLIF(COUNT(fr.id), 0),
    1
  ) as difficulty_score
FROM
  `learningaier-lab.learningaier_analytics.flashcards` f
LEFT JOIN
  `learningaier-lab.learningaier_analytics.flashcard_reviews` fr ON f.id = fr.flashcard_id
GROUP BY
  f.id, f.user_id, f.note_id, f.status, f.interval, f.ease_factor;
EOF

# View 3: Daily Review Activity
echo "📊 Creating daily_review_activity view..."
bq query --use_legacy_sql=false --project_id="${PROJECT_ID}" <<'EOF'
CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.daily_review_activity` AS
SELECT
  user_id,
  DATE(reviewed_at) as review_date,
  COUNT(*) as review_count,
  ROUND(AVG(rating), 2) as avg_rating,
  COUNTIF(rating = 1) as again_count,
  COUNTIF(rating = 2) as hard_count,
  COUNTIF(rating = 3) as good_count,
  COUNTIF(rating = 4) as easy_count
FROM
  `learningaier-lab.learningaier_analytics.flashcard_reviews`
WHERE
  reviewed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  user_id, review_date
ORDER BY
  user_id, review_date DESC;
EOF

# View 4: Note Activity Stats
echo "📊 Creating note_activity_stats view..."
bq query --use_legacy_sql=false --project_id="${PROJECT_ID}" <<'EOF'
CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.note_activity_stats` AS
SELECT
  user_id,
  DATE(created_at) as creation_date,
  COUNT(*) as notes_created,
  ROUND(AVG(word_count), 0) as avg_word_count,
  SUM(word_count) as total_words
FROM
  `learningaier-lab.learningaier_analytics.notes`
WHERE
  created_at IS NOT NULL
GROUP BY
  user_id, creation_date
ORDER BY
  user_id, creation_date DESC;
EOF

echo "✅ All views created successfully!"
