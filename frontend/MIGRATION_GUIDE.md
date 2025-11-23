# Migration Guide - Legacy API to New React Query Hooks

## ✅ What's Been Migrated

### FlashcardsPage ✅ COMPLETE
**File:** [`frontend/src/pages/flashcards/FlashcardsPage.tsx`](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/src/pages/flashcards/FlashcardsPage.tsx)

**Changes made:**
1. ✅ Removed `import { invokeFunction }` 
2. ✅ Added `import { useGenerateFlashcards, useReviewFlashcard }`
3. ✅ Replaced `reviewMutation` with `useReviewFlashcard()` hook
4. ✅ Replaced `generateMutation` with `useGenerateFlashcards()` hook
5. ✅ Updated button click handlers to use new hooks

**Before:**
```typescript
const reviewMutation = useMutation({
  mutationFn: async ({ cardId, response }) => {
    const token = await getIdToken();
    return invokeFunction({ name: \"flashcards-review\", ... });
  },
});
```

**After:**
```typescript
const reviewMutation = useReviewFlashcard();

const handleReview = (cardId: string, quality: number) => {
  reviewMutation.mutate({
    flashcard_id: cardId,
    quality,
  });
};
```

---

## ⏳ What Needs Migration

### NotesPage - 6 Endpoints to Migrate
**File:** [`frontend/src/pages/notes/NotesPage.tsx`](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/src/pages/notes/NotesPage.tsx)

Currently uses `callFunction` wrapper around `invokeFunction` on lines:
- Line 985: Translation
- Line 1016: Terminology extraction  
- Line 1068: Terminology extraction (flashcards)
- Line 1142: AI Q&A
- Line 1213: Document upload processing
- Line 1617: Reindex note

#### Migration Plan for NotesPage

**Step 1:** Add imports at top of file (after line 95)
```typescript
import {
  useAIQA,
  useReindexNote,
  useTranslateNote,
  useExtractTerminology,
} from "../../services/hooks/useNoteAI";
import { useProcessDocument } from "../../services/hooks/useDocuments";
```

**Step 2:** Remove the `callFunction` wrapper (lines 376-382)
```typescript
// DELETE THIS:
const callFunction = useCallback(
  async <T,>(name: string, body: Record<string, unknown>): Promise<T> => {
    const token = await getIdToken();
    return invokeFunction<T>({ name, body, idToken: token });
  },
  [getIdToken]
);
```

**Step 3:** Add React Query hooks (after line 394)
```typescript
// Add these hooks
const aiQA = useAIQA();
const reindexNote = useReindexNote();
const translateNote = useTranslateNote();
const extractTerms = useExtractTerminology();
const processDocument = useProcessDocument();
```

**Step 4:** Replace each `callFunction` usage

##### Translation (Line ~985)
**Before:**
```typescript
const data = await callFunction<{ translated_markdown: string }>(
  \"ai-notes-translate\",
  { note_id: selectedNoteId, target_language: lang }
);
```

**After:**
```typescript
translateNote.mutate(
  {
    note_id: selectedNoteId!,
    target_language: lang,
  },
  {
    onSuccess: (data) => {
      // Update UI with data.translated_content
      setNoteDraft((prev) => ({ ...prev, content: data.translated_content }));
      showSnackbar(`Translated to ${lang}`);
    },
    onError: (error) => {
      showSnackbar(error.message, \"error\");
    },
  }
);
```

##### Terminology Extraction (Line ~1016)
**Before:**
```typescript
const data = await callFunction<{
  terms: Array<{ term: string; definition: string }>;
}>(\"ai-notes-terminology\", { text: noteDraft.content });
```

**After:**
```typescript
extractTerms.mutate(
  {
    text: noteDraft.content,
    note_id: selectedNoteId,
  },
  {
    onSuccess: (data) => {
      setLatestFlashcards(data.terms.map(/* convert to flashcard format */));
      setFlashcardDialogOpen(true);
    },
  }
);
```

##### AI Q&A (Line ~1142)
**Before:**
```typescript
const data = await callFunction<{ answer: string }>(\"ai-notes-qa\", {
  question: askAIInput,
  scope: askAIScope,
  note_id: selectedNoteId,
});
```

**After:**
```typescript
aiQA.mutate(
  {
    note_id: askAIScope === \"note\" ? selectedNoteId : undefined,
    question: askAIInput,
    top_k: 5,
  },
  {
    onSuccess: (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: \"assistant\",
          content: data.answer,
          citations: data.sources.map((s) => ({
            id: s.chunk_id,
            note_id: s.note_id || \"\",
            source_title: \"\",
            similarity: s.score,
          })),
        },
      ]);
    },
  }
);
```

##### Document Processing (Line ~1213)
**Before:**
```typescript
const data = await callFunction<any>(\"documents-upload-process\", {
  document_id: docId,
  file_path: filePath,
});
```

**After:**
```typescript
processDocument.mutate(
  {
    document_id: docId,
    file_path: filePath,
    chunk_size: 500,
  },
  {
    onSuccess: (data) => {
      if (data.note_id) {
        setSelectedNoteId(data.note_id);
      }
      showSnackbar(\"Document processed successfully\");
    },
  }
);
```

##### Reindex Note (Line ~1617)
**Before:**
```typescript
await callFunction(\"notes-reindex\", {
  note_id: selectedNoteId,
});
```

**After:**
```typescript
reindexNote.mutate(
  {
    note_id: selectedNoteId!,
    force: false,
  },
  {
    onSuccess: (data) => {
      showSnackbar(`Reindexed: ${data.chunks_created} chunks created`);
    },
  }
);
```

---

## 🧪 Testing Checklist

Once migration is complete:

### Backend Testing
1. ✅ Start FastAPI backend: `cd backend-fastapi && uvicorn app.main:app --reload --port 8787`
2. ✅ Verify health endpoint: `curl http://localhost:8787/health`
3. ✅ Check interactive docs: http://localhost:8787/docs

### Frontend Testing  
1. ✅ Update `.env.local`: `VITE_API_BASE_URL=http://localhost:8787`
2. ✅ Start frontend: `cd frontend && npm run dev`
3. ✅ Test each feature:
   - [ ] **Flashcards**: Generate flashcards from note
   - [ ] **Flashcards**: Review flashcard (check next_due_at updates)
   - [ ] **Notes**: AI Q&A over note
   - [ ] **Notes**: Translate note zh ↔ en
   - [ ] **Notes**: Extract terminology
   - [ ] **Notes**: Reindex note (rebuild embeddings)
   - [ ] **Documents**: Upload PDF and process

### Error Testing
- [ ] Test with invalid Firebase token (should get 401)
- [ ] Test with missing note_id (should get 404)
- [ ] Test with empty question (should get validation error)

---

## 🗑️ Cleanup Tasks

Once all migrations are complete and tested:

### 1. Remove Legacy Code
**File:** [`frontend/src/lib/apiClient.ts`](file:///Users/yongjiexue/Documents/GitHub/LearningAier/frontend/src/lib/apiClient.ts)

Delete the deprecated `invokeFunction` (lines 79-107):
```typescript
// DELETE THIS ENTIRE FUNCTION
export async function invokeFunction<T>({ ... }) { ... }
```

### 2. Update Imports
Search for and remove any remaining imports:
```bash
cd frontend
grep -r \"invokeFunction\" src/
```

Should return 0 results after cleanup.

### 3. Remove Old Backend (Optional)
Once FastAPI is fully deployed and stable:
- Archive or remove `backend/` (Node.js/Express)
- Update deployment scripts
- Update documentation

---

## 📊 Migration Status Summary

| Component | Status | Files Changed |
|-----------|--------|---------------|
| **API Client** | ✅ Complete | `lib/apiClient.ts` |
| **Type Definitions** | ✅ Complete | `services/api/types.ts` |
| **API Services** | ✅ Complete | `services/api/*.ts` (3 files) |
| **React Query Hooks** | ✅ Complete | `services/hooks/*.ts` (3 files) |
| **Example Components** | ✅ Complete | `components/*.tsx` (3 files) |
| **FlashcardsPage** | ✅ Complete | `pages/flashcards/FlashcardsPage.tsx` |
| **NotesPage** | ⏳ In Progress | `pages/notes/NotesPage.tsx` |
| **Backend Integration** | ⏳ Pending Test | Backend + Frontend |
| **Legacy Cleanup** | ⬜ Not Started | Remove old code |

---

## 🚀 Quick Commands

```bash
# Terminal 1: Start FastAPI backend
cd backend-fastapi
python -m venv venv
source venv/bin/activate  # or venv\\Scripts\\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8787

# Terminal 2: Start frontend
cd frontend
npm install  # if needed
npm run dev

# Check for remaining invokeFunction usage
cd frontend
grep -rn \"invokeFunction\" src/ --include=\"*.ts\" --include=\"*.tsx\"
```

## Next Step

Complete the NotesPage migration following the step-by-step guide above, then test the entire integration!
