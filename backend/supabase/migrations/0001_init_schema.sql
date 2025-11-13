-- Study Assistant core schema
set check_function_bodies = off;

create extension if not exists pgcrypto with schema public;
create extension if not exists vector with schema public;

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  llm_provider text,
  llm_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.trigger_set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_self
  on public.profiles
  for select
  using (id = auth.uid());

create policy profiles_modify_self
  on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Folders ----------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  parent_id uuid references public.folders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);
create index if not exists folders_parent_id_idx on public.folders (parent_id);

create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.trigger_set_updated_at();

alter table public.folders enable row level security;

create policy folders_owner_access
  on public.folders
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Documents --------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid not null references public.folders (id) on delete cascade,
  title text not null,
  file_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_folder_id_idx on public.documents (folder_id);

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.trigger_set_updated_at();

alter table public.documents enable row level security;

create policy documents_owner_access
  on public.documents
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Notes ------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid not null references public.folders (id) on delete cascade,
  title text not null,
  content_md_zh text,
  content_md_en text,
  primary_language text not null check (primary_language in ('zh', 'en')),
  source_doc_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_folder_id_idx on public.notes (folder_id);
create index if not exists notes_source_doc_id_idx on public.notes (source_doc_id);

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.trigger_set_updated_at();

alter table public.notes enable row level security;

create policy notes_owner_access
  on public.notes
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Note chunks ------------------------------------------------------------
create table if not exists public.note_chunks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  position int not null,
  created_at timestamptz not null default now()
);

create index if not exists note_chunks_note_id_idx on public.note_chunks (note_id);
create index if not exists note_chunks_embedding_idx on public.note_chunks using ivfflat (embedding vector_cosine_ops);

alter table public.note_chunks enable row level security;

create policy note_chunks_owner_select
  on public.note_chunks
  for select
  using (
    exists (
      select 1
      from public.notes n
      where n.id = note_chunks.note_id
        and n.user_id = auth.uid()
    )
  );

create policy note_chunks_owner_modify
  on public.note_chunks
  for all
  using (
    exists (
      select 1
      from public.notes n
      where n.id = note_chunks.note_id
        and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.notes n
      where n.id = note_chunks.note_id
        and n.user_id = auth.uid()
    )
  );

create or replace function public.match_note_chunks(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_match_threshold double precision default 0.4,
  p_match_count int default 8,
  p_note_ids uuid[] default null
)
returns table (
  chunk_id uuid,
  note_id uuid,
  content text,
  similarity double precision
)
language plpgsql
stable
as $$
begin
  return query
  select
    c.id,
    c.note_id,
    c.content,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.note_chunks c
  join public.notes n on n.id = c.note_id
  where n.user_id = p_user_id
    and (p_note_ids is null or c.note_id = any(p_note_ids))
    and (c.embedding <=> p_query_embedding) <= p_match_threshold
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

grant execute on function public.match_note_chunks(
  uuid,
  vector(1536),
  double precision,
  int,
  uuid[]
) to authenticated;

-- Flashcards -------------------------------------------------------------
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid references public.notes (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  term_zh text,
  term_en text,
  definition_zh text not null,
  definition_en text not null,
  context_zh text,
  context_en text,
  next_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flashcards_user_id_idx on public.flashcards (user_id);
create index if not exists flashcards_next_due_at_idx on public.flashcards (user_id, next_due_at);

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row execute function public.trigger_set_updated_at();

alter table public.flashcards enable row level security;

create policy flashcards_owner_access
  on public.flashcards
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Flashcard reviews ------------------------------------------------------
create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  response text not null check (response in ('again', 'hard', 'good', 'easy')),
  next_due_at timestamptz not null,
  interval_days int not null
);

create index if not exists flashcard_reviews_flashcard_id_idx on public.flashcard_reviews (flashcard_id);
create index if not exists flashcard_reviews_user_id_idx on public.flashcard_reviews (user_id);

alter table public.flashcard_reviews enable row level security;

create policy flashcard_reviews_owner_access
  on public.flashcard_reviews
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tasks ------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null check (status in ('todo', 'doing', 'done')),
  due_date date,
  folder_id uuid references public.folders (id) on delete set null,
  note_id uuid references public.notes (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_idx on public.tasks (user_id, status);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.trigger_set_updated_at();

alter table public.tasks enable row level security;

create policy tasks_owner_access
  on public.tasks
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pomodoro sessions ------------------------------------------------------
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('completed', 'interrupted')),
  duration_min int not null check (duration_min > 0)
);

create index if not exists pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);
create index if not exists pomodoro_sessions_started_at_idx on public.pomodoro_sessions (user_id, started_at);

alter table public.pomodoro_sessions enable row level security;

create policy pomodoro_sessions_owner_access
  on public.pomodoro_sessions
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
