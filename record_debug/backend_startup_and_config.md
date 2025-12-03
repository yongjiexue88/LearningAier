# Backend Startup & Config (Firebase creds, ENV handling)

## Final Approach
- Use **file-based Firebase credentials** locally: place `firebase-credentials.json` in `backend-fastapi/` (gitignored).
- Fallback order in `app/core/firebase.py`:
  1) `firebase-credentials.json` file  
  2) `FIREBASE_CREDENTIALS_JSON` (raw/base64)  
  3) `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`  
  4) ADC (Workload Identity/Cloud default)
- `.env.local` renamed key to `FIREBASE_CREDENTIALS_JSON` (no “_LAB”).
- `app/main.py` uses lifespan context (no deprecated startup events); startup logs improved.
- `start_local.sh` simplified; no need for `ENV=lab` when running locally unless you want lab config explicitly.

## Local Run
```bash
cd backend-fastapi
uvicorn app.main:app --reload --port 8080
# or
./start_local.sh
```

## Cloud Deploy (Cloud Run/GKE)
- Prefer Workload Identity/ADC; otherwise set `FIREBASE_CREDENTIALS_JSON` (base64) in env/secret.
- Works without local credential file present.

## Notes
- Frontend duplicate key in SettingsPage fixed during the simplification pass.
- Keep `WORKER_SERVICE_URL` and `REDIS_URL` pointing to localhost for local dev; override per env as needed.
