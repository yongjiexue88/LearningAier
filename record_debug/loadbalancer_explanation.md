# Your GKE Load Balancers Explained

## What You Currently Have

Based on `kubectl get services`, you have **2 LoadBalancer services**:

```
NAME                   TYPE           EXTERNAL-IP     PORT(S)
document-worker        LoadBalancer   34.46.70.108    80:32623/TCP
learningaier-backend   LoadBalancer   34.123.200.75   80:31978/TCP
```

---

## The Two Classic Load Balancers You See

### 1. **document-worker LoadBalancer** (34.46.70.108)
- **Created**: 16 hours ago (from your original worker deployment)
- **Type**: GCP Network TCP/UDP Load Balancer (L4)
- **Purpose**: Was used by Cloud Run backend to call worker
- **Status**: ⚠️ **NO LONGER NEEDED** (can be removed to save costs)

**Why it exists**: When you deployed the worker to GKE, the YAML had:
```yaml
# k8s/worker-deployment.yaml (old version)
spec:
  type: LoadBalancer  # ← This created the load balancer
```

### 2. **learningaier-backend LoadBalancer** (34.123.200.75)
- **Created**: 30 minutes ago (when I deployed the backend)
- **Type**: GCP Network TCP/UDP Load Balancer (L4)
- **Purpose**: Allows users/frontend to access backend API
- **Status**: ✅ **IN USE** (keep this one!)

**Why it exists**: In `k8s/backend-service.yaml`:
```yaml
spec:
  type: LoadBalancer  # ← This created the load balancer
```

---

## Why You See Them in "Classic Load Balancers"

**Both are Layer 4 (TCP/UDP) Network Load Balancers**, which Google calls "Classic" to distinguish from:
- Modern HTTP(S) Load Balancers (Layer 7)
- Application Load Balancers
- Ingress-based load balancers

When you create a Kubernetes Service with `type: LoadBalancer`, GKE automatically provisions a **Network (TCP/UDP) Load Balancer** in GCP.

---

## Why There's "No GKE Service Type LoadBalancer" View

**There IS!** But it's in a different place:

### Where to Find It:

**Navigation**: ☰ → Kubernetes Engine → Services & Ingress

You should see:
```
Service Name              Type           External Endpoints
learningaier-backend      LoadBalancer   34.123.200.75:80
document-worker           LoadBalancer   34.46.70.108:80
redis                     ClusterIP      -
```

**What you're seeing in "Network services → Load balancing"**:
- This shows the **underlying GCP load balancers**
- These are the actual infrastructure that `type: LoadBalancer` creates

**What you see in "Kubernetes Engine → Services & Ingress"**:
- This shows the **Kubernetes Services** (the abstraction)
- Same load balancers, just displayed from Kubernetes perspective

**They're the same thing, just different views!**

```
Kubernetes View                    GCP Infrastructure View
───────────────                    ───────────────────────
Service:                           Load Balancer:
  learningaier-backend      →        a1b2c3d4e5f6...
  Type: LoadBalancer                 Type: Network TCP/UDP
  IP: 34.123.200.75                  Frontend: 34.123.200.75
                                     Backend: GKE Node Pool
```

---

## What You Should Do

### 1. **Keep**: learningaier-backend LoadBalancer
This is actively used for user traffic.

### 2. **Remove**: document-worker LoadBalancer (Optional, saves ~$18/month)

Since backend now connects to worker internally (`http://document-worker:8000`), you don't need the external IP anymore.

**Update worker service to ClusterIP**:

```bash
# Edit the worker service
kubectl patch svc document-worker -p '{"spec":{"type":"ClusterIP"}}'
```

**Or update the YAML**:
```yaml
# k8s/worker-deployment.yaml (find the Service section)
spec:
  type: ClusterIP  # ← Change from LoadBalancer to ClusterIP
  ports:
    - port: 8000
      targetPort: 8000
```

Then apply:
```bash
kubectl apply -f k8s/worker-deployment.yaml
```

This will:
- ✅ Delete the `34.46.70.108` load balancer
- ✅ Remove it from "Network services → Load balancing"
- ✅ Save ~$18/month in load balancer costs
- ✅ Still work perfectly (backend uses internal DNS)

---

## Verification

**After removing worker LoadBalancer**:

```bash
kubectl get svc

# You should see:
# NAME                   TYPE           EXTERNAL-IP     PORT(S)
# document-worker        ClusterIP      34.118.238.193  8000/TCP        ← No external IP
# learningaier-backend   LoadBalancer   34.123.200.75   80:31978/TCP
# redis                  ClusterIP      34.118.225.111  6379/TCP
```

**In GCP Console → Network services → Load balancing**:
- Before: 2 load balancers
- After: 1 load balancer (only learningaier-backend)

---

## Summary

**Your Setup**:

```
Internet → LoadBalancer (34.123.200.75) → Backend Pods
                                              ↓ Internal DNS
                                          ┌─────────┐
                                          │ Worker  │ ClusterIP
                                          │ Redis   │ ClusterIP
                                          └─────────┘
```

**Current Cost**:
- 2 load balancers × ~$18/month = ~$36/month

**Optimized Cost** (after removing worker LB):
- 1 load balancer × ~$18/month = ~$18/month

**You're using**: Both load balancers currently, but **only need the backend one**.

The "GKE Service Type LoadBalancer" view EXISTS - it's in **Kubernetes Engine → Services & Ingress**, not in "Network services → Load balancing". Both show the same infrastructure, just from different perspectives!
