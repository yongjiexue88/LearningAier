# Worker Port Configuration Fix (Final)

**Date**: 2025-11-30  
**Issue**: Backend → Worker calls failing after PDF upload due to service/URL port mismatch  
**Final State**: Service exposes **8000**, backend calls **8000**, container listens on **8000**

---

## Timeline of Fixes

1) **Initial attempt (backend change, Service on 80)**  
- Worker Service exposed `port: 80` / `targetPort: 8000`.  
- Backend env pointed to `http://document-worker:8000` (wrong).  
- Temporary mitigation: change backend to call port **80**.

```yaml
# k8s/backend-deployment.yaml (initial mitigation)
env:
  - name: WORKER_SERVICE_URL
    value: "http://document-worker:80"
```

2) **Final fix (Service change, keep backend on 8000)**  
- Cloud quota blocked backend rollout, so we flipped the Service to expose **8000** instead.  
- Backend kept `http://document-worker:8000`, matching the container.

```bash
kubectl patch svc document-worker \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/ports/0/port","value":8000}]'
```

Current path:  
```
Backend Pod → http://document-worker:8000 → Service (8000) → Worker Pod (8000)
```

---

## Files to Keep Aligned

### Service (current)
```yaml
# k8s/worker-service.yaml
spec:
  ports:
  - name: http
    port: 8000      # exposes 8000
    targetPort: 8000
```

### Backend env
```
WORKER_SERVICE_URL=http://document-worker:8000
```

### Local dev (optional)
```
WORKER_SERVICE_URL=http://localhost:8000
```

---

## Verification

```bash
# Service port
kubectl get svc document-worker -o wide

# Health from backend pod
kubectl exec -it <backend-pod> -- wget -O- http://document-worker:8000/health

# Logs
kubectl logs -l app=learningaier-backend --tail=50 | grep worker
kubectl logs -l app=document-worker --tail=50
```

---

## Notes
- ClusterIP only (no external LB) — see `worker_loadbalancer_removal.md` for context.
- If you ever change the Service port again, adjust `WORKER_SERVICE_URL` to match. Keeping them aligned avoids 502s/timeouts.
