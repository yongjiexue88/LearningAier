-- BigQuery analysis queries for A/B experiments

-- Query 1: Compare flashcard prompt variants
-- Shows which variant generates better flashcards based on latency and count
SELECT 
  jsonPayload.experiment_variant as variant,
  COUNT(*) as total_generations,
  AVG(CAST(jsonPayload.latency_ms AS INT64)) as avg_latency_ms,
  STDDEV(CAST(jsonPayload.latency_ms AS INT64)) as stddev_latency,
  AVG(CAST(jsonPayload.flashcards_count AS INT64)) as avg_flashcards_generated,
  MIN(CAST(jsonPayload.latency_ms AS INT64)) as min_latency,
  MAX(CAST(jsonPayload.latency_ms AS INT64)) as max_latency
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.experiment_name = 'flashcard_prompt_test'
  AND jsonPayload.event_type = 'generation'
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY variant
ORDER BY variant;

-- Query 2: Token usage by variant
-- Helps understand cost implications of different prompts
SELECT 
  jsonPayload.experiment_variant as variant,
  AVG(CAST(jsonPayload.token_count AS INT64)) as avg_total_tokens,
  AVG(CAST(jsonPayload.prompt_tokens AS INT64)) as avg_prompt_tokens,
  AVG(CAST(jsonPayload.completion_tokens AS INT64)) as avg_completion_tokens,
  -- Estimated cost (Gemini Flash pricing)
  AVG(CAST(jsonPayload.prompt_tokens AS INT64)) * 0.075 / 1000000 +
  AVG(CAST(jsonPayload.completion_tokens AS INT64)) * 0.30 / 1000000 as avg_cost_per_request
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.experiment_name = 'flashcard_prompt_test'
  AND jsonPayload.event = 'llm_prompt_response'
GROUP BY variant;

-- Query 3: User distribution across variants
-- Verify 50/50 split is working
SELECT 
  jsonPayload.experiment_variant as variant,
  COUNT(DISTINCT jsonPayload.user_id_hash) as unique_users,
  COUNT(*) as total_requests,
  ROUND(COUNT(DISTINCT jsonPayload.user_id_hash) * 100.0 / 
    SUM(COUNT(DISTINCT jsonPayload.user_id_hash)) OVER (), 2) as percent_users
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.experiment_name = 'flashcard_prompt_test'
  AND jsonPayload.event_type = 'assignment'
GROUP BY variant;

-- Query 4: Success rate by variant
-- If you track user_action events (like "saved", "edited", "deleted")
SELECT 
  jsonPayload.experiment_variant as variant,
  COUNTIF(jsonPayload.event_type = 'generation') as generations,
  COUNTIF(jsonPayload.event_type = 'user_action' AND jsonPayload.action = 'saved') as saved,
  COUNTIF(jsonPayload.event_type = 'user_action' AND jsonPayload.action = 'edited') as edited,
  ROUND(COUNTIF(jsonPayload.event_type = 'user_action' AND jsonPayload.action = 'saved') * 100.0 /
    COUNTIF(jsonPayload.event_type = 'generation'), 2) as save_rate_percent
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.experiment_name = 'flashcard_prompt_test'
GROUP BY variant;

-- Query 5: Daily usage by feature
SELECT 
  DATE(timestamp) as date,
  jsonPayload.feature as feature,
  COUNT(*) as request_count,
  SUM(CAST(jsonPayload.token_count AS INT64)) as total_tokens,
  AVG(CAST(jsonPayload.latency_ms AS INT64)) as avg_latency_ms
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.event = 'llm_prompt_response'
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date, feature
ORDER BY date DESC, request_count DESC;

-- Query 6: Template version adoption
-- Track which prompt templates are being used
SELECT 
  jsonPayload.prompt_template as template,
  jsonPayload.prompt_version as version,
  COUNT(*) as usage_count,
  MIN(timestamp) as first_used,
  MAX(timestamp) as last_used,
  COUNT(DISTINCT jsonPayload.user_id_hash) as unique_users
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.event = 'llm_prompt_request'
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY template, version
ORDER BY usage_count DESC;
