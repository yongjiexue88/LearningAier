# LLMOps Guide

This guide explains how to use the LLMOps infrastructure for prompt management, monitoring, and experimentation.

## Overview

The LLMOps system provides:
1. **Prompt Versioning**: Centralized prompt template registry
2. **Structured Logging**: All LLM requests logged to Cloud Logging
3. **Usage Metrics**: Token counts, latency, costs
4. **A/B Testing**: Experiment with different prompts

## Architecture

```
LLM Request Flow:
┌─────────────┐
│   Service   │ (e.g., flashcard_service.py)
└──────┬──────┘
       │ 1. Get prompt template + version
       ▼
┌─────────────────────┐
│ prompt_templates.py │
└──────┬──────────────┘
       │ 2. Log request (user, feature, template, version)
       ▼
┌─────────────────┐
│ llm_monitoring  │ ──► Cloud Logging
└──────┬──────────┘
       │ 3. Call LLM
       ▼
┌─────────────┐
│ LLM Service │ ──► Vertex AI
└──────┬──────┘
       │ 4. Log response (tokens, latency)
       ▼
   Cloud Logging ──► BigQuery (optional)
                 ──► Metrics (dashboards)
```

## Prompt Versioning

### Adding a New Prompt Template

Edit `backend-fastapi/app/services/prompt_templates.py`:

```python
PROMPT_TEMPLATES = {
    "my_new_prompt_v1": {
        "version": "1.0",
        "template": """Your prompt here with {variable} placeholders.""",
        "metadata": {
            "created": "2025-11-29",
            "author": "your-name",
            "description": "What this prompt does"
        }
    }
}
```

### Using a Prompt in Your Service

```python
from app.services.prompt_templates import get_prompt

# Get prompt with variables filled in
prompt_text, version = get_prompt("my_new_prompt_v1", variable="value")

# Use prompt_text for LLM call
# Log version for tracking
```

### Best Practices

1. **Never modify existing templates** - Create new versions (v2, v3) instead
2. **Document changes** in metadata description
3. **Use semantic versioning**: 
   - Major (2.0): Breaking changes to output format
   - Minor (1.1): New features, backward compatible
   - Patch (1.0.1): Bug fixes

## Monitoring

### Log Request

Every LLM call should be logged:

```python
from app.services.llm_monitoring import LLMMonitor

monitor = LLMMonitor(user_id=user_id)

monitor.log_prompt_request(
    feature="flashcards",  # or "qa", "graph", "translate"
    prompt_template_name="flashcard_generator_v2",
    prompt_version="2.0",
    model_name="gemini-2.0-flash-exp",
    additional_data={
        "note_id": "abc123",
        "count": 5
    }
)

# ... make LLM call ...

monitor.log_prompt_response(
    token_count=1250,
    prompt_tokens=500,
    completion_tokens=750,
    success=True
)
```

### Log Schema

All logs are structured JSON in Cloud Logging:

```json
{
  "event": "llm_prompt_request",
  "timestamp": "2025-11-29T14:44:03Z",
  "user_id_hash": "a1b2c3d4e5f6",
  "feature": "flashcards",
  "prompt_template": "flashcard_generator_v2",
  "prompt_version": "2.0",
  "model_name": "gemini-2.0-flash-exp",
  "latency_ms": 850,
  "token_count": 1250,
  "prompt_tokens": 500,
  "completion_tokens": 750
}
```

### Viewing Logs in Console

1. Go to [Cloud Logging](https://console.cloud.google.com/logs)
2. Query:
   ```
   jsonPayload.event="llm_prompt_request"
   jsonPayload.feature="flashcards"
   ```
3. Filter by date range, user, template, etc.

### Creating Log-Based Metrics

**Metric 1: Total Tokens by Feature**

```bash
gcloud logging metrics create llm_tokens_by_feature \
  --project=learningaier-lab \
  --description="Total tokens used per feature" \
  --value-extractor='EXTRACT(jsonPayload.token_count)' \
  --metric-kind=DELTA \
  --value-type=INT64 \
  --log-filter='jsonPayload.event="llm_prompt_response" AND jsonPayload.feature!=""'
```

**Metric 2: Request Count by Template**

```bash
gcloud logging metrics create llm_requests_by_template \
  --project=learningaier-lab \
  --description="Request count per prompt template" \
  --log-filter='jsonPayload.event="llm_prompt_request"'
```

### View Metrics in Monitoring

1. Go to [Metrics Explorer](https://console.cloud.google.com/monitoring/metrics-explorer)
2. Select metric: `logging/user/llm_tokens_by_feature`
3. Group by: `jsonPayload.feature`
4. Aggregation: Sum
5. Create dashboard for tracking

## BigQuery Export (Optional)

### Setup

```bash
# Create dataset
bq mk --dataset learningaier-lab:llm_logs

# Create log sink
gcloud logging sinks create llm-logs-to-bq \
  bigquery.googleapis.com/projects/learningaier-lab/datasets/llm_logs \
  --log-filter='jsonPayload.prompt_template!=""' \
  --project=learningaier-lab

# Grant permissions to sink service account
SINK_SA=$(gcloud logging sinks describe llm-logs-to-bq --format='value(writerIdentity)')

bq update --dataset \
  --access_role=WRITER \
  --access_identity="$SINK_SA" \
  learningaier-lab:llm_logs
```

### Analysis Queries

**Token usage by feature:**
```sql
SELECT 
  jsonPayload.feature as feature,
  SUM(CAST(jsonPayload.token_count AS INT64)) as total_tokens,
  AVG(CAST(jsonPayload.latency_ms AS INT64)) as avg_latency_ms,
  COUNT(*) as request_count
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.event = 'llm_prompt_response'
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY feature
ORDER BY total_tokens DESC
```

**Compare prompt versions:**
```sql
SELECT 
  jsonPayload.prompt_template as template,
  jsonPayload.prompt_version as version,
  AVG(CAST(jsonPayload.latency_ms AS INT64)) as avg_latency,
  AVG(CAST(jsonPayload.token_count AS INT64)) as avg_tokens,
  COUNT(*) as usage_count
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.feature = 'flashcards'
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY template, version
ORDER BY usage_count DESC
```

## A/B Testing

### Running an Experiment

1. **Define experiment** in `app/services/ab_experiment.py`:

```python
EXPERIMENTS = {
    "flashcard_prompt_test": {
        "active": True,  # Set to True to start
        "description": "Test v1 vs v2",
        "variants": {
            "A": "flashcard_generator_v1",
            "B": "flashcard_generator_v2"
        },
        "traffic_split": 0.5,  # 50/50
        "metrics": ["acceptance_rate", "latency"]
    }
}
```

2. **Integrate into service** (already done for flashcard_service.py):

```python
from app.services.ab_experiment import (
    is_experiment_active,
    assign_variant,
    get_experiment_prompt,
    log_experiment_event,
    ExperimentEvent
)

# Check if experiment active
if is_experiment_active("flashcard_prompt_test"):
    variant = assign_variant(user_id, "flashcard_prompt_test")
    template_name = get_experiment_prompt("flashcard_prompt_test", variant)
    
    # Log assignment
    log_experiment_event(
        user_id,
        "flashcard_prompt_test",
        variant,
        ExperimentEvent.ASSIGNMENT
    )
```

3. **Deploy** changed code

4. **Wait** for data (recommend 100+ users per variant)

5. **Analyze** results in BigQuery:

```sql
-- Compare variants
SELECT 
  jsonPayload.experiment_variant as variant,
  COUNT(*) as generations,
  AVG(CAST(jsonPayload.latency_ms AS INT64)) as avg_latency,
  AVG(CAST(jsonPayload.flashcards_count AS INT64)) as avg_count
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.experiment_name = 'flashcard_prompt_test'
  AND jsonPayload.event_type = 'generation'
GROUP BY variant
```

6. **Choose winner** based on metrics

7. **Set experiment active = False** and use winning template as default

### Sticky Assignment

Users always get the same variant (based on hash of user_id). This ensures:
- Consistent user experience
- Valid statistical comparison
- No variant switching mid-session

## Cost Tracking

### Estimate Costs

Vertex AI pricing (approximate):
- **gemini-2.0-flash-exp**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **text-embedding-004**: $0.025 per 1M tokens

**Example calculation:**
```
Feature: Flashcards
Avg input tokens: 500
Avg output tokens: 300
Requests per day: 100

Daily cost = (500 * 100 * 0.075 + 300 * 100 * 0.30) / 1,000,000
           = (3,750 + 9,000) / 1,000,000
           = $0.01275/day
           ≈ $0.38/month
```

### Monitor Costs

Create BigQuery view:

```sql
CREATE VIEW `learningaier-lab.llm_logs.daily_costs` AS
SELECT 
  DATE(timestamp) as date,
  jsonPayload.feature as feature,
  SUM(CAST(jsonPayload.prompt_tokens AS INT64)) as prompt_tokens,
  SUM(CAST(jsonPayload.completion_tokens AS INT64)) as completion_tokens,
  -- Gemini Flash pricing
  (SUM(CAST(jsonPayload.prompt_tokens AS INT64)) * 0.075 / 1000000) +
  (SUM(CAST(jsonPayload.completion_tokens AS INT64)) * 0.30 / 1000000) as estimated_cost_usd
FROM `learningaier-lab.llm_logs.cloudaudit_googleapis_com_data_access_*`
WHERE jsonPayload.event = 'llm_prompt_response'
GROUP BY date, feature
ORDER BY date DESC, estimated_cost_usd DESC
```

Query daily costs:
```sql
SELECT * FROM `learningaier-lab.llm_logs.daily_costs`
WHERE date >= CURRENT_DATE() - 30
```

## Troubleshooting

**Logs not appearing:**
- Check service is using `llm_monitoring.log_prompt_request()`
- Verify structured logging format
- Check Cloud Logging filter

**Metrics not updating:**
- Refresh Metrics Explorer (may take 2-3 minutes)
- Verify log-based metric filter matches log format

**BigQuery sink not working:**
- Check sink service account has `roles/bigquery.dataEditor`
- Verify log filter is correct
- Check for errors in sink: `gcloud logging sinks describe llm-logs-to-bq`
