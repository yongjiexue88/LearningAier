# Deployment Fix and Configuration Simplification

## Issue Resolved

**Problem:** Deployed application was using an invalid Firebase API key and wrong backend URL because GitHub Actions was injecting stale secrets.

**Root Cause:** GitHub workflows were overriding committed `.env.production` with outdated GitHub Secrets.

**Solution:** Removed secret injection from workflows to rely on committed configuration files.

## Changes Made

### 1. GitHub Actions Workflows

#### [firebase-hosting-merge.yml](file:///Users/yongjiexue/Documents/GitHub/LearningAier/.github/workflows/firebase-hosting-merge.yml)
- Removed `env` section that injected `VITE_*` variables from GitHub Secrets

#### [firebase-hosting-pull-request.yml](file:///Users/yongjiexue/Documents/GitHub/LearningAier/.github/workflows/firebase-hosting-pull-request.yml)
- Removed `env` section that injected `VITE_*` variables from GitHub Secrets

### 2. Simplified Backend URL Configuration

#### Environment Files
- **[.env.production](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/.env.production)**: Now uses only `VITE_API_BASE_URL=https://api.learningaier.com`
- **[.env.local](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/.env.local)**: Now uses only `VITE_API_BASE_URL=http://localhost:8080`

#### Frontend Code
- **[apiClient.ts](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/src/lib/apiClient.ts)**: Removed environment switching logic
- **[App.tsx](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/src/App.tsx)**: Removed environment switching console logs

## How It Works Now

1. **Build Process**: Vite automatically loads `.env.production` during `npm run build`
2. **No Secrets Needed**: All `VITE_*` variables are committed and version-controlled
3. **One Backend Per Environment**: 
   - Production → `https://api.learningaier.com`
   - Local → `http://localhost:8080`

## Next Steps

```bash
# Commit all changes
git add .
git commit -m "fix: remove stale secret injection and simplify backend URL config"
git push
```

After deployment completes, the console should show:
- ✅ Correct Firebase API key
- ✅ Correct backend URL (`https://api.learningaier.com`)
- ✅ Sign-in should work without errors
