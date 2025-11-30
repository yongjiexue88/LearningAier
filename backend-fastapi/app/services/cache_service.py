"""Redis cache service for caching LLM responses, analytics, and rate limiting."""
import json
import hashlib
import logging
from typing import Optional, Any, Dict
from datetime import timedelta
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from app.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Centralized Redis cache service.
    
    Features:
    - Connection pool management
    - Generic get/set/delete with TTL
    - JSON serialization
    - Hash generation for cache keys
    """
    
    _pool: Optional[ConnectionPool] = None
    _client: Optional[redis.Redis] = None
    
    def __init__(self):
        self.settings = get_settings()
        self.enabled = self.settings.enable_redis_cache
        
        if not self.enabled:
            logger.warning("Redis cache is disabled")
            return
        
        # Initialize connection pool (singleton pattern)
        if CacheService._pool is None:
            try:
                CacheService._pool = ConnectionPool.from_url(
                    self.settings.redis_url,
                    decode_responses=True,
                    max_connections=20,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                logger.info(f"✅ Redis connection pool created: {self.settings.redis_url}")
            except Exception as e:
                logger.error(f"❌ Failed to create Redis connection pool: {e}")
                self.enabled = False
                return
        
        # Create client from pool
        if CacheService._client is None:
            CacheService._client = redis.Redis(connection_pool=CacheService._pool)
    
    @property
    def client(self) -> Optional[redis.Redis]:
        """Get Redis client instance."""
        return CacheService._client if self.enabled else None
    
    async def ping(self) -> bool:
        """Check if Redis is responsive."""
        if not self.enabled or not self.client:
            return False
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False
    
    @staticmethod
    def generate_hash(text: str) -> str:
        """Generate MD5 hash for cache key."""
        return hashlib.md5(text.encode()).hexdigest()[:16]
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Deserialized value or None if not found
        """
        if not self.enabled or not self.client:
            logger.debug(f"Cache disabled, skipping get for key: {key}")
            return None
        
        try:
            value = await self.client.get(key)
            if value is None:
                logger.debug(f"❌ Cache miss: {key}")
                return None
            
            logger.info(f"✅ Cache hit: {key} (size: {len(value)} bytes)")
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to deserialize cached value for {key}: {e}")
            await self.delete(key)  # Remove corrupted data
            return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl_seconds: Time to live in seconds (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            logger.debug(f"Cache disabled, skipping set for key: {key}")
            return False
        
        try:
            serialized = json.dumps(value)
            if ttl_seconds:
                await self.client.setex(key, ttl_seconds, serialized)
                logger.info(f"💾 Cached: {key} (TTL: {ttl_seconds}s, size: {len(serialized)} bytes)")
            else:
                await self.client.set(key, serialized)
                logger.info(f"💾 Cached: {key} (no TTL, size: {len(serialized)} bytes)")
            
            return True
        except (TypeError, ValueError) as e:
            logger.error(f"Failed to serialize value for {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if key was deleted, False otherwise
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            result = await self.client.delete(key)
            if result > 0:
                logger.info(f"🗑️  Deleted cache key: {key}")
            else:
                logger.debug(f"Delete attempted for non-existent key: {key}")
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Key pattern (e.g., "analytics:user123:*")
            
        Returns:
            Number of keys deleted
        """
        if not self.enabled or not self.client:
            return 0
        
        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.client.delete(*keys)
                logger.info(f"🗑️  Deleted {deleted} keys matching pattern: {pattern}")
                return deleted
            else:
                logger.debug(f"No keys found matching pattern: {pattern}")
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    async def increment(self, key: str, amount: int = 1, ttl_seconds: Optional[int] = None) -> int:
        """
        Increment counter (for rate limiting).
        
        Args:
            key: Cache key
            amount: Amount to increment by
            ttl_seconds: TTL to set if key doesn't exist
            
        Returns:
            New counter value
        """
        if not self.enabled or not self.client:
            return 0
        
        try:
            # Increment counter
            new_value = await self.client.incrby(key, amount)
            
            # Set TTL if this is the first increment
            if new_value == amount and ttl_seconds:
                await self.client.expire(key, ttl_seconds)
                logger.debug(f"Counter initialized: {key} = {new_value} (TTL: {ttl_seconds}s)")
            else:
                logger.debug(f"Counter incremented: {key} = {new_value}")
            
            return new_value
        except Exception as e:
            logger.error(f"Cache increment error for {key}: {e}")
            return 0
    
    async def get_ttl(self, key: str) -> int:
        """
        Get remaining TTL for key.
        
        Args:
            key: Cache key
            
        Returns:
            TTL in seconds, -1 if no TTL, -2 if key doesn't exist
        """
        if not self.enabled or not self.client:
            return -2
        
        try:
            return await self.client.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL error for {key}: {e}")
            return -2
    
    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.close()
            logger.info("Redis connection closed")


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get or create CacheService singleton instance."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
