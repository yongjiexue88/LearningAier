"""Analytics API endpoints"""
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user_id
from app.services.analytics_service import AnalyticsService
from app.models.analytics import AnalyticsOverviewResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get analytics overview for the current user.
    
    Returns study statistics from BigQuery including:
    - Total notes, flashcards, and reviews
    - Average interval and mastery rate
    - Daily review activity for the last 30 days
    """
    print("\n" + "🔵" * 40)
    print("📊 API REQUEST: /api/analytics/overview")
    print(f"  Requesting analytics for user: {user_id}")
    print("🔵" * 40 + "\n")
    
    service = AnalyticsService()
    data = await service.get_user_overview(user_id)
    
    print("🟢" * 40)
    print("✅ API RESPONSE: Analytics data ready")
    print("🟢" * 40 + "\n")
    
    return data


@router.get("/flashcard-difficulty")
async def get_flashcard_difficulty(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get flashcard difficulty statistics.
    
    Returns the most difficult flashcards based on review patterns.
    """
    service = AnalyticsService()
    stats = await service.get_flashcard_difficulty_stats(user_id, limit)
    return {"flashcards": stats}
