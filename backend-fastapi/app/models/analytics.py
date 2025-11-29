"""Pydantic models for analytics-related requests and responses"""
from pydantic import BaseModel
from typing import List


class UserOverviewStats(BaseModel):
    """User study overview statistics"""
    total_notes: int
    total_flashcards: int
    total_reviews: int
    avg_interval: float
    mastery_rate_percent: float


class DailyReviewActivity(BaseModel):
    """Daily review activity item"""
    review_date: str  # YYYY-MM-DD format
    review_count: int
    avg_rating: float


class AnalyticsOverviewResponse(BaseModel):
    """Response model for analytics overview endpoint"""
    overview: UserOverviewStats
    activity: List[DailyReviewActivity]
