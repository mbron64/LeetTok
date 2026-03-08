-- ============================================================
-- LeetTok initial schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------
-- problems
-- -----------------------------------------------------------
create table public.problems (
  id         uuid primary key default gen_random_uuid(),
  number     int  not null unique,
  title      text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  topics     text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- clips
-- -----------------------------------------------------------
create table public.clips (
  id               uuid primary key default gen_random_uuid(),
  problem_id       uuid not null references public.problems(id) on delete cascade,
  video_url        text not null,
  title            text not null,
  duration         float,
  transcript       text,
  source_video_url text,
  creator          text,
  hook             text,
  likes_count      int not null default 0,
  bookmarks_count  int not null default 0,
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------
-- user profiles (extends auth.users)
-- -----------------------------------------------------------
create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- bookmarks
-- -----------------------------------------------------------
create table public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  clip_id    uuid not null references public.clips(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, clip_id)
);

-- -----------------------------------------------------------
-- likes
-- -----------------------------------------------------------
create table public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  clip_id    uuid not null references public.clips(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, clip_id)
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_clips_problem_id  on public.clips(problem_id);
create index idx_clips_created_at  on public.clips(created_at desc);
create index idx_bookmarks_user_id on public.bookmarks(user_id);
create index idx_bookmarks_clip_id on public.bookmarks(clip_id);
create index idx_likes_user_id     on public.likes(user_id);
create index idx_likes_clip_id     on public.likes(clip_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- problems: anyone can read
alter table public.problems enable row level security;
create policy "problems_select" on public.problems for select using (true);

-- clips: anyone can read
alter table public.clips enable row level security;
create policy "clips_select" on public.clips for select using (true);

-- users: anyone can read profiles, owners can update their own
alter table public.users enable row level security;
create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- bookmarks: users manage their own
alter table public.bookmarks enable row level security;
create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- likes: users manage their own
alter table public.likes enable row level security;
create policy "likes_select" on public.likes for select using (auth.uid() = user_id);
create policy "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- ============================================================
-- Auto-create user profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
