# GKE Worker Architecture

## Overview

The document worker is a microservice deployed on GKE Autopilot that handles CPU-intensive document processing tasks, offloading work from the main Cloud Run backend.

## Architecture Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ Upload PDF
       ▼
┌──────────────────┐        ┌──────────────────┐
│  Cloud Run       │ Pub/Sub│  GKE Autopilot   │
│  Backend API     ├────────►  Document Worker │
│                  │  Topic  │                  │
│  - Receives file │        │  - PDF parsing   │
│  - Publishes task│        │  - Text extract  │
│  - Returns 202   │        │  - Embeddings    │
└──────────────────┘        └──────────────────┘
       │                             │
       │                             │
       ▼                             ▼
  Firebase                      Firebase
  Firestore                     Firestore
  (metadata)                    (content)
```

## Why GKE for Workers?

| Aspect | Cloud Run | GKE Autopilot |
|--------|-----------|---------------|
| **Startup Time** | Cold start ~1-2s | Persistent pods, no cold start |
| **CPU** | Limited, throttled | Dedicated CPU, burstable |
| **Long Tasks** | 60min timeout | No hard timeout |
| **Cost** | Per-request | Per-pod-hour |
| **Best For** | API endpoints | Background processing |

**Decision**: Use GKE for PDF processing because:
- PDF parsing is CPU-heavy (~5-10 seconds per document)
- Embedding generation is batched (more efficient with persistent workers)
- No cold start delay for users

## Setup

### 1. Create GKE Autopilot Cluster

```bash
gcloud container clusters create-auto learningaier-workers \
  --region=us-central1 \
  --project=learningaier-lab \
  --release-channel=stable
```

**Cost**: ~$0.05-0.10/hour per worker pod (1 pod = ~$30-70/month)

### 2. Configure kubectl

```bash
gcloud container clusters get-credentials learningaier-workers \
  --region=us-central1 \
  --project=learningaier-lab
```

### 3. Create Service Account for Workload Identity

```bash
# Create GCP service account
gcloud iam service-accounts create document-worker \
  --display-name="Document Worker Service Account" \
  --project=learningaier-lab

# Grant permissions
gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:document-worker@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding learningaier-lab \
  --member="serviceAccount:document-worker@learningaier-lab.iam.gserviceaccount.com" \
  --role="roles/firebase.sdkAdminServiceAgent"

# Bind Kubernetes SA to GCP SA (Workload Identity)
gcloud iam service-accounts add-iam-policy-binding \
  document-worker@learningaier-lab.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:learningaier-lab.svc.id.goog[default/document-worker-sa]"
```

### 4. Deploy Worker to GKE

```bash
cd /Users/yongjiexue/Documents/GitHub/LearningAier

# Apply Kubernetes manifests
kubectl apply -f k8s/worker-service.yaml
kubectl apply -f k8s/worker-deployment.yaml
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -l app=document-worker

# Check service
kubectl get service document-worker

# View logs
kubectl logs -l app=document-worker --tail=50 -f

# Test health endpoint
WORKER_IP=$(kubectl get service document-worker -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$WORKER_IP/health
```

## Communication: Pub/Sub vs HTTP

### Option A: Pub/Sub (Async, Recommended)

**Advantages:**
- Backend responds immediately (202 Accepted)
- Automatic retries and dead-letter queues
- Scales independently
- Better fault tolerance

**Setup:**
```bash
# Create Pub/Sub topics
gcloud pubsub topics create document-processing
gcloud pubsub topics create document-completed

# Create subscription for worker
gcloud pubsub subscriptions create worker-sub \
  --topic=document-processing \
  --ack-deadline=600
```

### Option B: HTTP (Sync, Simpler)

**Advantages:**
- Simpler implementation
- Immediate feedback
- No Pub/Sub setup needed

**Setup:**
- Get LoadBalancer IP from `kubectl get service`
- Configure backend to POST to `http://<WORKER_IP>/process-pdf`

**Recommendation**: Start with **HTTP** for simplicity, migrate to Pub/Sub if you need async processing.

## Scaling

### Horizontal Pod Autoscaler (HPA)

The deployment includes HPA with:
- **Min**: 1 pod (always warm)
- **Max**: 3 pods (bursts)
- **Triggers**: 70% CPU or 80% memory

Monitor scaling:
```bash
kubectl get hpa document-worker-hpa
```

### Manual Scaling

```bash
kubectl scale deployment document-worker --replicas=2
```

## Monitoring

### View Metrics in Console

1. Go to [GKE Workloads](https://console.cloud.google.com/kubernetes/workload)
2. Select `document-worker`
3. View CPU, memory, request rate

### Query Logs

```bash
gcloud logging read 'resource.type="k8s_container" AND resource.labels.container_name="worker"' \
  --limit=50 \
  --format=json
```

### Set Up Alerts

```bash
# Alert on high error rate
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="Worker Error Rate High" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Cost Optimization

1. **Reduce min replicas to 0** if traffic is low:
   ```yaml
   # In worker-deployment.yaml
   minReplicas: 0  # Cold start ~10s
   ```

2. **Use Spot VMs** (up to 80% savings):
   ```bash
   gcloud container node-pools create spot-pool \
     --cluster=learningaier-workers \
     --spot \
     --region=us-central1
   ```

3. **Monitor costs**:
   ```bash
   # View GKE costs
   gcloud billing accounts list
   ```

## Troubleshooting

**Pods stuck in Pending:**
```bash
kubectl describe pod <pod-name>
# Look for resource quota issues
```

**Workload Identity not working:**
```bash
# Check annotation on service account
kubectl describe sa document-worker-sa

# Should show:
# iam.gke.io/gcp-service-account: document-worker@learningaier-lab.iam.gserviceaccount.com
```

**High latency:**
- Check if pods are CPU throttled: `kubectl top pods`
- Increase resource requests in deployment.yaml

## Migration Path

For future expansion:
1. Move graph extraction to worker
2. Add image processing worker
3. Add video transcription worker

All workers can share the same GKE cluster with different deployments.
