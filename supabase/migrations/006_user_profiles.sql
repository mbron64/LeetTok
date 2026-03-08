-- ============================================================
-- Recommendation Engine: user interest profiles
-- ============================================================

create table public.user_profiles (
  user_id uuid references public.users(id) on delete cascade primary key,
  topic_weights jsonb default '{}',
  difficulty_preference text default 'medium',
  skill_levels jsonb default '{}',
  engagement_pattern jsonb default '{}',
  experiment_group text default 'control',
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.user_profiles enable row level security;

create policy "Users can read own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = user_id);
