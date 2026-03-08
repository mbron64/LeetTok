-- ============================================================
-- Solutions table for problem approaches
-- ============================================================

create table solutions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references problems not null,
  approach_name text not null,
  language text not null,
  code text not null,
  explanation text not null,
  time_complexity text,
  space_complexity text,
  sort_order int not null default 0
);

alter table solutions enable row level security;
create policy "Anyone can read solutions" on solutions for select using (true);
