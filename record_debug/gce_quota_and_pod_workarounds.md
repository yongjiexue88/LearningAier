# GCE CPU Quota & Pod Workarounds

**Issue**: GKE Autopilot pods stuck Pending in `learningaier-lab` due to low CPU quota (12 CPUs).  
**Context**: Backend/worker/redis + node overhead exceeded available CPUs during rollouts.

## Quota Background
- Current limit: 12 CPUs (Compute Engine API - CPUs, all regions).
- Autopilot node overhead: ~2–3 CPUs per node (system agents).
- Workload (example): backend 2×0.5 CPU, worker 0.1, redis 0.1 → ~1.2 CPU + node overhead ≈ ~4 CPUs used.
- Rolling updates may need an extra node, exceeding quota → Pending pods.

## Options

### 1) Increase CPU Quota (Recommended)
1. Console: IAM & Admin → Quotas → filter “CPUs (all regions)” (Compute Engine API).
2. Request new limit: 20–24 CPUs; describe workload (FastAPI backend, worker, Redis).
3. Approval is often same-day for moderate increases.

### 2) Reduce Usage / Replicas (Temporary)
- Patch HPA min replicas down to 1:
  ```bash
  kubectl patch hpa learningaier-backend-hpa -p '{"spec":{"minReplicas":1,"maxReplicas":3}}'
  ```
- Scale deployment temporarily:
  ```bash
  kubectl scale deployment learningaier-backend --replicas=1
  ```
- Used in `backend_single_pod_config.md` to stay under quota.

### 3) Avoid Rebuilds When Blocked
- If backend pods can’t roll due to quota, adjust configs that don’t require new pods (e.g., Service port change) or patch Service instead of redeploying pods.
- Example mitigation used: change worker Service port to 8000 so backend `WORKER_SERVICE_URL` stays valid (see `worker_port_fix.md`).

## Manual Workaround (when pods can’t roll)
- Ensure `.env.lab` (or deployment env) points to the correct worker port:
  ```
  WORKER_SERVICE_URL=http://document-worker:80    # if Service is on 80
  ```
- Or patch Service to expose the port backend already calls (preferred):
  ```bash
  kubectl patch svc document-worker --type='json' \
    -p='[{"op":"replace","path":"/spec/ports/0/port","value":8000}]'
  ```
- Avoid rebuilding pods when quota prevents scheduling.

## Verification
```bash
kubectl get hpa learningaier-backend-hpa
kubectl get svc document-worker
kubectl get pods -l app=learningaier-backend
```
If increasing quota, reapply desired replicas and HPA limits after approval.
