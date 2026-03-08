-- ============================================================
-- Phase 7: Feed metrics and A/B testing
-- ============================================================

create table feed_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  experiment_group text not null default 'control',
  metric_type text not null,
  value jsonb not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create index idx_feed_metrics_user on feed_metrics(user_id, date);
create index idx_feed_metrics_experiment on feed_metrics(experiment_group, metric_type, date);

alter table feed_metrics enable row level security;
create policy "Users can insert own metrics" on feed_metrics for insert with check (auth.uid() = user_id);

-- ============================================================
-- Phase 6: Review cards for spaced repetition (FSRS)
-- ============================================================

create table review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  clip_id uuid not null references public.clips(id) on delete cascade,
  problem_topic text not null,
  card_state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, clip_id)
);

create index idx_review_cards_user on review_cards(user_id);
create index idx_review_cards_clip on review_cards(clip_id);

alter table review_cards enable row level security;
create policy "Users can manage own review cards" on review_cards
  for all using (auth.uid() = user_id);
