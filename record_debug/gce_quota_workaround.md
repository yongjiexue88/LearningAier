# GCE Quota Issue - Workaround

**Issue**: Backend pods stuck in Pending state due to insufficient CPU quota in learningaier-lab project.

## Immediate Workaround

Since we can't update the pods due to quota limits, **manually update the document service** to call the correct port:

### File: `backend-fastapi/app/services/document_service.py`

Change line 106:
```python
# FROM:
f"{worker_url}/process-pdf"

# TO (if worker_url doesn't already have port):
worker_url = worker_url.replace(':8000', ':80') if ':8000' in worker_url else worker_url
f"{worker_url}/process-pdf"
```

Or simpler - just ensure `.env.lab` has:
```bash
WORKER_SERVICE_URL=http://document-worker:80
```

Then rebuild and redeploy the image.

## Long-term Solution

1. **Request GCE quota increase** for learningaier-lab project
2. **Or reduce HPA min replicas** from 2 to 1:
   ```bash
   kubectl patch hpa learningaier-backend-hpa -p '{"spec":{"minReplicas":1}}'
   ```

## Current Status

✅ Running pods (2x) still using old worker URL (`http://document-worker:8000`)  
⚠️ Worker service exposes port 80  
❌ Port mismatch - worker won't receive requests

**Quick Fix**: Update `.env.lab` and rebuild OR patch service to expose 8000.
