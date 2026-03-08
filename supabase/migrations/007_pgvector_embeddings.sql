-- ============================================================
-- Recommendation Engine: pgvector embeddings for clips
-- ============================================================

create extension if not exists vector with schema extensions;

alter table public.clips add column if not exists embedding extensions.vector(384);

create index if not exists idx_clips_embedding on public.clips
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- Similar clips by embedding (cosine similarity)
-- ============================================================

create or replace function public.similar_clips(
  query_embedding extensions.vector(384),
  limit_n int default 20
)
returns table (clip_id uuid, similarity float)
language plpgsql
stable
set search_path = 'public', 'extensions'
as $$
begin
  return query
    select id, 1 - (embedding <=> query_embedding) as similarity
    from public.clips
    where embedding is not null
    order by embedding <=> query_embedding
    limit limit_n;
end;
$$;
