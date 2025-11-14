# Study Assistant Backend

This folder tracks every backend artifact for the Study Assistant MVP. The scope is intentionally constrained to Supabase (Postgres + Auth + Storage + pgvector) and Edge Functions that power AI, retrieval, spaced repetition, and Pomodoro/task helpers.

## 0. Operating Model

- **Single source of truth** for schema lives in `supabase/migrations/0001_init_schema.sql`. Apply it through Supabase CLI.
- **Edge Functions** live under `functions/` and can be deployed via `supabase functions deploy <name> --project-ref ...`.
- **Shared utilities** (LLM prompts, chunking, embeddings) live under `src/`.
- Prefer **small, incremental tasks**. Each change should map to one spec phase (schema, CRUD policies, AI endpoints, etc.).

### Environment targets

- Two env files live at the repo root of `backend/`:
  - `.env.local` → hooks into the `npx supabase start` Docker stack (default).
  - `.env.prod` → points at the hosted Supabase project (`beelemrsnwzdhsukiyuq`).
- Use the helper script to toggle which file is loaded:

```bash
# Local (default)
cd backend
./scripts/serve-function.sh ai-notes-process

# Hosted project
SUPABASE_ENV_TARGET=prod ./scripts/serve-function.sh ai-notes-process
```

The script simply forwards to `npx supabase functions serve ... --env-file .env.<target>`, so you can set `SUPABASE_ENV_TARGET` in your shell if you prefer (`export SUPABASE_ENV_TARGET=prod`).

### AI providers & embeddings

- Google Gemini (`gemini-2.5-flash`) is the default LLM provider. Populate `LLM_API_KEY` inside `.env.local` / `.env.prod` with your Gemini key (the same key also powers embeddings).
- Retrieval now relies on Google `text-embedding-004` trimmed to 1536 dimensions (to stay within pgvector's ANN index cap). Apply `0002_gemini_embeddings.sql` after the initial schema and then rerun `notes-reindex` for every note to store the resized embeddings.
- Override providers/models per user via the `profiles` table as before; the backend automatically lowercases provider ids and routes requests to either OpenAI-compatible or Gemini clients.

### Applying migrations / writing data

- **Local stack**
  ```bash
  cd backend
  npx supabase start               # spins up Docker services
  npx supabase db reset            # rebuilds DB + runs migrations
  ```
- **Hosted project**
  1. Escape-sensitive env vars in `.env.prod` already use single quotes, so you can safely load them:
     ```bash
     cd backend
     set -a
     source .env.prod
     set +a
     ```
  2. Push migrations or run SQL using the remote Postgres URL:
     ```bash
     npx supabase db push --db-url "$POSTGRES_URL"
     # or run seed scripts / psql with $POSTGRES_URL_NON_POOLING
     ```
  3. (Optional) Link the CLI to the hosted project once you’ve logged in:
     ```bash
     npx supabase login                       # obtain CLI access token
     npx supabase link --project-ref beelemrsnwzdhsukiyuq
     npx supabase db push                     # now targets the linked project
     ```

This lets you switch between local Docker and hosted Supabase by picking the env file and running the same CLI commands.

## 1. Phased Roadmap

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| 0 | Supabase bootstrap | Connect project, enable `pgvector` (handled in migration). |
| 1 | Schema & RLS | Tables for folders, notes, documents, note_chunks, flashcards, flashcard_reviews, tasks, pomodoro_sessions, profiles. |
| 2 | Secure CRUD | RLS policies (already included) + RPC helpers if needed for pagination/multi-step operations. |
| 3 | LLM Integration | `llmClient` abstraction, `/ai/notes/process`, `/ai/notes/terminology`. |
| 4 | Chunking & Retrieval | Note chunking utility, embeddings pipeline, vector search RPC. |
| 5 | Q&A Endpoint | `/ai/notes/qa` with scope resolution + strict-context prompt. |
| 6 | PDF Processing | `/documents/upload/process` pipeline (Storage fetch → PDF parse → Note Processor). |
| 7 | Spaced Repetition | Flashcard scheduling helper + `/flashcards/review` endpoint. |
| 8 | Settings | Profiles CRUD + llmClient provider selection. |

## 2. Database Schema Snapshot

All SQL lives in `supabase/migrations/0001_init_schema.sql` and mirrors the canonical spec:

- `profiles`: extends `auth.users` with display name + preferred LLM provider/model.
- A trigger (`on_auth_user_created`) automatically inserts a blank `profiles` row on every new signup so frontend settings can rely on it existing.
- **Auth storage**: Supabase credentials (email/password, metadata) live inside `auth.users` (managed by Supabase Auth, not the `public` schema). Use Supabase Studio → Authentication → Users or a service-role query (`select id,email from auth.users`) to inspect accounts. The `profiles` table only holds supplemental info we control, while the auth subsystem keeps password hashes and login state separate for security.
- `folders`: hierarchical note/document containers (`parent_id` self-reference).
- `documents`: uploaded PDFs stored in Supabase Storage (keeps `file_path` reference).
- `notes`: bilingual Markdown content plus link to source document/folder.
- `note_chunks`: pgvector-backed chunks for retrieval (embedding dimension 1536, IVFFlat index).
- `flashcards` + `flashcard_reviews`: spaced repetition objects with bilingual fields and SM‑like scheduling metadata.
- `tasks` + `pomodoro_sessions`: lightweight productivity helpers, linked back to study artifacts.

Every table has row-level security enabled. Policies restrict records to `auth.uid()` (direct `user_id` match or correlated subquery for `note_chunks`). Update timestamps are managed via a shared `trigger_set_updated_at` function.

## 3. Core System Prompts

The prompt texts are defined programmatically in `src/llm/prompts.ts` to ensure every Edge Function references the same constants. Summary of the three contracts:

1. **Note Processor** (`NOTE_PROCESSOR_PROMPT`)
   - Input: arbitrary bilingual article text.
   - Output: strict JSON with `language_input`, bilingual `summary`, bilingual hierarchical `bullet_notes`, and a terminology array (all fields mirrored in zh/en).
2. **Terminology → Flashcards** (`TERMINOLOGY_PROMPT`)
   - Input: note text (any mix of languages).
   - Output: strict JSON `{ "terminology": [...] }` with bilingual term/definition/context values; no duplicates, focus on key concepts.
3. **Strict-Context Q&A** (`QA_PROMPT`)
   - Input: question + vetted `context_chunks[]`.
   - Output: JSON containing detected answer language, bilingual answer pair, `used_context_ids`, `confidence`, and optional `notes`. Must refuse answers when evidence is insufficient (set `confidence = "low"`).

See file for the full wording that instructs the LLM to respond with raw JSON (no Markdown) while supporting Chinese + English simultaneously.

## 4. Public HTTP Contracts

| Endpoint | Description | Payload | Response |
|----------|-------------|---------|----------|
| `POST /ai/notes/process` | Runs Note Processor over free-form text. | `{ "text": string }` | Note Processor JSON payload for use in the editor. |
| `POST /ai/notes/terminology` | Extracts bilingual terminology/flashcards. | `{ "text": string }` | Terminology JSON; can be ingested into `flashcards`. |
| `POST /ai/notes/qa` | Q&A limited to scoped notes/folders or full corpus. | `{ "question": string, "scope": { "type": "note" \| "folder" \| "all", "id"?: string } }` | Strict-context answer JSON, including `used_context_ids` + `confidence`. |
| `POST /documents/upload/process` | Fetches a PDF by `document_id`, extracts text, produces draft notes and terminology. | `{ "document_id": string }` | `{ noteDraft, terminology, stats }` – see function file for structure. |
| `POST /notes/:id/reindex` | Chunks & embeds bilingual markdown after edits. | `{ "note_id": string }` | `{ chunksProcessed, embeddingModel }`. |
| `POST /flashcards/:id/review` | Applies spaced-repetition response, logs review, schedules next session. | `{ "flashcard_id": string, "response": "again" \| "hard" \| "good" \| "easy" }` | `{ next_due_at, interval_days }`. |

Each Edge Function validates Supabase auth JWTs, scopes queries to `auth.uid()`, and logs structured errors.

## 5. AI + Retrieval Workflow

1. **PDF Upload**
   1. Frontend uploads file to Supabase Storage → creates `documents` row.
   2. Call `/documents/upload/process` to parse PDF and call Note Processor. User can edit resulting draft before saving the note.
2. **Note Save**
   1. Frontend writes `notes` row (native Supabase client).
   2. Call `/notes/:id/reindex` to chunk bilingual markdown into balanced paragraphs/sentences and persist embeddings in `note_chunks`.
3. **Retrieval + Q&A**
   1. `/ai/notes/qa` resolves scope to a note/folder/all, filters `note_chunks` accordingly, and queries via `match_vectors` (vector cosine).
   2. Selected chunks become `context_chunks` for QA prompt. Response returns bilingual answer + `used_context_ids`.
4. **Flashcards**
   1. Terminology arrays feed flashcard creation (optionally manual review).
   2. `/flashcards/:id/review` logs review, maps SM‑like intervals (again=1 day, hard=2, good=4, easy=8 default for MVP), and updates `next_due_at`.
5. **Pomodoro / Tasks**
   - CRUD handled via Supabase client; backend ensures linking tasks to notes/docs/pomodori sessions for analytics.

## 6. How Frontend Should Interact

- **Direct Supabase client** for basic CRUD on tables covered by RLS.
- **Edge Functions** whenever multi-step orchestration is required (LLM calls, chunking, PDF processing, scheduling).
- **Configuring providers**: frontend writes desired `llm_provider` / `llm_model` into `profiles`. `llmClient` automatically picks them up or falls back to `env`.

## 7. Next Steps

1. Wire Supabase CLI project, run the migration, and deploy RLS policies.
2. Implement the shared utilities + Edge Functions (see `src/` and `functions/` skeletons to fill in).
3. Connect CI to lint/test Deno code and validate SQL formatting.

Everything else in this backend directory should build directly on the spec documented above.
