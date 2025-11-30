# Local Testing Guide for Redis Caching

This guide explains how to test the Redis caching infrastructure locally before deploying to GKE.

---

## Prerequisites

1. **Install Redis locally**:
   ```bash
   # macOS
   brew install redis
   
   # Start Redis server
   brew services start redis
   
   # Or run in foreground
   redis-server
   ```

2. **Install Python dependencies**:
   ```bash
   cd backend-fastapi
   pip install -r requirements.txt
   ```

---

## Local Configuration

### 1. Ensure `.env.local` has Redis URL

File: `backend-fastapi/.env.local`
```bash
# Redis Cache
REDIS_URL=redis://localhost:6379
ENABLE_REDIS_CACHE=true
```

**Why `localhost:6379`?**
- Redis server runs on your local machine
- Port 6379 is the default Redis port
- No authentication needed for local development

### 2. Verify Redis is Running

```bash
# Test connection
redis-cli ping
# Expected: PONG

# Check if Redis is listening
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

---

## Testing the Cache Service

### 1. Create a Test Script

Create `backend-fastapi/test_redis_local.py`:

```python
import asyncio
from app.services.cache_service import get_cache_service

async def test_cache():
    cache = get_cache_service()
    
    # Test 1: Ping Redis
    print("Testing Redis connection...")
    is_connected = await cache.ping()
    print(f"✅ Connected: {is_connected}")
    
    # Test 2: Set and Get
    print("\nTesting set/get...")
    test_key = "test:hello"
    test_value = {"message": "Hello Redis!", "count": 42}
    
    await cache.set(test_key, test_value, ttl_seconds=60)
    print(f"✅ Set: {test_key} = {test_value}")
    
    retrieved = await cache.get(test_key)
    print(f"✅ Get: {test_key} = {retrieved}")
    
    # Test 3: Cache Miss
    print("\nTesting cache miss...")
    missing = await cache.get("nonexistent:key")
    print(f"✅ Cache miss returns: {missing}")
    
    # Test 4: TTL
    print("\nTesting TTL...")
    ttl = await cache.get_ttl(test_key)
    print(f"✅ TTL remaining: {ttl} seconds")
    
    # Test 5: Delete
    print("\nTesting delete...")
    deleted = await cache.delete(test_key)
    print(f"✅ Deleted: {deleted}")
    
    # Test 6: Pattern Delete
    print("\nTesting pattern delete...")
    await cache.set("user:123:profile", {"name": "Alice"})
    await cache.set("user:123:settings", {"theme": "dark"})
    await cache.set("user:456:profile", {"name": "Bob"})
    
    count = await cache.delete_pattern("user:123:*")
    print(f"✅ Deleted {count} keys matching 'user:123:*'")
    
    # Test 7: Increment (Rate Limiting)
    print("\nTesting increment...")
    counter_key = "rate:test:endpoint"
    for i in range(5):
        count = await cache.increment(counter_key, amount=1, ttl_seconds=60)
        print(f"   Request {i+1}: counter = {count}")
    
    print("\n✅ All tests passed!")

if __name__ == "__main__":
    asyncio.run(test_cache())
```

### 2. Run the Test

```bash
cd backend-fastapi
python test_redis_local.py
```

**Expected Output**:
```
Testing Redis connection...
✅ Connected: True

Testing set/get...
💾 Cached: test:hello (TTL: 60s, size: 46 bytes)
✅ Set: test:hello = {'message': 'Hello Redis!', 'count': 42}
✅ Cache hit: test:hello (size: 46 bytes)
✅ Get: test:hello = {'message': 'Hello Redis!', 'count': 42}

Testing cache miss...
❌ Cache miss: nonexistent:key
✅ Cache miss returns: None

Testing TTL...
✅ TTL remaining: 58 seconds

Testing delete...
🗑️  Deleted cache key: test:hello
✅ Deleted: True

Testing pattern delete...
💾 Cached: user:123:profile (TTL: Nones, size: 17 bytes)
💾 Cached: user:123:settings (TTL: Nones, size: 17 bytes)
💾 Cached: user:456:profile (TTL: Nones, size: 15 bytes)
🗑️  Deleted 2 keys matching pattern: user:123:*
✅ Deleted 2 keys matching 'user:123:*'

Testing increment...
   Request 1: counter = 1
   Request 2: counter = 2
   Request 3: counter = 3
   Request 4: counter = 4
   Request 5: counter = 5

✅ All tests passed!
```

---

## Testing RAG Caching Locally

### 1. Start the Backend Server

```bash
cd backend-fastapi
ENV=local python -m uvicorn app.main:app --reload --port 8080
```

**Watch the logs** - you should see:
```
✅ Redis connection pool created: redis://localhost:6379
✅ Rate limiter initialized with limits: {...}
```

### 2. Test RAG Cache with curl

**First Request (Cache Miss)**:
```bash
# Replace with your Firebase auth token
TOKEN="your-firebase-token"

time curl -X POST http://localhost:8080/api/notes/ai-qa \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is machine learning?",
    "note_id": "test123",
    "top_k": 5
  }'
```

**Backend logs should show**:
```
❌ RAG cache miss for key: rag:user123:test123:abc...
... (LLM processing) ...
💾 Cached RAG result for key: rag:user123:test123:abc...
```

**Second Identical Request (Cache Hit)**:
```bash
time curl -X POST http://localhost:8080/api/notes/ai-qa \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is machine learning?",
    "note_id": "test123",
    "top_k": 5
  }'
```

**Backend logs should show**:
```
✅ RAG cache hit for key: rag:user123:test123:abc...
```

**Performance Difference**:
- First request: ~2-5 seconds (LLM call)
- Second request: ~50-100ms (cache hit)

### 3. Inspect Redis Keys

```bash
# List all cache keys
redis-cli KEYS "*"

# Example output:
# 1) "rag:user123:test123:abc123def456"
# 2) "analytics:user456:overview"

# Get a specific key
redis-cli GET "rag:user123:test123:abc123def456"

# Check TTL
redis-cli TTL "rag:user123:test123:abc123def456"
# Example output: 1756 (seconds remaining)

# Delete a key
redis-cli DEL "rag:user123:test123:abc123def456"
```

---

## Testing Rate Limiting Locally

### 1. Test Script for Rate Limiting

Create `test_rate_limit.sh`:

```bash
#!/bin/bash
TOKEN="your-firebase-token"

echo "Sending 25 requests to test rate limiting (limit: 20/min)..."

for i in {1..25}; do
  response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/notes/ai-qa \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"Test request $i\", \"note_id\": \"test\"}")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" == "429" ]; then
    echo "Request $i: ⚠️  RATE LIMITED (429)"
  else
    echo "Request $i: ✅ OK ($status_code)"
  fi
done
```

Run it:
```bash
chmod +x test_rate_limit.sh
./test_rate_limit.sh
```

**Expected Output**:
```
Request 1: ✅ OK (200)
Request 2: ✅ OK (200)
...
Request 20: ✅ OK (200)
Request 21: ⚠️  RATE LIMITED (429)
Request 22: ⚠️  RATE LIMITED (429)
...
```

### 2. Check Rate Limit Keys in Redis

```bash
redis-cli KEYS "rate:*"
# Example: rate:user123:/api/notes/ai-qa:28234567

redis-cli GET "rate:user123:/api/notes/ai-qa:28234567"
# Shows current counter value
```

---

## Testing Analytics Caching Locally

### 1. First Request (Cache Miss)

```bash
time curl http://localhost:8080/api/analytics/overview \
  -H "Authorization: Bearer $TOKEN"
```

**Logs**:
```
❌ Analytics cache miss for key: analytics:user123:overview
... (BigQuery query) ...
💾 Cached analytics overview for key: analytics:user123:overview
```

### 2. Second Request (Cache Hit)

```bash
time curl http://localhost:8080/api/analytics/overview \
  -H "Authorization: Bearer $TOKEN"
```

**Logs**:
```
✅ Analytics cache hit for key: analytics:user123:overview
```

**Performance**:
- First request: ~1-3 seconds (BigQuery)
- Second request: ~30-50ms (cache)

### 3. Test Cache Invalidation

```bash
# Review a flashcard (triggers cache invalidation)
curl -X POST http://localhost:8080/api/flashcards/{flashcard_id}/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 3}'
```

**Logs**:
```
🗑️  Invalidated 2 analytics cache keys for user: user123
```

---

## Monitoring Redis Locally

### 1. Watch Redis Commands in Real-Time

```bash
redis-cli MONITOR
```

This shows all commands executed against Redis in real-time.

### 2. Check Redis Stats

```bash
redis-cli INFO stats
```

Shows:
- Total connections
- Total commands processed
- Keyspace hits/misses
- Memory usage

### 3. Check Memory Usage

```bash
redis-cli INFO memory
```

---

## Common Issues & Solutions

### Issue: "Connection refused to localhost:6379"

**Solution**:
```bash
# Check if Redis is running
ps aux | grep redis

# Start Redis
brew services start redis

# Or manually
redis-server
```

### Issue: "ENABLE_REDIS_CACHE=false in logs"

**Solution**: Check `.env.local`:
```bash
ENABLE_REDIS_CACHE=true  # Make sure it's true, not false
```

### Issue: Cache always showing misses

**Solution**: Check cache key consistency. Add logging to see exact keys:
```python
logger.info(f"Cache key: {cache_key}")
```

---

## Cleanup

### Clear All Redis Data

```bash
# Flush all databases (WARNING: deletes everything)
redis-cli FLUSHALL

# Flush current database only
redis-cli FLUSHDB

# Delete specific pattern
redis-cli --scan --pattern "test:*" | xargs redis-cli DEL
```

### Stop Redis

```bash
# If using brew services
brew services stop redis

# If running manually (Ctrl+C in terminal)
```

---

## Summary

✅ **Local Redis**: `redis://localhost:6379`  
✅ **GKE Redis**: `redis://redis:6379` (Kubernetes DNS)

**Key Differences**:
- **Local**: Direct connection to `localhost`
- **GKE**: Kubernetes internal DNS resolves `redis` to ClusterIP service

**Testing Flow**:
1. Test cache service directly (test script)
2. Test RAG caching (compare response times)
3. Test rate limiting (send 25+ requests)
4. Test analytics caching (compare BigQuery vs cache)
5. Monitor with `redis-cli MONITOR`

The local testing should match GKE behavior exactly, just with different connection URLs.
