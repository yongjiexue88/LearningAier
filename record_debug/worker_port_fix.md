# Worker Port Configuration Fix

**Date**: 2025-11-30  
**Issue**: Document worker not being called after PDF upload  
**Root Cause**: Port mismatch between backend configuration and worker service

---

## Problem Identified

### Worker Service Configuration:
```yaml
# k8s/worker-deployment.yaml (Service spec)
spec:
  ports:
    - port: 80           # ← Service exposes port 80
      targetPort: 8000   # ← Pod listens on 8000
```

### Backend Configuration (WRONG):
```yaml
# k8s/backend-deployment.yaml
env:
  - name: WORKER_SERVICE_URL
    value: "http://document-worker:8000"  # ← Trying to call port 8000
```

**Problem**: Backend was calling `document-worker:8000`, but the service only exposes port 80!

---

## Solution

### Changed Backend Configuration:
```yaml
# k8s/backend-deployment.yaml
env:
  - name: WORKER_SERVICE_URL
    value: "http://document-worker:80"  # ← Now correctly calling port 80
```

### How It Works Now:
```
Backend Pod → http://document-worker:80 → Worker Service (port 80) → Worker Pod (port 8000)
```

The Kubernetes Service handles the port mapping:
- External callers use port **80**
- Service forwards to container port **8000**

---

## Commands Executed

```bash
# 1. Update backend deployment
kubectl apply -f k8s/backend-deployment.yaml

# 2. Wait for rollout
kubectl rollout status deployment/learningaier-backend
```

---

## Verification

### Test worker connectivity:
```bash
# From backend pod
kubectl exec -it <backend-pod> -- wget -O- http://document-worker:80/health
```

### Upload a PDF and check logs:
```bash
# Backend logs (should show worker call)
kubectl logs -l app=learningaier-backend --tail=50 | grep worker

# Worker logs (should show processing request)
kubectl logs -l app=document-worker --tail=50
```

---

## Why This Happened

When I set up the backend, I assumed the worker service would expose port 8000 (matching the container port), but the existing worker service was configured to expose port 80.

**Standard Kubernetes Pattern**:
- Services typically expose port **80** (HTTP) or **443** (HTTPS)
- Even if the pod listens on a different port (like 8000)
- The service handles the port mapping internally

---

## Updated Environment Variables

**Local (.env.local)**:
```bash
WORKER_SERVICE_URL=http://localhost:8000  # Direct to worker (no service)
```

**GKE (.env.lab)** - Should also be updated to:
```bash
WORKER_SERVICE_URL=http://document-worker:80  # Via Kubernetes service
```

---

## Summary

✅ **Fixed**: Backend now calls worker on correct port (80)  
✅ **Deployed**: New backend pods with updated configuration  
🧪 **Next**: Upload a PDF to test end-to-end flow  

The worker should now receive PDF processing requests!
