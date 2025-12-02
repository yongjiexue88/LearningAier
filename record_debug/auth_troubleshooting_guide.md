# Troubleshooting Deployed Frontend Authentication

**Date**: 2025-12-01  
**Issue**: `400 Bad Request` on `identitytoolkit.googleapis.com` (Sign In/Sign Up)

## Likely Causes

1.  **API Key Restrictions (Most Likely)**: The API key used by the frontend is restricted to specific APIs, and **Identity Toolkit API** (required for Firebase Auth) is missing from the allowed list.
2.  **Authorized Domains**: The domain you are trying to login from (e.g., `learningaier-lab.web.app`) is not in the Firebase Auth authorized domains list.
3.  **Auth Method Disabled**: Email/Password sign-in is not enabled.

## Step 1: Check API Key Restrictions

1.  Go to **Google Cloud Console > APIs & Services > Credentials**:
    [https://console.cloud.google.com/apis/credentials?project=learningaier-lab](https://console.cloud.google.com/apis/credentials?project=learningaier-lab)
2.  Click on the API key named **"Browser key (auto created by Firebase)"** (or the one matching `AIzaSyBC...`).
3.  Look at **"API restrictions"**:
    *   If **"Restrict key"** is selected, check the dropdown list.
    *   **Ensure "Identity Toolkit API" is CHECKED.**
    *   **Ensure "Token Service API" is CHECKED.**
    *   If they are missing, select them and click **OK**, then **SAVE**.

## Step 2: Check Authorized Domains

1.  Go to **Firebase Console > Authentication > Settings**:
    [https://console.firebase.google.com/project/learningaier-lab/authentication/settings](https://console.firebase.google.com/project/learningaier-lab/authentication/settings)
2.  Click on **"Authorized domains"**.
3.  Ensure your deployed domain is listed:
    *   `learningaier-lab.web.app`
    *   `learningaier-lab.firebaseapp.com`
    *   Any custom domain you are using.
4.  If missing, click **"Add domain"** and add them.

## Step 3: Check Sign-in Method

1.  Go to **Firebase Console > Authentication > Sign-in method**:
    [https://console.firebase.google.com/project/learningaier-lab/authentication/providers](https://console.firebase.google.com/project/learningaier-lab/authentication/providers)
2.  Ensure **"Email/Password"** is **Enabled**.
3.  If not, click it and enable it.

## Step 4: Redeploy (If needed)

If you changed API key settings, it takes effect immediately (might need a page refresh).
If you changed code/config, redeploy:
```bash
# Trigger deployment via GitHub Actions (push to main)
git commit --allow-empty -m "trigger deploy"
git push
```
