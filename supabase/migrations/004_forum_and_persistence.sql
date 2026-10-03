-- ============================================================
-- 004_forum_and_persistence.sql
-- Missing tables for Forum, Redemptions, and Planner persistence
-- ============================================================

-- 1. FORUM QUESTIONS
create table if not exists public.forum_questions (
  id          uuid        primary key default uuid_generate_v4(),
  school_id   uuid        not null references public.schools(id) on delete cascade default public.get_my_school_id(),
  author_id   uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  body        text,
  subject     text        not null default 'General',
  bounty      integer     not null default 10 check (bounty >= 0),
  solved      boolean     not null default false,
  views       integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.forum_questions enable row level security;

create policy "forum_questions: read own school"
  on public.forum_questions for select to authenticated
  using (school_id = public.get_my_school_id());

create policy "forum_questions: insert own school"
  on public.forum_questions for insert to authenticated
  with check (school_id = public.get_my_school_id() and author_id = auth.uid());

create policy "forum_questions: update own question"
  on public.forum_questions for update to authenticated
  using (author_id = auth.uid());

create policy "Tenant Isolation"
  on public.forum_questions as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());


-- 2. FORUM ANSWERS
create table if not exists public.forum_answers (
  id           uuid        primary key default uuid_generate_v4(),
  school_id    uuid        not null references public.schools(id) on delete cascade default public.get_my_school_id(),
  question_id  uuid        not null references public.forum_questions(id) on delete cascade,
  author_id    uuid        not null references public.profiles(id) on delete cascade,
  body         text        not null,
  likes        integer     not null default 0,
  is_accepted  boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.forum_answers enable row level security;

create policy "forum_answers: read own school"
  on public.forum_answers for select to authenticated
  using (school_id = public.get_my_school_id());

create policy "forum_answers: insert own school"
  on public.forum_answers for insert to authenticated
  with check (school_id = public.get_my_school_id() and author_id = auth.uid());

create policy "forum_answers: update own answer"
  on public.forum_answers for update to authenticated
  using (author_id = auth.uid() or exists (
    select 1 from public.forum_questions q
    where q.id = question_id and q.author_id = auth.uid()
  ));

create policy "Tenant Isolation"
  on public.forum_answers as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());


-- 3. REWARD REDEMPTIONS (Purchase log & vouchers)
create table if not exists public.reward_redemptions (
  id           uuid        primary key default uuid_generate_v4(),
  school_id    uuid        not null references public.schools(id) on delete cascade default public.get_my_school_id(),
  student_id   uuid        not null references public.profiles(id) on delete cascade,
  item_name    text        not null,
  cost         integer     not null check (cost > 0),
  voucher_code text        unique not null,
  status       text        not null default 'active' check (status in ('active', 'used', 'expired')),
  created_at   timestamptz not null default now()
);

alter table public.reward_redemptions enable row level security;

create policy "reward_redemptions: read own redemptions"
  on public.reward_redemptions for select to authenticated
  using (student_id = auth.uid() or public.get_my_role() = 'teacher');

create policy "reward_redemptions: insert own redemption"
  on public.reward_redemptions for insert to authenticated
  with check (student_id = auth.uid() and school_id = public.get_my_school_id());

create policy "Tenant Isolation"
  on public.reward_redemptions as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());


-- 4. PLANNER SETTINGS (Custom study slots per student)
create table if not exists public.planner_settings (
  id          uuid        primary key default uuid_generate_v4(),
  school_id   uuid        not null references public.schools(id) on delete cascade default public.get_my_school_id(),
  student_id  uuid        not null references public.profiles(id) on delete cascade unique,
  slots       jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.planner_settings enable row level security;

create policy "planner_settings: select own"
  on public.planner_settings for select to authenticated
  using (student_id = auth.uid());

create policy "planner_settings: insert own"
  on public.planner_settings for insert to authenticated
  with check (student_id = auth.uid() and school_id = public.get_my_school_id());

create policy "planner_settings: update own"
  on public.planner_settings for update to authenticated
  using (student_id = auth.uid());

create policy "Tenant Isolation"
  on public.planner_settings as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());
