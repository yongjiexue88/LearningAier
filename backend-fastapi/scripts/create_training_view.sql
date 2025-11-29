CREATE OR REPLACE VIEW `learningaier-lab.learningaier_analytics.flashcard_training_view` AS
WITH ReviewHistory AS (
  SELECT
    r.id AS review_id,
    r.user_id,
    r.flashcard_id,
    r.rating,
    r.reviewed_at,
    r.scheduled_interval AS next_interval,
    -- Calculate previous review time to get actual interval
    LAG(r.reviewed_at) OVER (PARTITION BY r.flashcard_id ORDER BY r.reviewed_at) AS prev_reviewed_at,
    -- Count total reviews for this card up to this point
    ROW_NUMBER() OVER (PARTITION BY r.flashcard_id ORDER BY r.reviewed_at) AS review_sequence_number
  FROM
    `learningaier-lab.learningaier_analytics.flashcard_reviews` r
),
CardFeatures AS (
  SELECT
    f.id AS flashcard_id,
    f.category,
    f.note_id,
    n.word_count
  FROM
    `learningaier-lab.learningaier_analytics.flashcards` f
  LEFT JOIN
    `learningaier-lab.learningaier_analytics.notes` n ON f.note_id = n.id
),
UserStats AS (
  -- Compute rolling user stats (e.g. average rating in last 30 days)
  -- For simplicity in this view, we'll just take global user stats or skip complex rolling windows for now
  -- to keep the view performant. We can add complex features later.
  SELECT
    user_id,
    COUNT(*) as total_user_reviews,
    AVG(rating) as user_avg_rating
  FROM
    `learningaier-lab.learningaier_analytics.flashcard_reviews`
  GROUP BY user_id
)
SELECT
  rh.review_id,
  rh.user_id,
  rh.flashcard_id,
  
  -- Features
  cf.category,
  IFNULL(cf.word_count, 0) AS word_count,
  rh.rating,
  rh.review_sequence_number,
  
  -- Calculated feature: Actual days since last review (or 0 if first review)
  TIMESTAMP_DIFF(rh.reviewed_at, IFNULL(rh.prev_reviewed_at, rh.reviewed_at), DAY) AS days_since_last_review,
  
  -- User level features
  us.user_avg_rating,
  
  -- Label: The interval scheduled after this review
  rh.next_interval AS label_next_interval,
  
  -- Label Bucket (for classification)
  CASE
    WHEN rh.next_interval <= 1 THEN '1_day'
    WHEN rh.next_interval <= 3 THEN '2_3_days'
    WHEN rh.next_interval <= 7 THEN '4_7_days'
    WHEN rh.next_interval <= 14 THEN '8_14_days'
    WHEN rh.next_interval <= 30 THEN '15_30_days'
    ELSE '30_plus_days'
  END AS label_next_interval_bucket

FROM
  ReviewHistory rh
JOIN
  CardFeatures cf ON rh.flashcard_id = cf.flashcard_id
JOIN
  UserStats us ON rh.user_id = us.user_id
WHERE
  rh.next_interval IS NOT NULL;
