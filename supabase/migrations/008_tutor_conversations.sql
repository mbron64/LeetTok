-- ============================================================
-- AI Tutor: conversation persistence per clip
-- ============================================================

create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  clip_id uuid references public.clips not null,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, clip_id)
);

alter table public.tutor_conversations enable row level security;
create policy "Users can read own conversations" on public.tutor_conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.tutor_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.tutor_conversations for update using (auth.uid() = user_id);
