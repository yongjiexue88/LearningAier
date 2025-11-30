"""Rate limiting middleware using Redis."""
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.cache_service import get_cache_service
from app.config import get_settings

logger = logging.getLogger(__name__)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Redis-based sliding window rate limiter.
    
    Rate limits are configurable per endpoint category:
    - RAG/Chat endpoints: 20 requests/minute (default)
    - Analytics endpoints: 30 requests/minute (default)
    - Document upload: 10 requests/minute (default)
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.cache_service = get_cache_service()
        self.settings = get_settings()
        
        # Define rate limits for endpoint categories (requests per minute)
        self.rate_limits = {
            # RAG and Chat endpoints
            "/api/notes/ai-qa": self.settings.rate_limit_rag_chat,
            "/api/chat": self.settings.rate_limit_rag_chat,
            
            # Analytics endpoints
            "/api/analytics": self.settings.rate_limit_analytics,
            
            # Document upload
            "/api/documents/upload": self.settings.rate_limit_document_upload,
        }
        
        logger.info(f"✅ Rate limiter initialized with limits: {self.rate_limits}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        
        # Skip rate limiting for health checks and non-API endpoints
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        if request.url.path in ["/api/health", "/health", "/"]:
            return await call_next(request)
        
        # Get user_id from request (assuming it's set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            # No user_id means authentication hasn't been performed yet
            # Let the request through, auth middleware will handle it
            return await call_next(request)
        
        # Determine rate limit for this endpoint
        limit = self._get_rate_limit(request.url.path)
        if limit is None:
            # No rate limit configured for this endpoint
            return await call_next(request)
        
        # Check rate limit
        is_allowed, retry_after = await self._check_rate_limit(user_id, request.url.path, limit)
        
        if not is_allowed:
            logger.warning(
                f"⚠️  Rate limit exceeded for user {user_id} on {request.url.path}. "
                f"Limit: {limit}/min, retry after: {retry_after}s"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please try again in {retry_after} seconds.",
                    "retry_after": retry_after,
                    "limit": limit,
                    "window": "60 seconds"
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-Rate-Limit"] = str(limit)
        response.headers["X-Rate-Limit-Window"] = "60"
        
        return response
    
    def _get_rate_limit(self, path: str) -> int | None:
        """Get rate limit for a given path."""
        # Check for exact match first
        if path in self.rate_limits:
            return self.rate_limits[path]
        
        # Check for prefix match (e.g., /api/chat/* matches /api/chat)
        for endpoint_prefix, limit in self.rate_limits.items():
            if path.startswith(endpoint_prefix):
                return limit
        
        return None
    
    async def _check_rate_limit(self, user_id: str, endpoint: str, limit: int) -> tuple[bool, int]:
        """
        Check if request is within rate limit using sliding window.
        
        Returns:
            (is_allowed, retry_after_seconds)
        """
        if not self.cache_service.enabled:
            # Redis not available, allow request
            return True, 0
        
        # Create rate limit key with current minute window
        # Use timestamp to create rolling window
        import time
        current_minute = int(time.time() / 60)
        cache_key = f"rate:{user_id}:{endpoint}:{current_minute}"
        
        # Increment counter
        count = await self.cache_service.increment(cache_key, amount=1, ttl_seconds=120)
        
        if count > limit:
            # Rate limit exceeded
            # Calculate retry_after (seconds until next window)
            current_time = time.time()
            next_window = (current_minute + 1) * 60
            retry_after = int(next_window - current_time)
            return False, max(1, retry_after)
        
        return True, 0


def add_rate_limiter(app):
    """Add rate limiter middleware to FastAPI app."""
    app.add_middleware(RateLimiterMiddleware)
    logger.info("✅ Rate limiter middleware added")
