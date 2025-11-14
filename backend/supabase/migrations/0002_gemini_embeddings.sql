-- Switch pgvector storage to Gemini embeddings (1536 dims)
begin;

truncate table public.note_chunks;

drop index if exists note_chunks_embedding_idx;

alter table public.note_chunks drop column embedding;
alter table public.note_chunks add column embedding vector(1536) not null;

-- Use hnsw index (dim <= 2000 is allowed)
create index if not exists note_chunks_embedding_idx
  on public.note_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

drop function if exists public.match_note_chunks(
  uuid,
  vector(1536),
  double precision,
  int,
  uuid[]
);

create function public.match_note_chunks(
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
)
to authenticated;

commit;
