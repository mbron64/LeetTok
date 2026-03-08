-- ============================================================
-- AI Tutor: usage tracking and clips code_snippets
-- ============================================================

-- -----------------------------------------------------------
-- tutor_usage
-- -----------------------------------------------------------
create table public.tutor_usage (
  user_id      uuid references auth.users not null,
  date         date not null default current_date,
  message_count int not null default 0,
  primary key (user_id, date)
);

-- -----------------------------------------------------------
-- clips: add code_snippets column
-- -----------------------------------------------------------
alter table public.clips add column if not exists code_snippets text[] default '{}';

-- ============================================================
-- Row Level Security: tutor_usage
-- -----------------------------------------------------------
alter table public.tutor_usage enable row level security;

-- Users can read their own usage (for showing remaining count in UI)
create policy "tutor_usage_select" on public.tutor_usage
  for select using (auth.uid() = user_id);

-- Note: INSERT/UPDATE are done by the Edge Function using the service role,
-- which bypasses RLS. Users cannot directly modify their own usage.

-- -----------------------------------------------------------
-- RPC: increment tutor usage (called by Edge Function)
-- -----------------------------------------------------------
create or replace function public.increment_tutor_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tutor_usage (user_id, date, message_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date) do update
  set message_count = tutor_usage.message_count + 1;
end;
$$;
