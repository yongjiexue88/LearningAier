# LearningAier Backend

This backend now runs as a TypeScript/Express service that fronts Firebase Auth, Firestore, and Cloud Storage. Supabase Edge Functions are no longer used—each former function lives as an HTTP route under `/functions/v1/*`, preserving the payloads/responses expected by the frontend.

## Stack

- **Runtime:** Node 20+, Express 4, TypeScript
- **Identity/Data:** Firebase Auth, Firestore, Cloud Storage
- **AI:** Google Gemini (`gemini-2.5-flash`, `text-embedding-004`)
- **PDF parsing:** `pdf-parse`

## Getting Started

1. Install deps once:
   ```bash
   cd backend
   npm install
   ```
2. Copy `.env.local` / `.env.prod` and populate the Firebase service account values:
   - `FIREBASE_PROJECT_ID` / `FIREBASE_STORAGE_BUCKET` come directly from the Firebase console (project `learningaier`).
   - Either supply `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (string with `\n` escapes) *or* drop the entire JSON credentials file into `FIREBASE_CREDENTIAL_JSON`.
   - Keep the Gemini keys in `LLM_API_KEY` / `EMBEDDINGS_API_KEY`.
3. Start the API locally (loads `.env.local` by default):
   ```bash
   npm run dev
   # or APP_ENV=prod npm run dev to load .env.prod
   ```
4. Build / run for production:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `8787`). |
| `FIREBASE_PROJECT_ID` | Firebase project id (`learningaier`). |
| `FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket (`learningaier.firebasestorage.app`). |
| `FIREBASE_CLIENT_EMAIL` | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | Multiline private key (escape newlines as `\n`). |
| `FIREBASE_CREDENTIAL_JSON` | (Optional) base64/JSON blob for credentials instead of the key pair. |
| `DEFAULT_LLM_PROVIDER` / `DEFAULT_LLM_MODEL` | Default Gemini model routing. |
| `LLM_API_KEY` / `LLM_BASE_URL` | API key + endpoint for Gemini JSON responses. |
| `EMBEDDINGS_*` | Provider + model for embeddings (defaults mirror Gemini). |

The server automatically loads `.env.<target>` based on `APP_ENV`/`NODE_ENV` (`local` by default).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Express server with hot reload via `tsx watch`. |
| `npm run build` | Type-checks and emits JS to `dist/`. |
| `npm run start` | Runs the compiled server (`node dist/server.js`). |
| `npm run lint` | Type-checks the project. |

## API Surface (`/functions/v1/*`)

| Route | Purpose |
| --- | --- |
| `POST /ai-notes-process` | Generate bilingual note draft JSON from free-form text. |
| `POST /ai-notes-translate` | Translate/sync a note between zh/en, optionally loading note content. |
| `POST /ai-notes-terminology` | Extract bilingual terminology/flashcards from text. |
| `POST /ai-notes-qa` | Strict-context Q&A with embeddings + RAG filtering. |
| `POST /documents-upload-process` | Fetch a PDF from Firebase Storage, extract text, and produce a draft note. |
| `POST /notes-reindex` | Chunk + embed bilingual note content into `note_chunks`. |
| `POST /ai-flashcards-generate` | Generate flashcards from a note and optionally persist them. |
| `POST /flashcards-review` | Apply an SM-style review response and schedule the next due date. |

All routes require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

## Firestore Collections

The service expects collections that mirror the former Supabase tables:

- `profiles` – per-user LLM preferences (`llm_provider`, `llm_model`).
- `folders`, `notes`, `documents` – core workspace structure.
- `note_chunks` – embeddings (stores `note_id`, `user_id`, `content`, `embedding`, `position`).
- `flashcards`, `flashcard_reviews` – spaced repetition data.
- `tasks`, `pomodoro_sessions`, `note_versions` – still managed by the frontend/clients via Firestore.

Populate them using the Firebase console/SDKs; the Express server only orchestrates the multi-step AI and review workflows.

### Creating the schema

1. **Enable Firestore + Storage** in the Firebase console (project `learningaier`). Choose *Start in production mode* so security rules guard every collection.
2. **Create collections** with documents containing the fields referenced above. Example shapes:
   - `folders/{id}` → `{ user_id, name, parent_id, sort_order, created_at, updated_at }`
   - `notes/{id}` → `{ user_id, folder_id, title, content_md_zh, content_md_en, word_count, reading_time_seconds, auto_save_version, auto_saved_at, sort_order, created_at, updated_at }`
   - `note_chunks/{id}` → `{ user_id, note_id, content, embedding: number[], position, created_at }`
   - `documents/{id}` → `{ user_id, folder_id, title, file_path, created_at, updated_at }`
3. **Indexes**: Firestore requires composite indexes for the ordered queries the frontend runs. Create them via the console (Indexes → Composite):
   - `folders`: where `user_id ==` + order by `sort_order` ascending.
   - `notes`: where `user_id ==` + order by `sort_order` ascending.
   - `note_versions`: where `note_id ==` + order by `created_at` descending.
   If you also query flashcards/reviews with filters, replicate those indexes (`user_id` + `next_due_at`, etc.).
4. **Storage structure**: keep two logical folders in the default bucket (`learningaier.firebasestorage.app`):
   - `documents/{uid}/<timestamp>-file.pdf`
   - `note-assets/{uid}/<timestamp>-image.png`
   The frontend writes into those prefixes and stores the resulting `file_path` on each Firestore document so backend routes (e.g., `/documents-upload-process`) can fetch and parse the files.

## Frontend Coordination

Frontend env files now expose Firebase + API keys:

```
VITE_FIREBASE_API_KEY=AIzaSyBC7tF0O651cNAyLyEJ25i2rPWVGQa9ICg
VITE_FIREBASE_AUTH_DOMAIN=learningaier.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=learningaier
VITE_FIREBASE_STORAGE_BUCKET=learningaier.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=330193246496
VITE_FIREBASE_APP_ID=1:330193246496:web:a8c15c3f4dbeef60e8df45
VITE_FIREBASE_MEASUREMENT_ID=G-ZB04YPVXMN
VITE_API_BASE_URL=http://localhost:8787/functions/v1
```

Update the frontend auth/data layer to use Firebase SDKs and call the new Express endpoints via `VITE_API_BASE_URL`.

## Legacy Supabase Artifacts

The previous Supabase migrations and Edge Function source files (`backend/supabase`, `backend/functions`) are kept for reference only—they are no longer part of the runtime or deployment story.
