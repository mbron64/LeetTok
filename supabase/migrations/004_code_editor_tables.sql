-- ============================================================
-- Code Editor: execution usage, submissions, problem columns
-- ============================================================

-- -----------------------------------------------------------
-- code_execution_usage
-- -----------------------------------------------------------
create table public.code_execution_usage (
  user_id         uuid references auth.users not null,
  date            date not null default current_date,
  submission_count int not null default 0,
  primary key (user_id, date)
);

-- -----------------------------------------------------------
-- submissions
-- -----------------------------------------------------------
create table public.submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  problem_id       uuid references public.problems not null,
  code             text not null,
  language         text not null,
  status           text not null,
  runtime_ms       int,
  memory_kb        int,
  test_cases_passed int not null default 0,
  test_cases_total  int not null default 0,
  created_at       timestamptz default now()
);

create index idx_submissions_user_problem on public.submissions(user_id, problem_id);

-- -----------------------------------------------------------
-- problems: add code editor columns
-- -----------------------------------------------------------
alter table public.problems add column if not exists starter_code jsonb default '{}';
alter table public.problems add column if not exists test_cases jsonb default '[]';
alter table public.problems add column if not exists constraints text[];
alter table public.problems add column if not exists function_signature jsonb default '{}';

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.code_execution_usage enable row level security;

create policy "code_execution_usage_select" on public.code_execution_usage
  for select using (auth.uid() = user_id);

-- INSERT/UPDATE done by Edge Function via service role (bypasses RLS)

alter table public.submissions enable row level security;

create policy "submissions_select" on public.submissions
  for select using (auth.uid() = user_id);

create policy "submissions_insert" on public.submissions
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- RPC: increment code execution usage (called by Edge Function)
-- ============================================================
create or replace function public.increment_code_execution_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.code_execution_usage (user_id, date, submission_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date) do update
  set submission_count = code_execution_usage.submission_count + 1;
end;
$$;
