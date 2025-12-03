# Port Configuration & Standardization

**Date**: 2025-11-30  
**Purpose**: Verify all ports across Docker/Kubernetes/env vars and standardize local defaults

---

## 1. Backend Service

### Dockerfile
**File**: `backend-fastapi/Dockerfile`
```dockerfile
ENV PORT=8080
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"
```
- **Default Port**: 8080

### Kubernetes Deployment
**File**: `k8s/backend-deployment.yaml`
```yaml
ports:
  - name: http
    containerPort: 8080  # Matches Dockerfile
    protocol: TCP

env:
  - name: PORT
    value: "8080"
```
- **Container Port**: 8080 ✅

### Kubernetes Service
**File**: `k8s/backend-service.yaml`
```yaml
spec:
  type: LoadBalancer
  ports:
    - port: 80           # External port
      targetPort: 8080   # Maps to container port ✅
```
- **External**: 80
- **Internal**: 8080 ✅

### Summary
```
External (LoadBalancer) → Port 80
    ↓
Service → targetPort 8080
    ↓
Pod → containerPort 8080
    ↓
Docker → PORT env 8080
    ↓
Uvicorn listens on 8080 ✅
```

**Status**: ✅ **ALIGNED**

---

## 2. Document Worker Service

### Dockerfile
**File**: `backend-fastapi/worker/Dockerfile`
```dockerfile
ENV PORT=8000
CMD ["python", "-m", "uvicorn", "worker.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
- **Default Port**: 8000

### Application Code
**File**: `backend-fastapi/worker/main.py`
```python
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
```
- **Port**: 8000 (from ENV or default)

### Kubernetes Deployment
**File**: `k8s/worker-deployment.yaml`
```yaml
ports:
  - name: http
    containerPort: 8000  # Matches Dockerfile
    protocol: TCP

env:
  - name: PORT
    value: "8000"
```
- **Container Port**: 8000 ✅

### Kubernetes Service
**File**: `k8s/worker-service.yaml`
```yaml
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8000         # Service port (RECENTLY CHANGED from 80)
      targetPort: 8000   # Maps to container port ✅
```
- **Service Port**: 8000 ✅
- **Target Port**: 8000 ✅

### Backend Connection
**Environment Variable** (in backend deployment):
```yaml
env:
  - name: WORKER_SERVICE_URL
    value: "http://document-worker:8000"  # Matches service port ✅
```

### Summary
```
Backend calls → http://document-worker:8000
    ↓
Service → port 8000
    ↓
Pod → containerPort 8000
    ↓
Docker → PORT env 8000
    ↓
Uvicorn listens on 8000 ✅
```

**Status**: ✅ **ALIGNED**

**Note**: We changed the service port from 80 → 8000 to match backend configuration and avoid quota-limited pod updates.

---

## 3. Redis Service

### Docker Image
**Image**: `redis:7.0-alpine` (official Redis image)
- **Default Port**: 6379 (Redis standard port)

### Kubernetes Deployment
**File**: `k8s/redis-deployment.yaml`
```yaml
containers:
  - name: redis
    image: redis:7.0-alpine
    ports:
      - containerPort: 6379  # Redis default port ✅
```
- **Container Port**: 6379 ✅

### Kubernetes Service
**File**: `k8s/redis-deployment.yaml`
```yaml
spec:
  type: ClusterIP
  ports:
    - port: 6379         # Service port
      targetPort: 6379   # Maps to container port ✅
```
- **Service Port**: 6379 ✅
- **Target Port**: 6379 ✅

### Backend Connection
**Environment Variable** (in backend deployment):
```yaml
env:
  - name: REDIS_URL
    value: "redis://redis:6379"  # Matches service port ✅
```

### Summary
```
Backend calls → redis://redis:6379
    ↓
Service → port 6379
    ↓
Pod → containerPort 6379
    ↓
Redis server listens on 6379 ✅
```

**Status**: ✅ **ALIGNED**

---

## 4. Local Standard Ports

| Service          | Port | Notes/Config                                                      |
|------------------|------|-------------------------------------------------------------------|
| Backend (FastAPI)| 8080 | `backend-fastapi/.env.local` → `PORT=8080`; Cloud Run defaults 8080 |
| Frontend (Vite)  | 5173 | Vite default                                                      |
| Frontend API     | 8080 | `frontend/.env.local` → `VITE_API_BASE_URL=http://localhost:8080` |

### Key standardization actions
- Updated docs/env to prefer backend `PORT=8080` for local runs (previously 8787 in some notes).
- Ensure `VITE_API_BASE_URL` matches backend port when overriding.
- If you change ports, update both backend `PORT` and frontend `VITE_API_BASE_URL` together.

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL ACCESS                                             │
│                                                              │
│  Users/Frontend → LoadBalancer (34.123.200.75:80)           │
│                           ↓                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│  GKE CLUSTER              ↓                                  │
│                                                              │
│  ┌─────────────────────────────────┐                        │
│  │  Backend Service                │                        │
│  │  Port: 80 → targetPort: 8080    │                        │
│  └────────────┬────────────────────┘                        │
│               │                                              │
│               ↓                                              │
│  ┌─────────────────────────────────┐                        │
│  │  Backend Pod                    │                        │
│  │  containerPort: 8080            │                        │
│  │  ENV PORT=8080                  │                        │
│  │  Uvicorn on 8080 ✅             │                        │
│  └────┬────────────────────────┬───┘                        │
│       │                        │                            │
│       │ WORKER_SERVICE_URL     │ REDIS_URL                  │
│       │ :8000                  │ :6379                      │
│       ↓                        ↓                            │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Worker Svc   │      │ Redis Svc    │                    │
│  │ Port: 8000   │      │ Port: 6379   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                            │
│         ↓                     ↓                            │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Worker Pod   │      │ Redis Pod    │                    │
│  │ Port: 8000   │      │ Port: 6379   │                    │
│  │ ENV PORT=8000│      │ Default 6379 │                    │
│  │ ✅           │      │ ✅           │                    │
│  └──────────────┘      └──────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

All ports aligned! ✅
```

---

## Verification Commands

### Test Backend
```bash
# External
curl http://34.123.200.75/health

# Internal (from another pod)
kubectl exec <pod> -- wget -qO- http://learningaier-backend:80/health
```

### Test Worker
```bash
# From backend pod
kubectl exec <backend-pod> -- python3 -c \
  "import urllib.request; print(urllib.request.urlopen('http://document-worker:8000/health').read().decode())"

# Expected: {"status":"healthy","service":"document-worker","version":"1.0.0"}
```

### Test Redis
```bash
# From backend pod
kubectl exec <backend-pod> -- python3 -c \
  "import redis; r = redis.Redis(host='redis', port=6379); print(r.ping())"

# Expected: True
```

---

## Summary

| Service | Docker Port | Container Port | Service Port | Target Port | Connection String | Status |
|---------|-------------|----------------|--------------|-------------|-------------------|--------|
| **Backend** | 8080 | 8080 | 80 (external) | 8080 | `http://34.123.200.75:80` | ✅ |
| **Worker** | 8000 | 8000 | 8000 | 8000 | `http://document-worker:8000` | ✅ |
| **Redis** | 6379 | 6379 | 6379 | 6379 | `redis://redis:6379` | ✅ |

**All ports are properly aligned! ✅**

---

## Key Changes Made

1. **Worker Service Port**: Changed from 80 → 8000 to match backend's `WORKER_SERVICE_URL` configuration
2. **Backend Replicas**: Reduced from 2 → 1 to work within CPU quota
3. **All internal communication**: Uses Kubernetes DNS with correct ports

Everything is configured correctly and ready for use!
