# Kubernetes Pod Management Command Reference

**Date**: 2025-11-30  
**Context**: Managing backend pods in GKE while dealing with CPU quota constraints

---

## Essential Pod Management Commands

### 1. View Pods

```bash
# List all pods for a specific app
kubectl get pods -l app=learningaier-backend

# Watch pods in real-time (auto-refresh)
kubectl get pods -l app=learningaier-backend --watch

# Wide output (shows node, IP, etc.)
kubectl get pods -l app=learningaier-backend -o wide

# Get pod details in YAML format
kubectl get pod <pod-name> -o yaml
```

---

### 2. Scale Deployments

```bash
# Scale to specific number of replicas
kubectl scale deployment learningaier-backend --replicas=1

# Scale to 0 (stops all pods)
kubectl scale deployment learningaier-backend --replicas=0

# Scale back to 2
kubectl scale deployment learningaier-backend --replicas=2
```

**Use case**: Reduce replicas when hitting CPU quota limits

---

### 3. Delete Pods

#### Delete Specific Pod
```bash
# Delete by name (pod will be recreated by deployment)
kubectl delete pod learningaier-backend-9d7c8b74b-bkhhk

# Delete multiple pods
kubectl delete pod pod1 pod2 pod3
```

#### Delete Pods by Status
```bash
# Delete all pending pods (common with quota issues)
kubectl delete pod -l app=learningaier-backend --field-selector status.phase=Pending

# Delete all failed pods
kubectl delete pod -l app=learningaier-backend --field-selector status.phase=Failed

# Delete all evicted pods
kubectl get pods --all-namespaces --field-selector status.phase=Failed -o json | \
  jq -r '.items[] | select(.status.reason=="Evicted") | .metadata.name' | \
  xargs kubectl delete pod
```

**Use case**: Clean up stuck/pending pods when updates fail

---

### 4. Restart Deployments

```bash
# Graceful restart (rolling update)
kubectl rollout restart deployment/learningaier-backend

# Check rollout status
kubectl rollout status deployment/learningaier-backend

# Undo last rollout (rollback)
kubectl rollout undo deployment/learningaier-backend

# Rollback to specific revision
kubectl rollout history deployment/learningaier-backend
kubectl rollout undo deployment/learningaier-backend --to-revision=2
```

**Use case**: Apply new configuration or restart all pods

---

### 5. Update Configuration

#### Update Environment Variables
```bash
# Set a single environment variable
kubectl set env deployment/learningaier-backend WORKER_SERVICE_URL=http://document-worker:8000

# Remove an environment variable
kubectl set env deployment/learningaier-backend WORKER_SERVICE_URL-

# View current env vars
kubectl set env deployment/learningaier-backend --list
```

#### Update Secrets
```bash
# Delete old secret
kubectl delete secret firebase-config

# Create new secret
kubectl create secret generic firebase-config \
  --from-literal=project_id=learningaier \
  --from-literal=storage_bucket=learningaier.firebasestorage.app

# View secret (base64 encoded)
kubectl get secret firebase-config -o yaml

# Decode secret values
kubectl get secret firebase-config -o jsonpath='{.data.project_id}' | base64 -d
```

**Important**: Pods don't auto-reload secrets - must restart pods after updating secrets!

---

### 6. Execute Commands in Pods

```bash
# Run a single command
kubectl exec <pod-name> -- env | grep FIREBASE

# Interactive shell
kubectl exec -it <pod-name> -- /bin/bash

# Run command in specific container (if pod has multiple)
kubectl exec <pod-name> -c <container-name> -- command

# Test connectivity from pod
kubectl exec <pod-name> -- wget -qO- http://document-worker:8000/health
kubectl exec <pod-name> -- curl http://redis:6379
```

**Use case**: Verify configuration, test connections, debug issues

---

### 7. View Logs

```bash
# View logs from current pod
kubectl logs <pod-name>

# Follow logs (tail -f)
kubectl logs -f <pod-name>

# Last 50 lines
kubectl logs <pod-name> --tail=50

# Logs from all pods with label
kubectl logs -l app=learningaier-backend -f

# Previous container logs (if pod crashed)
kubectl logs <pod-name> --previous

# Logs from specific container
kubectl logs <pod-name> -c <container-name>
```

**Use case**: Debug application issues, monitor requests

---

### 8. Describe Resources

```bash
# Detailed pod information (events, conditions, etc.)
kubectl describe pod <pod-name>

# Describe deployment
kubectl describe deployment learningaier-backend

# Describe service
kubectl describe svc learningaier-backend

# Describe HPA
kubectl describe hpa learningaier-backend-hpa
```

**Use case**: See why pods are pending/failing, check events

---

## Common Workflows

### Workflow 1: Fix Pending Pods Due to Quota

```bash
# 1. Check what's happening
kubectl get pods -l app=learningaier-backend
kubectl describe pod <pending-pod-name> | grep -A 5 Events

# 2. Delete pending pods
kubectl delete pod -l app=learningaier-backend --field-selector status.phase=Pending

# 3. Scale down to 1 replica
kubectl scale deployment learningaier-backend --replicas=1

# 4. Verify
kubectl get pods -l app=learningaier-backend
```

---

### Workflow 2: Update Secret and Restart Pods

```bash
# 1. Update secret
kubectl delete secret firebase-config
kubectl create secret generic firebase-config \
  --from-literal=project_id=learningaier \
  --from-literal=storage_bucket=learningaier.firebasestorage.app

# 2. Force pod restart to load new secret
kubectl rollout restart deployment/learningaier-backend

# 3. Wait for rollout
kubectl rollout status deployment/learningaier-backend

# 4. Verify new config
kubectl exec <new-pod-name> -- env | grep FIREBASE_PROJECT_ID
```

---

### Workflow 3: Gradual Pod Replacement (Manual Rolling Update)

```bash
# When you have quota limits and can't create new pods:

# 1. Delete one pod at a time
kubectl delete pod learningaier-backend-xxx-yyy

# 2. Wait for new pod to be ready
kubectl wait --for=condition=ready pod -l app=learningaier-backend --timeout=180s

# 3. Verify it's working
kubectl exec <new-pod> -- env | grep CONFIG_VAR

# 4. Delete next pod
kubectl delete pod learningaier-backend-xxx-zzz

# Repeat until all pods updated
```

---

### Workflow 4: Test Backend Connectivity

```bash
# 1. Get running pod name
POD=$(kubectl get pods -l app=learningaier-backend -o jsonpath='{.items[0].metadata.name}')

# 2. Test worker connection
kubectl exec $POD -- python3 -c \
  "import urllib.request; print(urllib.request.urlopen('http://document-worker:8000/health').read().decode())"

# 3. Test Redis connection
kubectl exec $POD -- python3 -c \
  "import redis; r = redis.Redis(host='redis', port=6379); print(r.ping())"

# 4. Test external health
curl http://34.123.200.75/health
```

---

## Advanced Commands

### Get Specific Pod by Index
```bash
# First pod
kubectl get pods -l app=learningaier-backend -o jsonpath='{.items[0].metadata.name}'

# All pod names
kubectl get pods -l app=learningaier-backend -o jsonpath='{.items[*].metadata.name}'
```

### Filter Pods
```bash
# Running pods only
kubectl get pods -l app=learningaier-backend --field-selector status.phase=Running

# Not in Running state
kubectl get pods -l app=learningaier-backend --field-selector status.phase!=Running
```

### Patch Resources
```bash
# JSON patch to change service port
kubectl patch svc document-worker --type='json' -p='[{"op": "replace", "path": "/spec/ports/0/port", "value":8000}]'

# Strategic merge patch for HPA
kubectl patch hpa learningaier-backend-hpa -p '{"spec":{"minReplicas":1}}'
```

---

## Label Selectors

All backend pod commands use: `-l app=learningaier-backend`

**Other useful selectors**:
```bash
# By component
-l component=api

# Multiple labels
-l app=learningaier-backend,component=api

# Label exists
-l app

# Label doesn't exist
-l '!app'

# In set
-l 'app in (learningaier-backend,document-worker)'
```

---

## Troubleshooting Commands

### Why is my pod pending?
```bash
kubectl describe pod <pod-name> | grep -A 10 Events
# Look for: "Insufficient cpu", "Insufficient memory", etc.
```

### Why is my pod crashing?
```bash
# Check logs
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>

# Describe pod
kubectl describe pod <pod-name>
```

### Which pods are using which nodes?
```bash
kubectl get pods -o wide
```

### What's the pod resource usage?
```bash
# Requires metrics-server
kubectl top pods -l app=learningaier-backend
kubectl top nodes
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| List pods | `kubectl get pods -l app=learningaier-backend` |
| Watch pods | `kubectl get pods -l app=learningaier-backend --watch` |
| Delete pod | `kubectl delete pod <pod-name>` |
| Delete pending pods | `kubectl delete pod -l app=... --field-selector status.phase=Pending` |
| Scale deployment | `kubectl scale deployment learningaier-backend --replicas=1` |
| Restart deployment | `kubectl rollout restart deployment/learningaier-backend` |
| Rollback deployment | `kubectl rollout undo deployment/learningaier-backend` |
| Update env var | `kubectl set env deployment/learningaier-backend KEY=value` |
| View logs | `kubectl logs -l app=learningaier-backend -f` |
| Exec into pod | `kubectl exec -it <pod-name> -- /bin/bash` |
| Describe pod | `kubectl describe pod <pod-name>` |

---

## Session Summary: What We Did

During this session, we used these commands to manage pods with CPU quota constraints:

```bash
# 1. Reduced to 1 replica due to quota
kubectl scale deployment learningaier-backend --replicas=1

# 2. Cleaned up pending pods
kubectl delete pod -l app=learningaier-backend --field-selector status.phase=Pending

# 3. Updated Firebase secret
kubectl delete secret firebase-config
kubectl create secret generic firebase-config \
  --from-literal=project_id=learningaier \
  --from-literal=storage_bucket=learningaier.firebasestorage.app

# 4. Restarted pods to load new secret
kubectl rollout restart deployment/learningaier-backend

# 5. Cleaned up stuck pods from failed updates
kubectl delete pod <pending-pod-name>
kubectl rollout undo deployment/learningaier-backend

# 6. Verified final state
kubectl get pods -l app=learningaier-backend
kubectl exec <pod-name> -- env | grep FIREBASE_PROJECT_ID
```

**Result**: 1 healthy pod running with correct Firebase configuration!

---

## Best Practices

1. **Always use labels** for filtering pods (`-l app=...`)
2. **Check rollout status** after updates (`kubectl rollout status`)
3. **Clean up pending pods** when hitting quota limits
4. **Verify config** after secret updates (`kubectl exec ... -- env`)
5. **Use `--watch`** for real-time monitoring during updates
6. **Check events** when things go wrong (`kubectl describe pod`)
7. **Keep replicas low** in dev/lab environments (save quota)
8. **Use HPA** for auto-scaling in production
9. **Delete old secrets** before creating new ones
10. **Test connectivity** after updates (`kubectl exec ... -- curl`)

---

## Additional Resources

- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Debugging Pods](https://kubernetes.io/docs/tasks/debug/debug-application/)
