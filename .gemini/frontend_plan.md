# Frontend API Client Refactoring Plan

Migration plan for React frontend to integrate with FastAPI backend.

## Current State

**Existing structure:**
- Basic `lib/apiClient.ts` with generic `invokeFunction`
- Uses `/functions/v1/*` endpoint pattern (Node.js backend)
- Pages: auth, dashboard, documents, flashcards, notes, pomodoro, settings
- Already has: React Query, MUI, Firebase Auth

**What needs updating:**
- API client to use `/api/*` endpoints (FastAPI)
- Add typed API functions for each endpoint
- Create React Query hooks for clean data fetching
- Update pages to use new hooks

---

## Proposed Frontend Structure

```
frontend/src/
├── lib/
│   ├── firebaseClient.ts       ✅ Keep (auth config)
│   └── apiClient.ts            ⚠️ Refactor (add typed functions)
│
├── services/                   🆕 New directory
│   ├── api/
│   │   ├── notes.ts            🆕 Notes API functions
│   │   ├── documents.ts        🆕 Documents API functions
│   │   ├── flashcards.ts       🆕 Flashcards API functions
│   │   └── types.ts            🆕 API request/response types
│   │
│   └── hooks/
│       ├── useNoteAI.ts        🆕 Notes AI hooks
│       ├── useDocuments.ts     🆕 Documents hooks
│       └── useFlashcards.ts    🆕 Flashcards hooks
│
├── pages/
│   ├── notes/                  ⚠️ Update to use new hooks
│   ├── documents/              ⚠️ Update to use new hooks
│   └── flashcards/             ⚠️ Update to use new hooks
│
└── types/
    └── api.ts                  🆕 Shared API types
```

---

## Implementation Components

### 1. Update API Client (`lib/apiClient.ts`)

```typescript
import { getFunctionsBaseUrl } from "./firebaseClient";
import { firebaseAuth } from "./firebaseClient";

/**
 * Base API client with automatic auth token injection
 */
class APIClient {
  private baseUrl: string;

  constructor() {
    // NEW: Use /api instead of /functions/v1
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Get current Firebase ID token
   */
  private async getAuthToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  /**
   * Generic request method
   */
  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: TBody;
      requireAuth?: boolean;
    } = {}
  ): Promise<TResponse> {
    const { method = "POST", body, requireAuth = true } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add auth token if required
    if (requireAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `Request failed: ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    return response.json() as Promise<TResponse>;
  }
}

export const apiClient = new APIClient();
```

---

### 2. API Types (`services/api/types.ts`)

```typescript
// Notes API types
export interface AIQARequest {
  note_id?: string;
  question: string;
  top_k?: number;
}

export interface AIQASource {
  chunk_id: string;
  note_id: string | null;
  position: number | null;
  score: number;
  preview: string;
}

export interface AIQAResponse {
  answer: string;
  sources: AIQASource[];
}

export interface ReindexNoteRequest {
  note_id: string;
  force?: boolean;
}

export interface ReindexNoteResponse {
  success: boolean;
  chunks_created: number;
  note_id: string;
}

export interface TranslateNoteRequest {
  note_id: string;
  target_language: "zh" | "en";
  content?: string;
}

export interface TranslateNoteResponse {
  note_id: string;
  translated_content: string;
  target_language: string;
}

export interface ExtractTerminologyRequest {
  text: string;
  note_id?: string;
}

export interface TerminologyItem {
  term_zh: string;
  term_en: string;
  definition: string;
}

export interface ExtractTerminologyResponse {
  terms: TerminologyItem[];
}

// Documents API types
export interface UploadProcessRequest {
  document_id: string;
  file_path: string;
  chunk_size?: number;
}

export interface UploadProcessResponse {
  success: boolean;
  document_id: string;
  note_id: string | null;
  chunks_created: number;
  text_preview: string;
}

// Flashcards API types
export interface GenerateFlashcardsRequest {
  note_id: string;
  count?: number;
  auto_save?: boolean;
}

export interface FlashcardItem {
  front: string;
  back: string;
  tags?: string[];
}

export interface GenerateFlashcardsResponse {
  flashcards: FlashcardItem[];
  note_id: string;
}

export interface ReviewFlashcardRequest {
  flashcard_id: string;
  quality: number; // 0-5 SM-2 quality rating
}

export interface ReviewFlashcardResponse {
  flashcard_id: string;
  next_review_date: string;
  interval: number;
  ease_factor: number;
}
```

---

### 3. Notes API Service (`services/api/notes.ts`)

```typescript
import { apiClient } from "../../lib/apiClient";
import type {
  AIQARequest,
  AIQAResponse,
  ReindexNoteRequest,
  ReindexNoteResponse,
  TranslateNoteRequest,
  TranslateNoteResponse,
  ExtractTerminologyRequest,
  ExtractTerminologyResponse,
} from "./types";

export const notesApi = {
  /**
   * Ask a question using RAG
   */
  aiQA: (request: AIQARequest) =>
    apiClient.request<AIQAResponse, AIQARequest>("/api/notes/ai-qa", {
      method: "POST",
      body: request,
    }),

  /**
   * Reindex note (rebuild embeddings)
   */
  reindex: (request: ReindexNoteRequest) =>
    apiClient.request<ReindexNoteResponse, ReindexNoteRequest>(
      "/api/notes/reindex",
      {
        method: "POST",
        body: request,
      }
    ),

  /**
   * Translate note content
   */
  translate: (request: TranslateNoteRequest) =>
    apiClient.request<TranslateNoteResponse, TranslateNoteRequest>(
      "/api/notes/ai-translate",
      {
        method: "POST",
        body: request,
      }
    ),

  /**
   * Extract bilingual terminology
   */
  extractTerminology: (request: ExtractTerminologyRequest) =>
    apiClient.request<ExtractTerminologyResponse, ExtractTerminologyRequest>(
      "/api/notes/ai-terminology",
      {
        method: "POST",
        body: request,
      }
    ),
};
```

---

### 4. Documents API Service (`services/api/documents.ts`)

```typescript
import { apiClient } from "../../lib/apiClient";
import type { UploadProcessRequest, UploadProcessResponse } from "./types";

export const documentsApi = {
  /**
   * Process uploaded PDF document
   */
  processUpload: (request: UploadProcessRequest) =>
    apiClient.request<UploadProcessResponse, UploadProcessRequest>(
      "/api/documents/upload-process",
      {
        method: "POST",
        body: request,
      }
    ),
};
```

---

### 5. Flashcards API Service (`services/api/flashcards.ts`)

```typescript
import { apiClient } from "../../lib/apiClient";
import type {
  GenerateFlashcardsRequest,
  GenerateFlashcardsResponse,
  ReviewFlashcardRequest,
  ReviewFlashcardResponse,
} from "./types";

export const flashcardsApi = {
  /**
   * Generate flashcards from note
   */
  generate: (request: GenerateFlashcardsRequest) =>
    apiClient.request<GenerateFlashcardsResponse, GenerateFlashcardsRequest>(
      "/api/flashcards/generate",
      {
        method: "POST",
        body: request,
      }
    ),

  /**
   * Submit flashcard review
   */
  review: (request: ReviewFlashcardRequest) =>
    apiClient.request<ReviewFlashcardResponse, ReviewFlashcardRequest>(
      "/api/flashcards/review",
      {
        method: "POST",
        body: request,
      }
    ),
};
```

---

### 6. React Query Hook - Notes (`services/hooks/useNoteAI.ts`)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "../api/notes";
import type {
  AIQARequest,
  ReindexNoteRequest,
  TranslateNoteRequest,
  ExtractTerminologyRequest,
} from "../api/types";

/**
 * Hook for AI Q&A
 */
export function useAIQA() {
  return useMutation({
    mutationFn: (request: AIQARequest) => notesApi.aiQA(request),
    onError: (error: Error) => {
      console.error("AI Q&A failed:", error.message);
    },
  });
}

/**
 * Hook for note reindexing
 */
export function useReindexNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReindexNoteRequest) => notesApi.reindex(request),
    onSuccess: (data) => {
      // Invalidate note queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
    },
    onError: (error: Error) => {
      console.error("Reindex failed:", error.message);
    },
  });
}

/**
 * Hook for note translation
 */
export function useTranslateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TranslateNoteRequest) => notesApi.translate(request),
    onSuccess: (data) => {
      // Invalidate note queries
      queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
    },
  });
}

/**
 * Hook for terminology extraction
 */
export function useExtractTerminology() {
  return useMutation({
    mutationFn: (request: ExtractTerminologyRequest) =>
      notesApi.extractTerminology(request),
  });
}
```

---

### 7. React Query Hook - Documents (`services/hooks/useDocuments.ts`)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";
import type { UploadProcessRequest } from "../api/types";

/**
 * Hook for processing uploaded documents
 */
export function useProcessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UploadProcessRequest) =>
      documentsApi.processUpload(request),
    onSuccess: (data) => {
      // Invalidate documents and notes queries
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (data.note_id) {
        queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
      }
    },
    onError: (error: Error) => {
      console.error("Document processing failed:", error.message);
    },
  });
}
```

---

### 8. React Query Hook - Flashcards (`services/hooks/useFlashcards.ts`)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flashcardsApi } from "../api/flashcards";
import type {
  GenerateFlashcardsRequest,
  ReviewFlashcardRequest,
} from "../api/types";

/**
 * Hook for generating flashcards
 */
export function useGenerateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GenerateFlashcardsRequest) =>
      flashcardsApi.generate(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

/**
 * Hook for reviewing flashcards
 */
export function useReviewFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReviewFlashcardRequest) =>
      flashcardsApi.review(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["flashcards", data.flashcard_id],
      });
    },
  });
}
```

---

### 9. Example Page Integration - Notes Page

```typescript
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useAIQA, useReindexNote, useTranslateNote } from "../../services/hooks/useNoteAI";

export function NoteViewerPage({ noteId }: { noteId: string }) {
  const [question, setQuestion] = useState("");

  // React Query hooks
  const aiQA = useAIQA();
  const reindex = useReindexNote();
  const translate = useTranslateNote();

  const handleAskQuestion = () => {
    if (!question.trim()) return;

    aiQA.mutate({
      note_id: noteId,
      question,
      top_k: 5,
    });
  };

  const handleReindex = () => {
    reindex.mutate({ note_id: noteId });
  };

  const handleTranslate = (targetLanguage: "zh" | "en") => {
    translate.mutate({
      note_id: noteId,
      target_language: targetLanguage,
    });
  };

  return (
    <Box>
      {/* AI Q&A Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Ask AI about this note
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={aiQA.isPending}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={handleAskQuestion}
            disabled={aiQA.isPending || !question.trim()}
          >
            {aiQA.isPending ? <CircularProgress size={20} /> : "Ask"}
          </Button>

          {/* Display answer */}
          {aiQA.isSuccess && aiQA.data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Answer:</strong>
              </Typography>
              <Typography>{aiQA.data.answer}</Typography>

              {aiQA.data.sources.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sources:
                  </Typography>
                  {aiQA.data.sources.map((source, idx) => (
                    <Typography
                      key={source.chunk_id}
                      variant="caption"
                      display="block"
                    >
                      [{idx + 1}] {source.preview} (score: {source.score.toFixed(2)})
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {aiQA.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {aiQA.error.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Note Actions
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleReindex}
              disabled={reindex.isPending}
            >
              {reindex.isPending ? <CircularProgress size={20} /> : "Reindex"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleTranslate("en")}
              disabled={translate.isPending}
            >
              Translate to EN
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleTranslate("zh")}
              disabled={translate.isPending}
            >
              Translate to ZH
            </Button>
          </Box>

          {reindex.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Reindexed successfully! {reindex.data.chunks_created} chunks created.
            </Alert>
          )}

          {translate.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Translation complete!
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
```

---

## Environment Variables Update

Update `.env.local`:

```env
# OLD (Node.js backend)
# VITE_API_BASE_URL=http://localhost:8787/functions/v1

# NEW (FastAPI backend)
VITE_API_BASE_URL=http://localhost:8787
```

For production:
```env
VITE_API_BASE_URL=https://your-backend.run.app
```

---

## Migration Checklist

- [ ] Update `lib/apiClient.ts` with new APIClient class
- [ ] Create `services/api/types.ts` with all request/response types
- [ ] Create `services/api/notes.ts` with typed note API functions
- [ ] Create `services/api/documents.ts` with document API functions
- [ ] Create `services/api/flashcards.ts` with flashcard API functions
- [ ] Create `services/hooks/useNoteAI.ts` with React Query hooks
- [ ] Create `services/hooks/useDocuments.ts` with React Query hooks
- [ ] Create `services/hooks/useFlashcards.ts` with React Query hooks
- [ ] Update notes pages to use new hooks
- [ ] Update documents pages to use new hooks
- [ ] Update flashcards pages to use new hooks
- [ ] Update `.env.local` with new API base URL
- [ ] Test end-to-end with FastAPI backend

---

## Key Benefits

✅ **Type Safety**: Full TypeScript types for all API calls  
✅ **Clean Separation**: API logic separate from UI components  
✅ **React Query**: Automatic caching, refetching, error handling  
✅ **Auth Integration**: Automatic Firebase token injection  
✅ **Error Handling**: Consistent error messages across app  
✅ **Maintainability**: Easy to add new endpoints  
✅ **Testing**: Services can be mocked easily
