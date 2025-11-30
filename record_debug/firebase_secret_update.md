# Firebase Secret Update - COMPLETED ✅

**Date**: 2025-11-30  
**Issue**: Backend validating auth tokens from wrong Firebase project  
**Solution**: Updated Firebase secret to use `learningaier` project

---

## Commands Executed

```bash
# 1. Delete old secret (was using learningaier-lab)
kubectl delete secret firebase-config

# 2. Create new secret with main Firebase project
kubectl create secret generic firebase-config \
  --from-literal=project_id=learningaier \
  --from-literal=storage_bucket=learningaier.firebasestorage.app

# 3. Restart backend to pick up new secret
kubectl rollout restart deployment/learningaier-backend
```

**Result**: ✅ All commands completed successfully

---

## Configuration Verified

### YAML Configuration (backend-deployment.yaml)
**Lines 34-86 - CORRECT ✅**

```yaml
env:
  # Firebase (uses secret - NOW points to learningaier)
  - name: FIREBASE_PROJECT_ID
    valueFrom:
      secretKeyRef:
        name: firebase-config
        key: project_id              # learningaier ✅
  
  - name: FIREBASE_STORAGE_BUCKET
    valueFrom:
      secretKeyRef:
        name: firebase-config
        key: storage_bucket          # learningaier.firebasestorage.app ✅
  
  # Vertex AI (hardcoded - stays in learningaier-lab)
  - name: VERTEX_PROJECT_ID
    value: "learningaier-lab"        # ✅
  
  # BigQuery (hardcoded - stays in learningaier-lab)
  - name: BIGQUERY_PROJECT_ID
    value: "learningaier-lab"        # ✅
```

**No YAML changes needed** - configuration was already correct!

---

## How This Works

```
┌────────────────────────────────────────────────┐
│ Frontend (learningaier project)                │
│ - Firebase Auth                                │
│ - Firestore database                           │
│ - Auth tokens signed by learningaier           │
└─────────────────┬──────────────────────────────┘
                  │
                  │ Bearer token (learningaier)
                  ▼
┌────────────────────────────────────────────────┐
│ Backend Pod (GKE in learningaier-lab project)  │
│                                                 │
│ Firebase Admin SDK:                             │
│   project: learningaier ✅                      │
│   → Validates auth tokens from learningaier    │
│   → Connects to Firestore in learningaier      │
│                                                 │
│ Vertex AI calls:                                │
│   project: learningaier-lab ✅                  │
│   → Makes LLM/embedding requests                │
│                                                 │
│ BigQuery queries:                               │
│   project: learningaier-lab ✅                  │
│   → Queries analytics data                      │
│                                                 │
│ GKE deployment:                                 │
│   project: learningaier-lab ✅                  │
│   → Runs on lab cluster                         │
└─────────────────────────────────────────────────┘
```

**Key Insight**: Firebase project ≠ GCP project!
- **Firebase**: `learningaier` (auth, Firestore)
- **GCP**: `learningaier-lab` (GKE, BigQuery, Vertex AI)

---

## Expected Behavior

### Before (BROKEN):
```
Frontend → Token from learningaier
           ↓
Backend → Expected token from learningaier-lab ❌
Result: 401 Unauthorized
```

### After (WORKING):
```
Frontend → Token from learningaier
           ↓
Backend → Validates token from learningaier ✅
Result: 200 OK
```

---

## Verification

### 1. Check Secret
```bash
kubectl get secret firebase-config -o yaml
# Should show: project_id: learningaier
```

### 2. Check Pod Environment
```bash
kubectl exec <backend-pod> -- env | grep FIREBASE
# FIREBASE_PROJECT_ID=learningaier
# FIREBASE_STORAGE_BUCKET=learningaier.firebasestorage.app
```

### 3. Test from Frontend
Reload `http://localhost:5173` and try:
- Generate flashcards
- Upload document
- View analytics

**Expected**: All requests succeed (no more 401 errors)

---

## Status

✅ **Secret updated**: firebase-config now uses `learningaier`  
✅ **Backend restarted**: New pod starting with correct config  
✅ **YAML verified**: No changes needed  
⏳ **Pod starting**: Wait ~30 seconds for new pod to be ready  

**Next**: Test from frontend - auth should work now!
