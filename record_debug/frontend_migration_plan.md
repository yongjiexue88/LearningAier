# TODO: Frontend Migration to `learningaier-lab`

This document outlines the steps required to migrate the frontend application from the `learningaier` (production) project to the `learningaier-lab` (lab/dev) project.

## Step 1: Firebase Project Setup (User Action Required)

1.  **Go to Firebase Console:** [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  **Create/Select Project:**
    *   If `learningaier-lab` exists, select it.
    *   If not, create a new project named `learningaier-lab`.
3.  **Enable Authentication:**
    *   Go to **Build** -> **Authentication**.
    *   Click **Get Started**.
    *   Enable **Google** sign-in (and Email/Password if used).
4.  **Create Firestore Database:**
    *   Go to **Build** -> **Firestore Database**.
    *   Click **Create Database**.
    *   Select **nam5 (us-central)** as the location.
    *   Start in **Production mode** (we will update rules later).
5.  **Register Web App:**
    *   Go to **Project Settings** (gear icon).
    *   Scroll down to **Your apps**.
    *   Click the **</> (Web)** icon.
    *   Nickname: `LearningAier Lab Frontend`.
    *   **Check** "Also set up Firebase Hosting for this app".
    *   Select the existing site or create a new one (e.g., `learningaier-lab`).
    *   Click **Register app**.

## Step 2: Provide Configuration

Copy the `firebaseConfig` object provided after registering the app. It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "learningaier-lab.firebaseapp.com",
  projectId: "learningaier-lab",
  storageBucket: "learningaier-lab.firebasestorage.app",
  messagingSenderId: "...",
  appId: "1:...",
  measurementId: "G-..."
};
```

**Paste this configuration into the chat so I can update the environment files.**

## Step 3: Update Environment Files (Agent Action)

Once the config is provided, I will update:
*   `frontend/.env.production`
*   `frontend/.env.local`
*   `.firebaserc`

## Step 4: Update CI/CD (Agent Action)

I will update the GitHub Actions workflows to deploy to the new project:
*   `firebase-hosting-merge.yml`
*   Add `FIREBASE_SERVICE_ACCOUNT_LEARNINGAIER_LAB` secret to GitHub.

## Step 5: Backend Alignment (Agent Action)

I will ensure the backend is configured to accept tokens from the new project:
*   Update `k8s/backend-deployment.yaml` env vars.
*   Update `firebase-config` secret in GKE.
*   Revert the temporary hardcoded fix in `app/core/firebase.py`.
