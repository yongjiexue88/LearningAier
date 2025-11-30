"""Analytics service for querying BigQuery data"""
from typing import Dict, List, Any
import logging
from google.cloud import bigquery
from google.api_core.exceptions import NotFound
from app.config import get_settings
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for BigQuery analytics queries"""
    
    def __init__(self):
        settings = get_settings()
        self.project_id = settings.bigquery_project_id or settings.firebase_project_id
        self.dataset_id = settings.bigquery_dataset_id
        self.cache_service = get_cache_service()
        
        logger.info("=" * 80)
        logger.info("📊 BIGQUERY ANALYTICS SERVICE INIT")
        logger.info("=" * 80)
        logger.info(f"  Project ID: {self.project_id}")
        logger.info(f"  Dataset ID: {self.dataset_id}")
        logger.info(f"  Full Dataset: {self.project_id}.{self.dataset_id}")

        
        try:
            self.client = bigquery.Client(project=self.project_id)
            print("  ✅ BigQuery client initialized successfully")
        except Exception as e:
            print(f"  ⚠️  BigQuery client initialization warning: {e}")
            print("  Note: This is normal if BigQuery API is not enabled or tables don't exist")
            self.client = None
        
        print("=" * 80)
        print()
    
    def _empty_overview(self) -> dict:
        """Return empty overview data when BigQuery is unavailable."""
        return {
            "overview": {
                "total_notes": 0,
                "total_flashcards": 0,
                "total_reviews": 0,
                "avg_interval": 0.0,
                "mastery_rate_percent": 0.0
            },
            "activity": []
        }
    
    async def get_user_overview(self, user_id: str) -> dict:
        """
        Get user analytics overview from BigQuery with Redis caching.
        Returns empty data if BigQuery is not configured or tables don't exist.
        """
        # Check cache first
        cache_key = f"analytics:{user_id}:overview"
        cached_data = await self.cache_service.get(cache_key)
        if cached_data:
            logger.info(f"✅ Analytics cache hit for key: {cache_key}")
            return cached_data
        
        logger.info(f"❌ Analytics cache miss for key: {cache_key}")
        
        if not self.client:
            return self._empty_overview()
        
        try:
            # Query for user stats
            stats_query = f"""
            SELECT 
                total_notes,
                total_flashcards,
                total_reviews,
                avg_interval,
                mastery_rate_percent
            FROM `{self.project_id}.{self.dataset_id}.user_study_stats`
            WHERE user_id = @user_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
                ]
            )
            
            stats_result = self.client.query(stats_query, job_config=job_config).result()
            
            overview = {
                "total_notes": 0,
                "total_flashcards": 0,
                "total_reviews": 0,
                "avg_interval": 0.0,
                "mastery_rate_percent": 0.0
            }
            
            for row in stats_result:
                overview = {
                    "total_notes": row.total_notes or 0,
                    "total_flashcards": row.total_flashcards or 0,
                    "total_reviews": row.total_reviews or 0,
                    "avg_interval": float(row.avg_interval or 0.0),
                    "mastery_rate_percent": float(row.mastery_rate_percent or 0.0)
                }
                break
            
            # Query daily activity
            activity_query = f"""
            SELECT
                review_date,
                review_count,
                avg_rating
            FROM `{self.project_id}.{self.dataset_id}.daily_review_activity`
            WHERE user_id = @user_id
            ORDER BY review_date DESC
            LIMIT 30
            """
            
            activity_result = self.client.query(activity_query, job_config=job_config).result()
            
            activity = []
            for row in activity_result:
                activity.append({
                    "review_date": str(row.review_date),
                    "review_count": row.review_count,
                    "avg_rating": float(row.avg_rating or 0.0)
                })
            
            result = {
                "overview": overview,
                "activity": activity
            }
            
            # Cache result (10 minutes TTL)
            await self.cache_service.set(cache_key, result, ttl_seconds=600)
            logger.info(f"💾 Cached analytics overview for key: {cache_key}")
            
            return result
            
        except NotFound as e:
            # Table doesn't exist (expected in lab environment)
            logger.warning(f"⚠️  BigQuery tables not found: {e}")
            logger.warning("   This is normal in the lab environment where BigQuery views haven't been created yet")
            return self._empty_overview()
        except Exception as e:
            # Other BigQuery errors
            logger.error(f"⚠️  BigQuery error: {e}")
            return self._empty_overview()
    
    async def get_flashcard_difficulty_stats(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get flashcard difficulty statistics with Redis caching.
        Returns empty list if BigQuery is not available.
        """
        # Check cache first
        cache_key = f"analytics:{user_id}:difficulty"
        cached_data = await self.cache_service.get(cache_key)
        if cached_data:
            logger.info(f"✅ Analytics difficulty cache hit for key: {cache_key}")
            return cached_data
        
        logger.info(f"❌ Analytics difficulty cache miss for key: {cache_key}")
        
        if not self.client:
            return []
        
        try:
            query = f"""
            SELECT
                flashcard_id,
                note_id,
                status,
                current_interval,
                current_ease_factor,
                total_reviews,
                again_count,
                hard_count,
                good_count,
                easy_count,
                difficulty_score
            FROM `{self.project_id}.{self.dataset_id}.flashcard_difficulty_stats`
            WHERE user_id = @user_id
            ORDER BY difficulty_score DESC
            LIMIT @limit
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("user_id", "STRING", user_id),
                    bigquery.ScalarQueryParameter("limit", "INT64", limit)
                ]
            )
            
            result = self.client.query(query, job_config=job_config).result()
            
            stats = []
            for row in result:
                stats.append({
                    "flashcard_id": row.flashcard_id,
                    "note_id": row.note_id,
                    "status": row.status,
                    "current_interval": row.current_interval,
                    "current_ease_factor": float(row.current_ease_factor or 0.0),
                    "total_reviews": row.total_reviews,
                    "again_count": row.again_count,
                    "hard_count": row.hard_count,
                    "good_count": row.good_count,
                    "easy_count": row.easy_count,
                    "difficulty_score": float(row.difficulty_score or 0.0)
                })
            
            # Cache result (10 minutes TTL)
            await self.cache_service.set(cache_key, stats, ttl_seconds=600)
            logger.info(f"💾 Cached analytics difficulty stats for key: {cache_key}")
            
            return stats
            
        except NotFound:
            return []
        except Exception as e:
            logger.error(f"⚠️  BigQuery error in difficulty stats: {e}")
            return []


    async def invalidate_user_cache(self, user_id: str):
        """
        Invalidate all analytics cache for a user.
        Called when flashcards are reviewed/updated.
        """
        pattern = f"analytics:{user_id}:*"
        deleted = await self.cache_service.delete_pattern(pattern)
        if deleted > 0:
            logger.info(f"🗑️  Invalidated {deleted} analytics cache keys for user: {user_id}")
