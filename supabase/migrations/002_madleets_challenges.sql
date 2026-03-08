-- ============================================================
-- MadLeets Phase 2: Interactive challenges schema
-- ============================================================

-- -----------------------------------------------------------
-- challenges
-- -----------------------------------------------------------
create table public.challenges (
  id                 uuid primary key default gen_random_uuid(),
  clip_id            uuid references public.clips(id) on delete cascade,
  problem_id         uuid references public.problems(id),
  language           text not null default 'python',
  code_block         text not null,
  blank_line_index   int not null,
  blank_line_content text not null,
  accepted_answers   text[] not null,
  hint               text,
  explanation        text,
  difficulty         text check (difficulty in ('easy', 'medium', 'hard')),
  pause_timestamp    float not null,
  xp_value           int not null default 10,
  tags               text[],
  created_at         timestamptz default now()
);

-- -----------------------------------------------------------
-- challenge_attempts
-- -----------------------------------------------------------
create table public.challenge_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id),
  challenge_id  uuid references public.challenges(id),
  user_answer   text not null,
  is_correct    boolean not null,
  time_taken_ms int,
  attempted_at  timestamptz default now()
);

-- -----------------------------------------------------------
-- user_progress
-- -----------------------------------------------------------
create table public.user_progress (
  user_id              uuid references public.users(id) primary key,
  total_xp             int default 0,
  current_streak       int default 0,
  longest_streak       int default 0,
  challenges_completed int default 0,
  challenges_correct   int default 0,
  last_challenge_at    timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_challenges_clip_id            on public.challenges(clip_id);
create index idx_challenges_problem_id         on public.challenges(problem_id);
create index idx_challenge_attempts_user_id    on public.challenge_attempts(user_id);
create index idx_challenge_attempts_challenge   on public.challenge_attempts(challenge_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- challenges: anyone can read
alter table public.challenges enable row level security;
create policy "challenges_select" on public.challenges
  for select using (true);

-- challenge_attempts: users insert & read their own
alter table public.challenge_attempts enable row level security;
create policy "challenge_attempts_select" on public.challenge_attempts
  for select using (auth.uid() = user_id);
create policy "challenge_attempts_insert" on public.challenge_attempts
  for insert with check (auth.uid() = user_id);

-- user_progress: users read & update their own
alter table public.user_progress enable row level security;
create policy "user_progress_select" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "user_progress_update" on public.user_progress
  for update using (auth.uid() = user_id);
create policy "user_progress_insert" on public.user_progress
  for insert with check (auth.uid() = user_id);
