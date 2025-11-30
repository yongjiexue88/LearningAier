# System Upgrade Plan

## 1. Implemented Improvements (Phase 1)

We have established a robust foundation for background processing and file handling.

### A. Redis on GKE
- **Component**: `k8s/redis-deployment.yaml`
- **Purpose**: Provides a persistent, reliable task queue and cache.
- **Status**: Manifest created. Needs to be applied (`kubectl apply -f k8s/redis-deployment.yaml`).

### B. Robust Worker (Redis + arq)
- **Component**: `worker/main.py`, `worker/worker.py`
- **Change**: Replaced in-memory `BackgroundTasks` with `arq` job queue.
- **Benefit**: Tasks survive pod restarts, retries are handled automatically, and visibility into queue depth.
- **Status**: Code updated. Needs deployment.

### C. Secure File Uploads (GCS)
- **Component**: `app/services/storage_service.py`
- **Change**: Implemented Signed URL generation.
- **Flow**: Frontend requests upload URL -> Uploads directly to GCS -> Triggers processing.
- **Benefit**: Bypasses backend bottleneck, handles large files efficiently.

### D. Redis Caching Strategies (Planned)
We will leverage the new Redis instance for more than just task queuing:

#### 1. RAG Response Caching
- **Key**: `rag:{user_id}:{note_id}:{hash(question)}`
- **Value**: JSON `{answer, sources, created_at}`
- **TTL**: 10–60 minutes
- **Flow**: Check Redis -> Hit (return cached) / Miss (call Vertex AI -> cache result).
- **Benefit**: Cuts latency & LLM costs for repeat/similar questions.

#### 2. Dashboard Analytics Cache
- **Key**: `analytics:{user_id}:overview`
- **Value**: JSON with charts/totals
- **TTL**: 5–15 minutes
- **Flow**: Check Redis -> Hit (return cached) / Miss (run BigQuery -> cache result).
- **Benefit**: Reduces BigQuery costs and improves dashboard load time.

#### 3. Rate Limiting / Usage Metering
- **Key**: `rate:{user_id}:{endpoint}:{minute}`
- **Value**: Counter (increment on request)
- **TTL**: 2–3 minutes
- **Logic**: If count > threshold -> return 429.
- **Benefit**: Security and Vertex AI cost control.

---

## 2. Future Upgrade: Unified GKE Architecture (Phase 2)

Currently, the system uses a **Hybrid Architecture**:
- **Backend API**: Cloud Run (Serverless, scales to zero).
- **Worker**: GKE (Stateful, long-running).

### Proposal: Move Backend to GKE
Migrate the FastAPI backend from Cloud Run to the existing GKE cluster.

### Why?
1.  **Internal Networking**: Backend can talk to Redis and Worker via internal cluster DNS (e.g., `http://redis:6379`) without exposing them to the public internet or dealing with complex VPC connectors.
2.  **Performance**: Lower latency between components.
3.  **Consistency**: Single deployment target (Kubernetes manifests) for all services.
4.  **Cost**: Better utilization of the existing GKE cluster resources.

### Implementation Steps
1.  **Create Manifests**:
    - `k8s/backend-deployment.yaml`: Define the API deployment (replicas, env vars).
    - `k8s/backend-service.yaml`: Expose the API via a LoadBalancer or Ingress.
2.  **Update CI/CD**:
    - Modify `cloudbuild.yaml` to apply `kubectl` commands instead of `gcloud run deploy`.
3.  **Switch Traffic**:
    - Point your domain DNS to the new GKE Ingress IP.
