# Mixed Content Error Fix: HTTPS for GKE Backend

## Problem
Production frontend (`https://learningaier.web.app/`) was blocked from making API requests to HTTP GKE backend (`http://34.123.200.75`) due to Mixed Content Policy - HTTPS pages cannot load HTTP resources.

**Error:**
```
Mixed Content: The page at 'https://learningaier.web.app/' was loaded over HTTPS, 
but requested an insecure resource 'http://34.123.200.75/api/analytics/overview'. 
This request has been blocked; the content must be served over HTTPS.
```

## Root Cause
- Frontend deployed on Firebase Hosting with HTTPS ✅
- GKE backend exposed via LoadBalancer with only HTTP on `34.123.200.75` ❌
- Browsers block all HTTP requests from HTTPS pages (no exceptions, no workarounds)

## Current Architecture

### Backends
1. **Production Cloud Run** - `https://learningaier-api-330193246496.us-central1.run.app`
   - Project: `learningaier` (production)
   - No Vertex AI
   - Has HTTPS ✅

2. **Lab Cloud Run** - `https://learningaier-api-lab-286370893156.us-central1.run.app`
   - Project: `learningaier-lab`
   - With Vertex AI integration
   - Has HTTPS ✅

3. **Lab GKE Backend** - `http://34.123.200.75`
   - Project: `learningaier-lab`
   - With Vertex AI, Redis, Worker integration
   - **Only HTTP** ❌ Cannot be used from HTTPS frontend

## Solutions

### Option 1: Use Cloud Run Production Endpoint (Quick Fix) ✅
**Status:** Implemented

Updated `.env.production` to use HTTPS Cloud Run endpoint for both environments:
```bash
VITE_API_BASE_URL_LAB=https://learningaier-api-330193246496.us-central1.run.app
```

**Pros:**
- Immediate fix
- No infrastructure changes needed
- Already has HTTPS

**Cons:**
- Doesn't utilize GKE deployment
- Lab and production point to same backend

---

### Option 2: Set Up HTTPS Ingress on GKE (Recommended)

#### Prerequisites
1. **Domain name** pointing to your GKE cluster (e.g., `api.learningaier.com`)
2. **Reserve static IP** for the ingress
3. **Google-managed SSL certificate** (auto-provisioned)

#### Step 1: Reserve a Static IP
```bash
gcloud compute addresses create learningaier-backend-ip \
  --global \
  --ip-version IPV4 \
  --project learningaier-lab
```

Check the IP:
```bash
gcloud compute addresses describe learningaier-backend-ip --global
```

#### Step 2: Point Domain to Static IP
Add an A record in your DNS provider:
```
Type: A
Name: api (or subdomain of choice)
Value: <STATIC_IP_FROM_STEP_1>
TTL: 300
```

#### Step 3: Update Backend Service
Change service type from LoadBalancer to NodePort:

```yaml
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: learningaier-backend
spec:
  type: NodePort  # Changed from LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: learningaier-backend
```

Apply:
```bash
kubectl apply -f k8s/backend-service.yaml
```

#### Step 4: Deploy Ingress with SSL
Apply the ingress configuration:
```bash
kubectl apply -f k8s/backend-ingress.yaml
```

**Note:** Update `api.learningaier.com` in `backend-ingress.yaml` to your actual domain.

#### Step 5: Wait for Certificate Provisioning
Google will automatically provision the SSL certificate. This can take 15-60 minutes.

Check status:
```bash
kubectl describe managedcertificate backend-cert
```

Wait for status to change from `Provisioning` to `Active`.

#### Step 6: Update .env.production
Once the certificate is active and domain is resolving:
```bash
VITE_API_BASE_URL_LAB=https://api.learningaier.com
```

#### Step 7: Verify
Test the HTTPS endpoint:
```bash
curl https://api.learningaier.com/health
```

---

### Option 3: Use Self-Signed Certificate (Development Only)
**Not recommended for production** due to browser warnings.

Configure NGINX ingress controller with self-signed cert:
```bash
# Install NGINX ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Create self-signed cert
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=api.learningaier.com"

# Create secret
kubectl create secret tls backend-tls --key tls.key --cert tls.crt
```

---

## Current Status
✅ **Immediate fix applied:** Updated `.env.production` to use HTTPS Cloud Run endpoint  
⏳ **Permanent solution:** Awaiting decision on setting up GKE Ingress with custom domain

## Next Steps
1. **Decide on domain:** Do you want to use a custom domain for the lab backend?
   - Yes → Follow Option 2 (GKE Ingress with SSL)
   - No → Keep using Cloud Run endpoint (current fix)

2. **Update environment switching logic:** Ensure the frontend environment switcher only allows HTTPS backends in production builds

## Files Modified
- ✅ `frontend/.env.production` - Updated LAB URL to HTTPS
- ✅ `k8s/backend-ingress.yaml` - Created (template for HTTPS setup)

## References
- [GKE Ingress for HTTPS](https://cloud.google.com/kubernetes-engine/docs/concepts/ingress)
- [Google-managed SSL certificates](https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs)
- [Mixed Content MDN Docs](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
