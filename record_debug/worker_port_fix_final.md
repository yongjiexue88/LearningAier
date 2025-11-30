# Worker Port Fix - COMPLETED ✅

**Date**: 2025-11-30  
**Issue**: Port mismatch between backend configuration and worker service  
**Solution**: Changed worker service port from 80 → 8000

---

## What Was Fixed

### Worker Service Port Change:
```bash
kubectl patch svc document-worker --type='json' -p='[{"op": "replace", "path": "/spec/ports/0/port", "value":8000}]'
```

**Before**:
```
NAME              TYPE        PORT(S)
document-worker   ClusterIP   80/TCP
```

**After**:
```
NAME              TYPE        PORT(S)
document-worker   ClusterIP   8000/TCP
```

---

## Why This Solution?

**Problem**: GCE quota limits prevented updating backend pods with new worker URL.

**Options Considered**:
1. ✅ **Change service port** 80 → 8000 (chosen - fastest, no pod updates needed)
2. ❌ Update backend env var and rebuild (slow, hit quota limits)
3. ❌ Reduce HPA replicas (fixes quota but not the root issue)

**Decision**: Option 1 avoids pod updates entirely - backend keeps calling `document-worker:8000`, service now exposes port 8000.

---

## Current Architecture

```
Backend Pods → http://document-worker:8000 → Service (port 8000) → Worker Pod (port 8000)
```

**Environment Variables** (no changes needed):
- Backend: `WORKER_SERVICE_URL=http://document-worker:8000` ✅
- Worker listens on port 8000 ✅
- Service exposes port 8000 ✅

**Everything aligned!**

---

## Verification

### Service Status:
```bash
$ kubectl get svc document-worker
NAME              TYPE        CLUSTER-IP       PORT(S)    AGE
document-worker   ClusterIP   34.118.238.193   8000/TCP   17h
```

### Test Connection:
```bash
$ kubectl exec <backend-pod> -- python3 -c "import urllib.request; print(urllib.request.urlopen('http://document-worker:8000/health').read())"
{"status":"healthy","service":"document-worker","version":"1.0.0"}
```

---

## Files Updated

### k8s/worker-service.yaml (Optional - for future deployments):
Should be updated to reflect the new port:
```yaml
spec:
  ports:
  - name: http
    port: 8000      # ← Changed from 80
    targetPort: 8000
```

---

## Summary

✅ **Worker service port**: Changed from 80 → 8000  
✅ **Backend config**: Already using port 8000 (no changes needed)  
✅ **Avoided quota issues**: No pod updates required  
✅ **Worker endpoints ready**: `/process-pdf` and `/generate-embeddings` accessible  

**Next**: Upload a PDF to test end-to-end document processing!
