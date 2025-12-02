# Firestore Rules Automation Guide

**Date**: 2025-12-01  
**Purpose**: Prevent future "missing or insufficient permissions" errors

## What Happened Today

You had **permission errors** because:
1. Your app uses **top-level Firestore collections** (e.g., `folders`, `notes`, `whiteboards`)
2. Your Firestore security rules were **missing** or didn't match the collection structure
3. New features added new collections without updating the rules

## Solution: Automatic Deployment

### ✅ Automation #1: GitHub Actions (Already Set Up)

**File**: `.github/workflows/firebase-hosting-merge.yml`

**What it does**:
- Automatically deploys Firestore rules whenever you push to `main`
- Runs **before** hosting deployment
- Uses your existing Firebase service account

**How it works**:
```yaml
- name: Deploy Firestore Rules
  run: |
    npm install -g firebase-tools
    firebase deploy --only firestore:rules --project learningaier-lab --non-interactive
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_LEARNINGAIER_LAB }}
```

**Usage**:
1. Update `frontend/firestore.rules`
2. Commit and push to `main`
3. Rules deploy automatically! ✅

---

## How to Add New Collections (Future-Proof)

### Step 1: Add Code to Use the Collection

Example: Adding a new `tasks` collection
```typescript
// In your code
await addDoc(collection(firebaseDb, "tasks"), {
  title: "My task",
  user_id: userId,  // ← IMPORTANT: Always include user_id
  created_at: new Date().toISOString(),
});
```

### Step 2: Add Security Rules

**File**: `frontend/firestore.rules`

Add this pattern for **every new collection**:
```javascript
match /tasks/{taskId} {
  allow read: if ownsDocument();
  allow create: if willOwnDocument();
  allow update, delete: if ownsDocument();
}
```

### Step 3: Deploy

**Option A - Manual (Immediate)**:
```bash
cd frontend
firebase deploy --only firestore:rules
```

**Option B - Automatic (via Git)**:
```bash
git add frontend/firestore.rules
git commit -m "feat: add security rules for tasks collection"
git push origin main
# Rules deploy automatically via GitHub Actions!
```

---

## All Collections Currently Supported

Your `firestore.rules` now includes:

✅ **Top-level collections**:
- `folders` - Note folders
- `notes` - User notes
- `flashcards` - Flashcards
- `flashcard_reviews` - Flashcard review history
- `chats` - Chat conversations
- `whiteboards` - Whiteboard drawings
- `documents` - Uploaded documents
- `note_versions` - Note version history
- `profiles` - User profiles/settings
- `user_preferences` - User preferences

✅ **Subcollections** (under `users/{userId}/`):
- Supported for backwards compatibility

---

## Security Rule Pattern Explained

```javascript
// Helper: Check if user owns existing document
function ownsDocument() {
  return isAuthenticated() && resource.data.user_id == request.auth.uid;
}

// Helper: Check if user will own the document being created
function willOwnDocument() {
  return isAuthenticated() && request.resource.data.user_id == request.auth.uid;
}

// Rule pattern for every collection
match /collection_name/{docId} {
  allow read: if ownsDocument();           // Can read their own docs
  allow create: if willOwnDocument();       // Can create with their user_id
  allow update, delete: if ownsDocument();  // Can modify their own docs
}
```

**Key requirement**: Every document **MUST** have a `user_id` field!

---

## Quick Checklist When Adding Features

- [ ] Does the feature use a new Firestore collection?
- [ ] Did I add the collection to `firestore.rules`?
- [ ] Did I include `user_id` field in all documents?
- [ ] Did I test locally before pushing?
- [ ] Did I push to `main` to auto-deploy rules?

---

## Testing Rules Locally (Optional)

You can test rules before deploying:

```bash
cd frontend
firebase emulators:start --only firestore
```

This runs a local Firestore emulator with your rules.

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause**: Collection not in `firestore.rules` or `user_id` field missing

**Fix**:
1. Check which collection is failing (see browser console)
2. Add the collection to `firestore.rules`
3. Deploy rules: `firebase deploy --only firestore:rules`

### Error: "Rules deployed but still failing"

**Causes**:
- Document doesn't have `user_id` field
- `user_id` doesn't match `request.auth.uid`
- User not authenticated

**Debug**:
1. Check browser console for auth state
2. Check Firestore console for document structure
3. Verify `user_id` field exists and matches

### How to find missing collections

Search your codebase:
```bash
# Find all Firestore collection references
grep -r "collection(firebaseDb" frontend/src/
```

Then check if each collection is in `firestore.rules`.

---

## Benefits of This Setup

✅ **Automatic deployment** - No manual steps after git push  
✅ **Version controlled** - Rules tracked in Git  
✅ **CI/CD integrated** - Part of your deployment pipeline  
✅ **Prevents errors** - Rules deploy with code changes  
✅ **Rollback support** - Revert git commit = revert rules  

---

## Advanced: Pre-Push Hook (Optional)

To get a reminder before pushing:

**File**: `.git/hooks/pre-push`
```bash
#!/bin/bash
# Check if firestore.rules was modified
if git diff --cached --name-only | grep -q "frontend/firestore.rules"; then
  echo "✓ Firestore rules will be deployed automatically"
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-push
```

---

## Summary

🎉 **You're now protected from permission errors!**

**Workflow**:
1. Add new feature with Firestore collection
2. Update `frontend/firestore.rules`
3. Push to `main`
4. GitHub Actions auto-deploys rules ✅

**No more manual deployments needed!**
