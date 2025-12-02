# Grant IAM Permissions for Firestore Rules Auto-Deployment

**Date**: 2025-12-01  
**Purpose**: Enable GitHub Actions to automatically deploy Firestore rules by granting necessary permissions to the Firebase service account

## Service Account to Update

**Email**: `firebase-adminsdk-fbsvc@learningaier-lab.iam.gserviceaccount.com`

## Steps to Grant Permissions

### Step 1: Open Google Cloud IAM Console

You should already be on this page:
https://console.cloud.google.com/iam-admin/iam?project=learningaier-lab

### Step 2: Find the Firebase Service Account

1. In the list of principals, find: `firebase-adminsdk-fbsvc@learningaier-lab.iam.gserviceaccount.com`
2. Click the **pencil icon (Edit)** on the right side of that row

### Step 3: Add Required Roles

Click **"+ ADD ANOTHER ROLE"** and add these roles one by one:

#### Role 1: Service Usage Consumer
1. Click **"+ ADD ANOTHER ROLE"**
2. In the role dropdown, search for: `Service Usage Consumer`
3. Select **"Service Usage Consumer"**

#### Role 2: Firebase Rules Admin
1. Click **"+ ADD ANOTHER ROLE"** again
2. In the role dropdown, search for: `Firebase Rules Admin`
3. Select **"Firebase Rules Admin"**

### Step 4: Save Changes

1. Click **"SAVE"** button at the bottom
2. Wait for the confirmation message

## Summary of Roles

After completion, the service account should have these roles:

| Role | Purpose |
|------|---------|
| **Firebase Admin SDK Service Agent** | (Existing) Basic Firebase Admin access |
| **Service Usage Consumer** | (New) Allow checking if APIs are enabled |
| **Firebase Rules Admin** | (New) Allow deploying Firestore security rules |

## Verify the Setup

After granting permissions, the GitHub Actions workflow should be able to:
- ✅ Check if Firestore API is enabled
- ✅ Deploy Firestore rules automatically on merge to main branch

## Re-enable Auto-Deployment

Once permissions are granted, you can restore the auto-deployment step in the workflow by uncommenting the "Deploy Firestore Rules" section in:
`.github/workflows/firebase-hosting-merge.yml`

## Alternative: Keep Manual Deployment

If you prefer to keep Firestore rules deployment manual (simpler and more secure), you can leave the workflow as-is and deploy rules manually when needed:

```bash
cd frontend
firebase deploy --only firestore:rules
```
