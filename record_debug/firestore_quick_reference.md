# Quick Reference: Adding New Firestore Collections

## 3-Step Process

### 1️⃣ Add to Your Code
```typescript
await addDoc(collection(firebaseDb, "new_collection"), {
  user_id: userId,  // ← REQUIRED!
  // ... other fields
});
```

### 2️⃣ Add to `frontend/firestore.rules`
```javascript
match /new_collection/{docId} {
  allow read: if ownsDocument();
  allow create: if willOwnDocument();
  allow update, delete: if ownsDocument();
}
```

### 3️⃣ Push to Deploy
```bash
git add frontend/firestore.rules
git commit -m "feat: add rules for new_collection"
git push origin main
# ✅ Auto-deploys via GitHub Actions!
```

## ⚠️ Golden Rule
**Every document MUST have `user_id` field!**

## 🔍 Find Missing Rules
```bash
grep -r 'collection(firebaseDb' frontend/src/ | grep -oP '"[a-z_]+"' | sort -u
```

Compare results with collections in `frontend/firestore.rules`

## 📋 Current Collections
- folders
- notes  
- flashcards
- flashcard_reviews
- chats
- whiteboards
- documents
- note_versions
- profiles
- user_preferences
