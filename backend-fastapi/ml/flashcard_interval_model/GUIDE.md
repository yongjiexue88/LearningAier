# Flashcard Model MLOps Guide

This guide explains the end-to-end ML pipeline for the Flashcard Interval Prediction model.

## 1. Training Process 🧠

The model is trained on **Vertex AI** using a custom Docker container.

*   **Script**: `ml/flashcard_interval_model/train_cloud.py`
*   **Container**: `gcr.io/learningaier-lab/flashcard-trainer:latest`
*   **Trigger**: The pipeline is submitted via `ml/pipelines/submit_pipeline.py`.

### How it works:
1.  **Load Data**: The script queries BigQuery to get the training dataset.
2.  **Preprocess**:
    *   Encodes `category` using `LabelEncoder`.
    *   Encodes target `label_next_interval_bucket` using `LabelEncoder`.
3.  **Train**: Uses **RandomForestClassifier** (sklearn) to predict the best interval bucket.
4.  **Save**: Saves `model.joblib`, `le_category.joblib`, and `le_target.joblib` to GCS.

## 2. Data Source 📊

Data flows from the app to the model:

1.  **Firestore**: Raw reviews are stored in `flashcard_reviews`.
2.  **BigQuery**: Synced nightly via `firestore-bq-sync` job.
3.  **Training View**: `learningaier_analytics.flashcard_training_view` joins reviews with note metadata.

**Input Features (from BigQuery):**
| Feature | Type | Description |
| :--- | :--- | :--- |
| `category` | String | Flashcard category (e.g., "vocabulary", "concept") |
| `word_count` | Integer | Total words in term + definition |
| `rating` | Integer | User rating (1=Again, 2=Hard, 3=Good, 4=Easy) |
| `review_sequence_number` | Integer | How many times this card has been reviewed |
| `days_since_last_review` | Integer | Actual days since the previous review |
| `user_avg_rating` | Float | User's average rating across all cards |

## 3. Model Structure & Algorithm ⚙️

**Current Algorithm**: `RandomForestClassifier` (Scikit-Learn)

**Where to change it**:
*   Edit `ml/flashcard_interval_model/train_cloud.py`.
*   Look for the `train_model` function:
    ```python
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        ...
    )
    ```
*   **To update**: Change the classifier here (e.g., to `GradientBoostingClassifier`), rebuild the Docker container, and resubmit the pipeline.

## 4. Input & Output 🔄

### Model Input (Features)
The model expects a dictionary of features matching the training data:
```python
{
    "category": "vocabulary",
    "word_count": 15,
    "rating": 3,
    "review_sequence_number": 2,
    "current_interval": 1,      # Mapped to 'days_since_last_review'
    "user_avg_rating": 3.5
}
```

### Model Output (Prediction)
The model predicts a **Bucket ID** (0, 1, 2, 3) which maps to a specific number of days.

| Bucket ID | Label | Days |
| :--- | :--- | :--- |
| 0 | `1_day` | **1** |
| 1 | `2_3_days` | **2** |
| 2 | `4_7_days` | **5** |
| 3 | `8_14_days` | **14** |

## 5. API Mapping (Backend) 🔗

The `MLPredictionService` (`app/services/ml_prediction_service.py`) handles the integration:

1.  **Feature Extraction**:
    *   Extracts `word_count` from the flashcard note.
    *   Gets `user_avg_rating` from user stats.
    *   Calculates `days_since_last_review`.
2.  **Prediction**: Calls the Vertex AI Endpoint.
3.  **Mapping**: Converts the predicted bucket ID back to days using the mapping table above.
4.  **Fallback**: If ML fails or returns `None`, the system falls back to the standard **SM-2 algorithm**.

### Flashcard API Structure
When you call `POST /api/flashcards/{id}/review`:
1.  The backend calculates the **SM-2 interval** (classic algorithm).
2.  It asynchronously calls the **ML Model**.
3.  If ML succeeds, it uses the **ML-predicted interval**.
4.  The response includes the scheduled date based on this interval.
