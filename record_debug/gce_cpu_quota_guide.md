# GCE CPU Quota Guide

**Date**: 2025-11-30  
**Issue**: GKE Autopilot pods stuck in Pending state due to insufficient CPU quota  
**Project**: learningaier-lab

---

## Understanding the Issue

### Quota Overview

![GCE Quota Dashboard](file:///Users/yongjiexue/.gemini/antigravity/brain/1aef00e0-7669-49a3-9878-d619f3ee8eeb/uploaded_image_1764532831346.png)

**Current Quota Status** (learningaier-lab):
- **Quota Name**: Compute Engine API - CPUs (all regions)
- **Current Limit**: 12 CPUs
- **Current Usage**: 33.33% (~4 CPUs)
- **Available**: ~8 CPUs remaining

### Why Pods Can't Schedule

**GKE Autopilot Node Overhead**:
- Base node requires ~2-3 CPUs for system components
- Kubelet, kube-proxy, CNI, monitoring agents
- When trying to add a new node for pod replacement, exceeded quota

**Your Pod CPU Requests**:
```yaml
# backend-deployment.yaml
resources:
  requests:
    cpu: 500m      # 0.5 CPU per pod
    memory: 512Mi
  limits:
    cpu: 1000m     # 1.0 CPU max
    memory: 1Gi
```

**Current Allocation**:
- Worker: 1 pod × 100m = 0.1 CPU
- Redis: 1 pod × 100m = 0.1 CPU
- Backend: 2 pods × 500m = 1.0 CPU
- **Total pods**: ~1.2 CPUs
- **Node overhead**: ~2-3 CPUs
- **Total in use**: ~4 CPUs

**Failed Update Scenario**:
- Trying to create new backend pod (rolling update)
- GKE Autopilot tries to add new node
- New node would push total over 12 CPU quota
- Result: Pod stuck in Pending state

---

## Solution Options

### Option 1: Increase CPU Quota (Recommended)

**Steps**:
1. Go to [Google Cloud Console → IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. **Filter**: `Name: GCE VM to internet egress bandwidth Mbps` → Clear filter
3. **Search**: "CPUs" or filter by service "Compute Engine API"
4. **Select**: "CPUs (all regions)" quota
5. Click **"EDIT QUOTAS"** button (top right)
6. Fill out the request form:
   - **New limit**: 24 CPUs (recommended) or 20 minimum
   - **Request description**: 
     ```
     Need additional CPU capacity for GKE Autopilot cluster running production workload.
     Current: 12 CPUs
     Requested: 24 CPUs
     Workload: FastAPI backend (2-5 replicas) + worker services + Redis
     ```
7. Submit request

**Approval Time**:
- **Instant**: For moderate increases (12 → 24)
- **24-48 hours**: For large increases
- **Email notification**: When approved

**Benefits**:
- ✅ Allows normal rolling updates
- ✅ Room for HPA scaling (2-5 replicas)
- ✅ No code/config changes needed

---

### Option 2: Reduce CPU Requests (Immediate)

**Reduce backend CPU from 500m → 250m**:
```bash
kubectl set resources deployment learningaier-backend \
  -c=backend \
  --requests=cpu=250m,memory=512Mi \
  --limits=cpu=500m,memory=1Gi
```

**Or edit deployment YAML**:
```yaml
# k8s/backend-deployment.yaml
resources:
  requests:
    cpu: 250m      # ← Reduced from 500m
    memory: 512Mi
  limits:
    cpu: 500m      # ← Reduced from 1000m
    memory: 1Gi
```

**Benefits**:
- ✅ Immediate fix (no quota request needed)
- ✅ Allows pod updates to proceed
- ✅ Still enough CPU for current load

**Trade-offs**:
- ⚠️ Less guaranteed CPU per pod
- ⚠️ May see slower performance under heavy load
- ⚠️ Less headroom for traffic spikes

---

### Option 3: Reduce HPA Min Replicas

**Temporarily reduce minimum replicas from 2 → 1**:
```bash
kubectl patch hpa learningaier-backend-hpa \
  -p '{"spec":{"minReplicas":1}}'
```

**Benefits**:
- ✅ Frees up 0.5 CPU (500m)
- ✅ Allows updates to complete
- ✅ HPA can still scale up to 5 if needed

**Trade-offs**:
- ⚠️ Reduced redundancy (1 pod vs 2)
- ⚠️ Brief downtime if pod fails during update
- ⚠️ Should scale back to 2 after quota increase

---

### Option 4: Manual Pod Replacement (Workaround)

**Delete and recreate pods one at a time**:
```bash
# Delete first pod
kubectl delete pod learningaier-backend-9d7c8b74b-bkhhk

# Wait for new pod to be ready
kubectl wait --for=condition=ready pod -l app=learningaier-backend --timeout=180s

# Delete second pod
kubectl delete pod learningaier-backend-9d7c8b74b-hkk4f
```

**Benefits**:
- ✅ Works within quota limits
- ✅ Zero total downtime (one pod always running)

**Trade-offs**:
- ⚠️ Manual process
- ⚠️ Requires monitoring each step
- ⚠️ Not suitable for CI/CD automation

---

## Recommended Approach

**For learningaier-lab (Testing)**:
1. **Short-term**: Use Option 2 (reduce CPU requests to 250m)
2. **Long-term**: Request quota increase to 24 CPUs

**For learningaier-prod (Production)**:
1. **Immediately request**: 48-64 CPU quota
2. **Keep pod requests**: 500m CPU (maintain performance)
3. **Plan for growth**: More headroom for scaling

---

## How to Check Current Usage

### View Quota in Console:
```
https://console.cloud.google.com/iam-admin/quotas?project=learningaier-lab
```

### Check via gcloud:
```bash
gcloud compute project-info describe --project=learningaier-lab \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"
```

### Check GKE Resource Usage:
```bash
# Total CPU requested by pods
kubectl top nodes

# CPU requests per pod
kubectl describe nodes | grep -A 5 "Allocated resources"

# Your pods specifically
kubectl get pods -o custom-columns=\
NAME:.metadata.name,\
CPU_REQUEST:.spec.containers[*].resources.requests.cpu,\
CPU_LIMIT:.spec.containers[*].resources.limits.cpu
```

---

## Prevention Tips

### 1. **Set Appropriate Resource Requests**
- Don't over-request (wastes quota)
- Don't under-request (pods may be throttled)
- Profile your actual usage first

### 2. **Use Vertical Pod Autoscaler (VPA)**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: learningaier-backend
  updatePolicy:
    updateMode: "Auto"
```

### 3. **Monitor Quota Usage**
- Set up alerts at 80% quota usage
- Regularly review in Cloud Console
- Plan increases before hitting limits

### 4. **Request Quota Before Production**
- Production should have 2-3x dev quota
- Request early (approval can take days)
- Document justification clearly

---

## Summary

**Current Issue**: 12 CPU quota too small for GKE Autopilot rolling updates

**Immediate Fix**: Reduce CPU requests from 500m → 250m

**Long-term Solution**: Request quota increase to 24+ CPUs

**Quota Location**: Google Cloud Console → IAM & Admin → Quotas → "Compute Engine API - CPUs (all regions)"

**Key Metric**: You need ~6-8 CPUs for comfortable operation (2 backend pods + worker + Redis + node overhead + headroom for updates)
