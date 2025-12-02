# Frontend API Integration - Quick Start

This document provides quick reference for using the new FastAPI backend from the frontend.

## 📁 New File Structure

```
frontend/src/
├── lib/
│   └── apiClient.ts          ✅ Updated - new APIClient class
├── services/
│   ├── api/
│   │   ├── types.ts          ✅ All TypeScript types
│   │   ├── notes.ts          ✅ Notes API functions
│   │   ├── documents.ts      ✅ Documents API functions
│   │   └── flashcards.ts     ✅ Flashcards API functions
│   └── hooks/
│       ├── useNoteAI.ts      ✅ React Query hooks for notes
│       ├── useDocuments.ts   ✅ React Query hooks for documents
│       └── useFlashcards.ts  ✅ React Query hooks for flashcards
└── components/
    ├── NoteAIActions.tsx     ✅ Example AI Q&A component
    ├── DocumentProcessor.tsx ✅ Example doc processing component
    └── FlashcardComponents.tsx ✅ Example flashcard components
```

## 🚀 Usage Examples

### 1. AI Question Answering

```tsx
import { useAIQA } from "../services/hooks/useNoteAI";

function MyComponent() {
  const aiQA = useAIQA();
  
  const handleAsk = () => {
    aiQA.mutate({
      note_id: "note_123",
      question: "What are the key concepts?",
      top_k: 5
    });
  };
  
  return (
    <div>
      <button onClick={handleAsk}>Ask AI</button>
      {aiQA.data && <div>{aiQA.data.answer}</div>}
    </div>
  );
}
```

### 2. Document Processing

```tsx
import { useProcessDocument } from "../services/hooks/useDocuments";

function DocumentUpload() {
  const process = useProcessDocument();
  
  const handleProcess = (docId: string, filePath: string) => {
    process.mutate({
      document_id: docId,
      file_path: filePath,
      chunk_size: 500
    });
  };
  
  return <button onClick={() => handleProcess("doc_1", "path/to/file.pdf")}>Process</button>;
}
```

### 3. Flashcard Generation

```tsx
import { useGenerateFlashcards } from "../services/hooks/useFlashcards";

function FlashcardsPage() {
  const generate = useGenerateFlashcards();
  
  const handleGenerate = () => {
    generate.mutate({
      note_id: "note_123",
      count: 10,
      auto_save: true
    });
  };
  
  return <button onClick={handleGenerate}>Generate Flashcards</button>;
}
```

## 🔐 Authentication

Authentication is automatic! The `apiClient` automatically:
- Gets the Firebase ID token from current user
- Adds it to the `Authorization` header
- Throws error if user is not authenticated

## ⚙️ Environment Setup

Update `.env.local`:

```env
# Use new FastAPI backend
VITE_API_BASE_URL=http://localhost:8787

# For production
# VITE_API_BASE_URL=https://your-backend.run.app
```

## 📚 Available Hooks

### Notes
- `useAIQA()` - RAG question answering
- `useReindexNote()` - Rebuild embeddings
- `useTranslateNote()` - Translate zh/en
- `useExtractTerminology()` - Extract terms

### Documents
- `useProcessDocument()` - Process PDF uploads

### Flashcards
- `useGenerateFlashcards()` - Generate from notes
- `useReviewFlashcard()` - Submit SM-2 review

## 🎯 Migration from Old API

**Old way:**
```tsx
import { invokeFunction } from "../lib/apiClient";

const result = await invokeFunction({
  name: "ai-notes-qa",
  body: { question: "..." },
  idToken: token
});
```

**New way:**
```tsx
import { useAIQA } from "../services/hooks/useNoteAI";

const aiQA = useAIQA();
aiQA.mutate({ question: "..." });
```

## ✨ Benefits

✅ **Type Safety** - Full TypeScript support  
✅ **Auto Auth** - Firebase token automatic  
✅ **Caching** - React Query handles it  
✅ **Error Handling** - Consistent errors  
✅ **Loading States** - `isPending`, `isSuccess`, `isError`  
✅ **Auto Refetch** - Cache invalidation on mutations
