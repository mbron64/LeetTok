-- ============================================================
-- Recommendation Engine: interactions and impressions
-- ============================================================

-- -----------------------------------------------------------
-- interactions
-- -----------------------------------------------------------
create table public.interactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  clip_id          uuid not null references public.clips(id) on delete cascade,
  interaction_type text not null,
  value            jsonb,
  created_at       timestamptz not null default now()
);

create index idx_interactions_user on public.interactions(user_id, created_at desc);
create index idx_interactions_clip on public.interactions(clip_id);

-- -----------------------------------------------------------
-- impressions
-- -----------------------------------------------------------
create table public.impressions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users(id) on delete cascade,
  clip_id   uuid not null references public.clips(id) on delete cascade,
  shown_at  timestamptz not null default now()
);

create index idx_impressions_user on public.impressions(user_id, shown_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

-- interactions: users can insert and read their own
alter table public.interactions enable row level security;
create policy "interactions_select" on public.interactions
  for select using (auth.uid() = user_id);
create policy "interactions_insert" on public.interactions
  for insert with check (auth.uid() = user_id);

-- impressions: users can insert and read their own
alter table public.impressions enable row level security;
create policy "impressions_select" on public.impressions
  for select using (auth.uid() = user_id);
create policy "impressions_insert" on public.impressions
  for insert with check (auth.uid() = user_id);
