# GKE HTTPS & Mixed Content Playbook

## Problem
- Frontend on HTTPS (Firebase Hosting) could not call the GKE backend on HTTP, triggering mixed-content blocks.
- Error example:
  ```
  Mixed Content: The page at 'https://learningaier.web.app/' was loaded over HTTPS,
  but requested an insecure resource 'http://34.123.200.75/...'
  ```

## Current Endpoints (when issue occurred)
1) Prod Cloud Run (HTTPS): `https://learningaier-api-330193246496.us-central1.run.app`  
2) Lab Cloud Run (HTTPS): `https://learningaier-api-lab-286370893156.us-central1.run.app`  
3) Lab GKE Backend (HTTP only): `http://34.123.200.75` (Vertex AI, Redis, Worker)

## Quick Fix (Applied)
- Pointed frontend to Cloud Run HTTPS endpoint:
  ```bash
  # frontend/.env.production
  VITE_API_BASE_URL_LAB=https://learningaier-api-lab-286370893156.us-central1.run.app
  ```
- Pros: instant, HTTPS. Cons: bypasses GKE features (Redis/Worker).

## Preferred Fix (HTTPS on GKE with Managed Cert)

Prereqs: domain + DNS access (Cloud DNS or other), static IP, and GKE Ingress.

1) Reserve global static IP  
```bash
gcloud compute addresses create learningaier-backend-ip \
  --global --ip-version IPV4 --project learningaier-lab
gcloud compute addresses describe learningaier-backend-ip \
  --global --project learningaier-lab --format='get(address)'
```

2) Update Service to NodePort (Ingress target)  
```yaml
# k8s/backend-service.yaml
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 8080
      name: http
```
Apply: `kubectl apply -f k8s/backend-service.yaml`

3) Create Ingress + Managed Certificate  
```yaml
# k8s/backend-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: learningaier-backend-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "learningaier-backend-ip"
    networking.gke.io/managed-certificates: "backend-cert"
spec:
  rules:
  - host: api.learningaier.com   # your domain
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: learningaier-backend
            port:
              number: 80
---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: backend-cert
spec:
  domains:
  - api.learningaier.com
```
Apply: `kubectl apply -f k8s/backend-ingress.yaml`

4) DNS (Cloud DNS or your provider)  
Create A record: `api.learningaier.com → <STATIC_IP_FROM_STEP_1>`

5) Wait for cert (15–60 min)  
`kubectl describe managedcertificate backend-cert` → `Status: Active`

6) Frontend env  
```bash
VITE_API_BASE_URL_LAB=https://api.learningaier.com
```

7) Test  
`curl https://api.learningaier.com/health`

## Optional: Cloudflare Tunnel (no domain)
```bash
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflared
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
      - name: cloudflared
        image: cloudflare/cloudflared:latest
        args: [ "tunnel", "--no-autoupdate", "--url", "http://learningaier-backend:80" ]
EOF
kubectl logs -l app=cloudflared --tail=20  # grab https://xyz.trycloudflare.com
```
Note: quick tunnels change on restart; use Zero Trust for permanent hostnames.

## Deep Dive (kept for reference)
- **Mixed content**: HTTPS pages cannot call HTTP APIs. Fix = HTTPS on backend.  
- **Layer 4 vs Layer 7**: old LB (L4) only forwarded TCP; new GCE Ingress (L7) terminates HTTPS, handles certs, and routes HTTP inside the cluster.  
- **TLS termination**: HTTPS ends at the load balancer/ingress; traffic to pods is HTTP on the private network.  
- **Cloud Run vs GKE**: Cloud Run hides a shared ingress (`*.run.app` certs). On GKE you must configure ingress, DNS, and certs yourself.  
- **Domains**: SSL needs a name (e.g., `api.learningaier.com`), not a raw IP.

## Quick Decision Guide
- Have a domain and want GKE features (Redis/Worker)? → Use GKE Ingress + managed cert.  
- Need fastest fix or no domain? → Use Cloud Run endpoint or Cloudflare Tunnel.  
- Changing service type back to LoadBalancer will drop the ingress flow; keep it NodePort when using GCE Ingress.
- ✅ **Yes** → Set up HTTPS (Option 2A or 2B)
- ❌ **No** → Keep using Cloud Run (Option 1 - current)

## Current Status
✅ **Temporary fix applied:** Using Lab Cloud Run endpoint with HTTPS  
⏳ **Awaiting decision:** Do you want to set up HTTPS for GKE?

---

## What I Recommend

**For now:** Keep using the Lab Cloud Run endpoint (`https://learningaier-api-lab-286370893156.us-central1.run.app`)

**Later (when ready):** Set up a subdomain like `api-lab.learningaier.com` and use Option 2A for your GKE backend

This way you get HTTPS working immediately, and can migrate to GKE when you have time to set up the domain properly.
