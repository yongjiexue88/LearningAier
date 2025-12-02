# Cleanup Old Production URL Summary

## Changes Made

1.  **Frontend Configuration**:
    -   Updated `frontend/.env.production` to point `VITE_API_BASE_URL` and `VITE_API_BASE_URL_PRODUCTION` to the new GKE ingress URL: `https://api.learningaier.com`.

2.  **GitHub Workflows**:
    -   Deleted `.github/workflows/deploy-backend.yml` (Old Cloud Run deployment).
    -   Deleted `.github/workflows/deploy-backend-lab.yml` (Old Cloud Run deployment).

## Verification

-   Verified that `VITE_API_BASE_URL_PRODUCTION` now points to `https://api.learningaier.com`.
-   Confirmed removal of obsolete workflow files.
-   Searched codebase for old Cloud Run URL (`learningaier-api-330193246496.us-central1.run.app`) and found no active code references (only in documentation/logs).

## Next Steps

-   Ensure the GKE deployment workflows (if any exist or are created in the future) are correctly configured.
-   Frontend rebuild is required for changes to take effect in production.
