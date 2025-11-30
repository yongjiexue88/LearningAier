# Backend Single Pod Configuration - COMPLETED ✅

**Date**: 2025-11-30  
**Issue**: GCE CPU quota limits preventing pod updates  
**Solution**: Reduced to 1 replica to stay within quota limits

---

## Changes Made

### 1. Updated Deployment Replicas
**File**: `k8s/backend-deployment.yaml`

**Changed**:
```yaml
spec:
  replicas: 1  # ← Reduced from 2
```

### 2. Updated HPA Configuration
**File**: `k8s/backend-deployment.yaml`

**Changed**:
```yaml
spec:
  minReplicas: 1  # ← Reduced from 2
  maxReplicas: 3  # ← Reduced from 5
```

---

## Current Status

**Deployment**:
```bash
$ kubectl get deployment learningaier-backend
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
learningaier-backend   1/1     1            1           110m
```

**Pods**:
```bash
$ kubectl get pods -l app=learningaier-backend
NAME                                    READY   STATUS    RESTARTS
learningaier-backend-9d7c8b74b-bkhhk    1/1     Running   1 (104m ago)
```

**HPA**:
```bash
$ kubectl get hpa learningaier-backend-hpa
NAME                       MINPODS   MAXPODS   REPLICAS
learningaier-backend-hpa   1         3         1
```

**Service**:
- External IP: `34.123.200.75`
- Health: ✅ `{"status":"healthy"}`

---

## Why This Works

**CPU Allocation** (with 1 pod):
- Worker: 1 pod × 100m = 0.1 CPU
- Redis: 1 pod × 100m = 0.1 CPU
- Backend: 1 pod × 500m = 0.5 CPU
- **Total pods**: 0.7 CPUs
- **Node overhead**: ~2-3 CPUs
- **Total**: ~3.5 CPUs (well within 12 CPU quota)

**Trade-offs**:
- ⚠️ **No redundancy**: If the pod fails, brief downtime until restart
- ⚠️ **Rolling updates**: Temporary downtime during deployment
- ✅ **Works within quota**: No more pending pods
- ✅ **Can still scale**: HPA can scale to 3 pods if CPU/memory high

---

## Recommendations

### For Lab Environment (Current)
Keep 1 replica - sufficient for testing and development.

### For Production
**Option 1 - Increase Quota** (recommended):
- Request 24-48 CPU quota increase
- Then restore `minReplicas: 2` for redundancy
- Allows zero-downtime rolling updates

**Option 2 - Keep 1 Replica**:
- Use separate production project with higher quotas
- Or implement blue/green deployment strategy
- Accept brief downtime during updates

---

## How to Restore 2 Replicas (After Quota Increase)

**Update the YAML**:
```yaml
# k8s/backend-deployment.yaml
spec:
  replicas: 2  # ← Change back from 1
  
# And HPA:
spec:
  minReplicas: 2  # ← Change back from 1
  maxReplicas: 5  # ← Change back from 3
```

**Apply**:
```bash
kubectl apply -f k8s/backend-deployment.yaml
```

---

## Monitoring

**Check pod health**:
```bash
kubectl get pods -l app=learningaier-backend --watch
```

**Check HPA scaling**:
```bash
kubectl get hpa learningaier-backend-hpa --watch
```

**Check service availability**:
```bash
curl http://34.123.200.75/health
```

---

## Summary

✅ **Fixed**: Reduced to 1 replica to work within CPU quota  
✅ **Working**: 1 pod running, service accessible  
✅ **HPA Active**: Can scale up to 3 pods if needed  
⚠️ **Trade-off**: No redundancy (single pod)  
💡 **Next Step**: Request CPU quota increase for production-ready setup
