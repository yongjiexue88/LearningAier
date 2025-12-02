# GitHub Secrets Setup Guide

**Date**: 2025-12-01  
**Purpose**: Set up `FIREBASE_SERVICE_ACCOUNT_LEARNINGAIER_LAB` secret for Firebase deployments

## Step 1: Generate Firebase Service Account Key

You already have the Firebase Console open at the Service accounts page.

1. Click the **"Generate new private key"** button
2. A dialog will appear warning you to keep the key secure
3. Click **"Generate key"** to confirm
4. A JSON file will be downloaded to your computer (e.g., `learningaier-lab-xxxxx.json`)

## Step 2: Copy the JSON Content

1. Open the downloaded JSON file with a text editor
2. **Select ALL the content** (Cmd+A on Mac)
3. **Copy** the entire JSON content (Cmd+C)

The JSON should look like this:
```json
{
  "type": "service_account",
  "project_id": "learningaier-lab",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@learningaier-lab.iam.gserviceaccount.com",
  ...
}
```

## Step 3: Add Secret to GitHub

1. Go to your GitHub repository: https://github.com/yongjiexue88/LearningAier/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `FIREBASE_SERVICE_ACCOUNT_LEARNINGAIER_LAB`
4. **Value**: Paste the entire JSON content you copied in Step 2
5. Click **"Add secret"**

## Step 4: Verify Setup

After adding the secret, you should see it listed in your repository secrets (the value will be hidden).

## Important Notes

⚠️ **Security**: 
- Never commit this JSON file to your repository
- The service account key grants full access to your Firebase project
- Keep it secure and don't share it publicly

✅ **What This Enables**:
- GitHub Actions can now deploy to Firebase Hosting
- Firestore rules will automatically deploy on merge to main
- Preview deployments will work on pull requests

## Next Steps

Once the secret is set up, your GitHub Actions workflows will be able to:
- Deploy frontend to Firebase Hosting
- Deploy Firestore security rules
- Create preview deployments for PRs

The workflows are already configured in:
- `.github/workflows/firebase-hosting-merge.yml` (production deploys)
- `.github/workflows/firebase-hosting-pull-request.yml` (PR previews)
