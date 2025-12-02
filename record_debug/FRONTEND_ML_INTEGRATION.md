# Frontend Integration Guide: ML Flashcard Scheduler

## Overview
We have added a new endpoint `/api/flashcards/recommend-next` that provides ML-based scheduling recommendations alongside the traditional SM-2 algorithm.

## API Endpoint

**POST** `/api/flashcards/recommend-next`

### Request Body
```json
{
  "flashcard_id": "string",
  "rating": 1, // 1: Again, 2: Hard, 3: Good, 4: Easy
  "current_interval": 0, // Current interval in days
  "category": "vocabulary", // "vocabulary", "concept", etc.
  "word_count": 10, // Word count of the source note
  "review_sequence_number": 1, // How many times reviewed (optional, default 1)
  "user_review_count_7d": 5 // Number of reviews by user in last 7 days (optional, default 0)
}
```

### Response
```json
{
  "ml_interval": 5, // Recommended days by ML
  "sm2_interval": 3, // Calculated days by SM-2
  "difference": 2 // ml_interval - sm2_interval
}
```

## Integration Steps

1.  **Flashcard Review Component**:
    - When the user selects a rating (1-4), *before* submitting the review:
    - Call `/api/flashcards/recommend-next` with the rating and card details.
    - Display the result to the user (optional, or just log it).
    
2.  **UI Suggestion**:
    - Show a "Scheduler Comparison" debug panel (visible in Lab mode).
    - "SM-2 says: 3 days"
    - "ML says: 5 days"
    - If the user is in "Auto-ML" mode (future feature), use the ML interval. For now, just display it.

3.  **Data Collection**:
    - To improve the model, we need `user_review_count_7d`.
    - The frontend can track this locally or fetch it from a user stats endpoint.
    - For now, sending `0` is acceptable, but providing real data improves accuracy.
