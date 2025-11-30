# Redis & Backend GKE Deployment Guide

**Date**: 2025-11-30  
**Purpose**: Complete deployment commands and explanations for Redis caching infrastructure and GKE backend migration

---

## Architecture Overview

### Network Architecture

**GKE Internal Networking** (No VPC Connector Needed):
```
┌─────────────────────────────────────────────────────────┐
│  GKE Cluster (learningaier-workers)                     │
│                                                          │
│  ┌────────────────┐   Internal DNS   ┌──────────────┐  │
│  │  Backend Pods  │ ───────────────► │ Redis Pod    │  │
│  │  Port: 8080    │  redis:6379      │ Port: 6379   │  │
│  └────────────────┘                  └──────────────┘  │
│         │                                               │
│         │ Internal DNS                                  │
│         ▼                                               │
│  ┌────────────────┐                                     │
│  │  Worker Pod    │                                     │
│  │  Port: 8000    │                                     │
│  └────────────────┘                                     │
│         │                                               │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
   LoadBalancer Service
   External IP: 34.123.200.75
```

**Key Point**: All services communicate via **Kubernetes internal DNS** (e.g., `redis:6379`, `document-worker:8000`). No VPC Connector needed because everything is within the same GKE cluster.

---

## Step-by-Step Deployment Commands

### Prerequisites

#### 1. Get GKE Cluster Credentials
```bash
gcloud container clusters get-credentials learningaier-workers \
  --region=us-central1 \
  --project=learningaier-lab
```
**Explanation**: Downloads kubectl config to connect to your GKE cluster.

---

### Phase 1: Deploy Redis

#### 1. Apply Redis Deployment and Service
```bash
kubectl apply -f k8s/redis-deployment.yaml
```

**What This Does**:
- Creates a **Deployment** with 1 Redis pod (redis:7.0-alpine)
- Creates a **ClusterIP Service** named `redis` on port 6379
- Resource limits: 100m-500m CPU, 100Mi-500Mi RAM

**Output**:
```
deployment.apps/redis created
service/redis created
```

#### 2. Verify Redis is Running
```bash
# Check pod status
kubectl get pods -l app=redis

# Expected output:
# NAME                     READY   STATUS    RESTARTS   AGE
# redis-74cc7fd8b7-vmhld   1/1     Running   0          2m
```

#### 3. Get Redis Service Details
```bash
kubectl get svc redis
```

**Output**:
```
NAME    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
redis   ClusterIP   34.118.225.111   <none>        6379/TCP   2m
```

**Key Details**:
- **Type**: ClusterIP (internal only, not exposed externally)
- **DNS Name**: `redis` (accessible within cluster as `redis:6379`)
- **Internal IP**: `34.118.225.111` (cluster-internal)

#### 4. Test Redis Connectivity (Optional)
```bash
# Run a test pod to check Redis
kubectl run redis-test --rm -it --image=redis:7.0-alpine -- redis-cli -h redis -p 6379 ping

# Expected output: PONG
```

---

### Phase 2: Create Kubernetes Secrets

#### 1. Create Firebase Config Secret
```bash
kubectl create secret generic firebase-config \
  --from-literal=project_id=learningaier-lab \
  --from-literal=storage_bucket=learningaier-lab.appspot.com \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Explanation**: 
- Creates/updates secret with Firebase configuration
- `--dry-run=client -o yaml | kubectl apply -f -` allows updating if exists

#### 2. Create Pinecone Config Secret
```bash
kubectl create secret generic pinecone-config \
  --from-literal=api_key=pcsk_4tiSYP_14TptYwvpJXut4s1nygtdNcDQs644knJYQfXCEHmtLXX7n9y8RmdeRYjjuZvEPM \
  --from-literal=index_host=https://learningaier-index-zrljhnf.svc.aped-4627-b74a.pinecone.io
```

**Note**: API key from `.env.lab` file.

#### 3. Verify Secrets
```bash
kubectl get secrets
```

---

### Phase 3: Build and Push Docker Image

#### 1. Build Backend Image
```bash
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/learningaier-lab/backend-images/learningaier-backend:latest \
  --project=learningaier-lab \
  backend-fastapi
```

**What This Does**:
- Builds Docker image from `backend-fastapi/Dockerfile`
- Pushes to Google Artifact Registry
- Tags as `:latest`

**Build Time**: ~2-3 minutes

**Output**:
```
DONE
ID: 6e96d41a-c16f-44ef-b93e-922b46d629c2
STATUS: SUCCESS
```

---

### Phase 4: Deploy Backend to GKE

#### 1. Apply Backend Deployment
```bash
kubectl apply -f k8s/backend-deployment.yaml
```

**What This Creates**:
- **Deployment**: 2 initial replicas
- **HorizontalPodAutoscaler**: min=2, max=5 (scales at 70% CPU or 80% memory)
- **ServiceAccount**: `backend-sa` with Workload Identity

**Environment Variables Set**:
```yaml
# Redis URL (internal Kubernetes DNS)
REDIS_URL: redis://redis:6379
ENABLE_REDIS_CACHE: true

# Worker URL (internal Kubernetes DNS)
WORKER_SERVICE_URL: http://document-worker:8000
```

#### 2. Apply Backend Service
```bash
kubectl apply -f k8s/backend-service.yaml
```

**What This Creates**:
- **LoadBalancer Service**: Exposes backend on port 80
- Maps external port 80 → internal port 8080

#### 3. Wait for Pods to be Ready
```bash
kubectl wait --for=condition=ready pod -l app=learningaier-backend --timeout=180s
```

**What Happens**:
1. GKE Autopilot allocates nodes
2. Pulls Docker image
3. Starts pods
4. Runs health checks (`/health` endpoint)
5. Marks pods as Ready

**Potential Issue**: GCE quota limits may cause initial delay (pods will retry)

#### 4. Check Deployment Status
```bash
# Check deployment
kubectl get deployment learningaier-backend

# Check pods
kubectl get pods -l app=learningaier-backend -o wide

# Check HPA
kubectl get hpa learningaier-backend-hpa
```

**Expected Output**:
```
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
learningaier-backend   2/2     2            2           5m

NAME                                   READY   STATUS    RESTARTS   AGE
learningaier-backend-9d7c8b74b-bkhhk   1/1     Running   1          6m
learningaier-backend-9d7c8b74b-hkk4f   1/1     Running   1          10m

NAME                       MINPODS   MAXPODS   REPLICAS   AGE
learningaier-backend-hpa   2         5         2          10m
```

#### 5. Get External IP
```bash
kubectl get svc learningaier-backend

# Get just the IP
BACKEND_IP=$(kubectl get svc learningaier-backend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Backend URL: http://$BACKEND_IP"
```

**Output**:
```
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP     PORT(S)
learningaier-backend   LoadBalancer   34.118.236.200   34.123.200.75   80:31978/TCP

Backend URL: http://34.123.200.75
```

---

## How Internal Communication Works

### Redis URL: `redis://redis:6379`

**Why This Works**:
1. Kubernetes creates a **DNS entry** for every Service
2. Service name: `redis` → DNS name: `redis.default.svc.cluster.local`
3. Pods can access via short name: `redis` (within same namespace)
4. Full connection string: `redis://redis:6379`

**Flow**:
```
Backend Pod → DNS Lookup "redis" → Redis Service (ClusterIP) → Redis Pod
```

### Worker URL: `http://document-worker:8000`

**Changed From**: `http://34.46.70.108` (external IP)  
**Changed To**: `http://document-worker:8000` (internal DNS)

**Why Changed**:
- **Before**: Backend on Cloud Run, Worker on GKE → needed external IP
- **Now**: Both on same GKE cluster → use internal DNS (faster, no egress costs)

**Benefits**:
- ✅ **Latency**: <1ms (internal network) vs ~10-50ms (external)
- ✅ **Cost**: No egress charges for internal traffic
- ✅ **Security**: Traffic never leaves cluster
- ✅ **Reliability**: No dependency on LoadBalancer

---

## Verification Commands

### 1. Test Health Endpoint
```bash
curl http://34.123.200.75/health
# Expected: {"status":"healthy"}
```

### 2. Check Redis Connectivity from Backend Pod
```bash
# Exec into backend pod
BACKEND_POD=$(kubectl get pods -l app=learningaier-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -- /bin/sh

# Inside pod, test Redis
redis-cli -h redis -p 6379 ping
# Expected: PONG

# Check Redis keys
redis-cli -h redis -p 6379 KEYS "*"

# Exit pod
exit
```

### 3. Test Worker Connectivity
```bash
# From backend pod
kubectl exec -it $BACKEND_POD -- wget -O- http://document-worker:8000/health
# Expected: {"status":"healthy","service":"document-worker","version":"1.0.0"}
```

### 4. Check Logs
```bash
# Backend logs (look for cache messages)
kubectl logs -f -l app=learningaier-backend --tail=50

# Redis logs
kubectl logs -f -l app=redis --tail=50

# Worker logs
kubectl logs -f -l app=document-worker --tail=50
```

---

## Troubleshooting

### Pods Pending

**Check Events**:
```bash
kubectl describe pod -l app=learningaier-backend | grep -A 5 "Events:"
```

**Common Issues**:
- GCE quota exceeded → Wait or request quota increase
- Image pull errors → Check Artifact Registry permissions
- Resource constraints → Reduce CPU/memory requests

### Solution for Quota Issues:
```bash
# Temporarily reduce to 1 replica
kubectl scale deployment learningaier-backend --replicas=1

# Or edit HPA minimum
kubectl edit hpa learningaier-backend-hpa
# Change minReplicas to 1
```

### Redis Connection Issues

**From Backend Pod**:
```bash
kubectl exec -it $BACKEND_POD -- /bin/sh -c 'apk add redis && redis-cli -h redis -p 6379 ping'
```

**Check Service Endpoints**:
```bash
kubectl get endpoints redis
# Should show Redis pod IP
```

---

## Rollback Commands

### Delete Backend Deployment
```bash
kubectl delete -f k8s/backend-deployment.yaml
kubectl delete -f k8s/backend-service.yaml
```

### Delete Redis
```bash
kubectl delete -f k8s/redis-deployment.yaml
```

### Disable Caching (Without Redeployment)
```bash
kubectl set env deployment/learningaier-backend ENABLE_REDIS_CACHE=false
```

---

## Key Configuration Files

### `.env.lab` - GKE Environment Variables
```bash
# Redis URL (Kubernetes DNS)
REDIS_URL=redis://redis:6379
ENABLE_REDIS_CACHE=true

# Worker URL (Kubernetes DNS)
WORKER_SERVICE_URL=http://document-worker:8000
```

### Why These URLs Work:
- **Inside GKE Cluster**: Kubernetes DNS resolves service names
- **`redis`**: Maps to Redis Service → Redis Pod
- **`document-worker`**: Maps to Worker Service → Worker Pod

---

## Summary

✅ **No VPC Connector Needed**: All services in same GKE cluster communicate via internal DNS

✅ **Redis URL**: `redis://redis:6379` (Kubernetes Service DNS)

✅ **Worker URL**: `http://document-worker:8000` (changed from external IP to internal DNS)

✅ **Benefits**: 
- Faster communication (<1ms latency)
- Lower costs (no egress charges)
- Better security (traffic stays internal)
- Simplified configuration

✅ **Current Status**:
- Redis: Running on node `gk3-learningaier-workers-pool-5-d737d375-5mw4`
- Backend: 2 pods running with HPA (2-5 replicas)
- External access: `http://34.123.200.75`
