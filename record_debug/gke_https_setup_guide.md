# How to Use Your GKE Backend from Production (HTTPS Setup)

## Current Situation
- ✅ **GKE Backend is running** at `http://34.123.200.75` (HTTP only)
- ❌ **Cannot use it from production** because `https://learningaier.web.app` cannot make HTTP requests

## Two Options

### Option 1: Use Lab Cloud Run (Quick Fix) ✅ **CURRENTLY APPLIED**
**File:** `frontend/.env.production`
```bash
VITE_API_BASE_URL_LAB=https://learningaier-api-lab-286370893156.us-central1.run.app
```

**Pros:**
- Works immediately with HTTPS
- Has Vertex AI integration
- No additional setup needed

**Cons:**
- Not using your GKE deployment
- Missing Redis/Worker features you have in GKE

---

### Option 2: Add HTTPS to GKE Backend (Use Your GKE Deployment)

To use your GKE backend from production, you need HTTPS. Here are your choices:

#### **2A: Use Google Cloud Load Balancer with Auto-SSL** (Recommended)

**Requirements:**
- A domain name (e.g., `learningaier.com` or subdomain like `api-lab.learningaier.com`)
- DNS access to create an A record

**Steps:**

##### 1. Reserve a Static IP
```bash
gcloud compute addresses create learningaier-backend-ip \
  --global \
  --ip-version IPV4 \
  --project learningaier-lab
```

Get the IP address:
```bash
gcloud compute addresses describe learningaier-backend-ip \
  --global \
  --project learningaier-lab \
  --format="get(address)"
```

##### 2. Point Your Domain to the IP
In your DNS provider (e.g., Google Domains, Cloudflare), add an A record:
```
Type: A
Name: api-lab (or your subdomain choice)
Value: <IP_FROM_STEP_1>
TTL: 300
```

For example, if your domain is `learningaier.com`, this creates `api-lab.learningaier.com`.

##### 3. Update Backend Service to NodePort
```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: learningaier-backend
  labels:
    app: learningaier-backend
spec:
  type: NodePort  # Changed from LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: learningaier-backend
EOF
```

##### 4. Update Ingress Configuration
Edit `k8s/backend-ingress.yaml` and replace `api.learningaier.com` with your actual domain:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: learningaier-backend-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.allow-http: "true"
    networking.gke.io/managed-certificates: "backend-cert"
    kubernetes.io/ingress.global-static-ip-name: "learningaier-backend-ip"
spec:
  rules:
    - host: api-lab.learningaier.com  # ← YOUR DOMAIN HERE
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
    - api-lab.learningaier.com  # ← YOUR DOMAIN HERE
```

Apply it:
```bash
kubectl apply -f k8s/backend-ingress.yaml
```

##### 5. Wait for SSL Certificate (15-60 minutes)
Check certificate status:
```bash
kubectl describe managedcertificate backend-cert
```

Wait for `Status: Active`

##### 6. Update .env.production
```bash
VITE_API_BASE_URL_LAB=https://api-lab.learningaier.com
```

##### 7. Test
```bash
curl https://api-lab.learningaier.com/health
```

---

#### **2B: Use Cloudflare Tunnel** (No Domain Needed, Free SSL)

If you don't have a domain or don't want to manage DNS:

##### 1. Install Cloudflare Tunnel in GKE
```bash
# This will give you a free HTTPS URL like https://xyz.trycloudflare.com
kubectl apply -f - <<EOF
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
        args:
        - tunnel
        - --no-autoupdate
        - --url
        - http://learningaier-backend:80
EOF
```

##### 2. Get the HTTPS URL
```bash
kubectl logs -l app=cloudflared --tail=20
# Look for: "Your quick Tunnel has been created! Visit it at: https://xyz.trycloudflare.com"
```

##### 3. Update .env.production
```bash
VITE_API_BASE_URL_LAB=https://xyz.trycloudflare.com
```

**Note:** Free Cloudflare tunnels change URLs on restart. For permanent URLs, sign up for Cloudflare Zero Trust.

---

## Quick Decision Guide

**Do you have a domain name?**
- ✅ **Yes** → Use Option 2A (Google Load Balancer with SSL)
- ❌ **No** → Use Option 1 (Cloud Run) or Option 2B (Cloudflare Tunnel)

**Do you need the GKE features (Redis, Worker)?**
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
