-- ============================================================
-- 001_schema.sql
-- AI-Powered School LMS & Gamification App
-- Supabase / PostgreSQL Schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─────────────────────────────────────────────────────────────
-- CUSTOM ENUM TYPES
-- ─────────────────────────────────────────────────────────────
create type public.user_role        as enum ('student', 'teacher', 'admin');
create type public.submission_status as enum ('pending', 'submitted', 'graded', 'returned');
create type public.token_type       as enum ('earned', 'spent', 'bonus');


-- ─────────────────────────────────────────────────────────────
-- SHARED TRIGGER FUNCTION: auto-set updated_at
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extends auth.users with app-level data.
-- A row is automatically created for every new Supabase auth user
-- via the handle_new_user() trigger below.
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        user_role   not null default 'student',
  full_name   text        not null,
  avatar_url  text,
  bio         text,
  xp_points   integer     not null default 0,
  level       integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles              is 'App-level user profile, extends Supabase auth.users.';
comment on column public.profiles.xp_points   is 'Cumulative XP earned through assignments and activities.';
comment on column public.profiles.level       is 'Derived level (can be updated by a server function or trigger).';

-- Trigger: keep updated_at current
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─── Trigger: auto-create profile on new auth signup ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- TABLE: classes
-- A course/classroom created and owned by a teacher.
-- ─────────────────────────────────────────────────────────────
create table public.classes (
  id          uuid        primary key default uuid_generate_v4(),
  teacher_id  uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  description text,
  subject     text,
  join_code   text        unique not null
                          default upper(substring(md5(random()::text), 1, 6)),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.classes.join_code is
  'Short alphanumeric code students use to self-enroll.';

create trigger classes_set_updated_at
  before update on public.classes
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- TABLE: class_enrollments
-- Junction table — which students belong to which class.
-- ─────────────────────────────────────────────────────────────
create table public.class_enrollments (
  id          uuid        primary key default uuid_generate_v4(),
  class_id    uuid        not null references public.classes(id) on delete cascade,
  student_id  uuid        not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (class_id, student_id)
);


-- ─────────────────────────────────────────────────────────────
-- TABLE: assignments
-- Created by teachers, scoped to a class.
-- ─────────────────────────────────────────────────────────────
create table public.assignments (
  id               uuid        primary key default uuid_generate_v4(),
  class_id         uuid        not null references public.classes(id) on delete cascade,
  teacher_id       uuid        not null references public.profiles(id) on delete cascade,
  title            text        not null,
  description      text,
  due_date         timestamptz,
  max_score        integer     not null default 100,
  xp_reward        integer     not null default 50,
  token_reward     integer     not null default 10,
  is_published     boolean     not null default false,
  ai_hints_enabled boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.assignments.xp_reward    is 'XP awarded to the student on graded submission.';
comment on column public.assignments.token_reward is 'Gamification tokens awarded upon submission.';
comment on column public.assignments.is_published is 'Only published assignments are visible to students.';

create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- TABLE: submissions
-- One row per student per assignment.
-- ─────────────────────────────────────────────────────────────
create table public.submissions (
  id            uuid              primary key default uuid_generate_v4(),
  assignment_id uuid              not null references public.assignments(id) on delete cascade,
  student_id    uuid              not null references public.profiles(id) on delete cascade,
  status        submission_status not null default 'pending',
  content       text,
  file_url      text,
  score         integer,
  feedback      text,
  ai_feedback   text,
  submitted_at  timestamptz,
  graded_at     timestamptz,
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now(),
  unique (assignment_id, student_id)
);

comment on column public.submissions.ai_feedback is 'Auto-generated feedback from the AI grading endpoint.';

create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- TABLE: tokens
-- Append-only gamification currency ledger.
-- Never UPDATE or DELETE rows — always INSERT new entries.
-- ─────────────────────────────────────────────────────────────
create table public.tokens (
  id           uuid        primary key default uuid_generate_v4(),
  student_id   uuid        not null references public.profiles(id) on delete cascade,
  type         token_type  not null,
  amount       integer     not null check (amount > 0),
  reason       text        not null,
  reference_id uuid,                    -- optional FK to assignment/submission id
  created_at   timestamptz not null default now()
);

comment on table public.tokens is
  'Append-only ledger. Use token_balances view to get current balances.';

-- ─── Convenience view: live token balance per student ─────────
create or replace view public.token_balances as
  select
    student_id,
    sum(
      case
        when type in ('earned', 'bonus') then  amount
        when type = 'spent'             then -amount
      end
    )                                           as balance,
    sum(case when type in ('earned','bonus') then amount else 0 end) as total_earned,
    sum(case when type = 'spent'            then amount else 0 end)  as total_spent
  from public.tokens
  group by student_id;


-- ─────────────────────────────────────────────────────────────
-- TABLE: ai_tutor_logs
-- Every AI tutoring query/response is recorded here.
-- ─────────────────────────────────────────────────────────────
create table public.ai_tutor_logs (
  id            uuid        primary key default uuid_generate_v4(),
  student_id    uuid        not null references public.profiles(id) on delete cascade,
  assignment_id uuid        references public.assignments(id) on delete set null,
  prompt        text        not null,
  response      text        not null,
  model         text        not null default 'gemini-2.0-flash',
  tokens_used   integer,
  created_at    timestamptz not null default now()
);

comment on column public.ai_tutor_logs.tokens_used is
  'LLM token usage for cost tracking.';


-- ═════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.classes           enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.assignments       enable row level security;
alter table public.submissions       enable row level security;
alter table public.tokens            enable row level security;
alter table public.ai_tutor_logs     enable row level security;


-- ─── Helper function: get current user's role ─────────────────
-- Called inside RLS policies to avoid repeated sub-selects.
create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: profiles
-- ─────────────────────────────────────────────────────────────

-- Any authenticated user can read any profile (needed for class rosters)
create policy "profiles: authenticated users can read all"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Each user can only update their own profile
create policy "profiles: user can update own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: classes
-- ─────────────────────────────────────────────────────────────

-- All authenticated users can view active classes
create policy "classes: authenticated users can view active"
  on public.classes
  for select
  to authenticated
  using (is_active = true);

-- Only teachers can create a class (and they must be the owner)
create policy "classes: teachers can insert own"
  on public.classes
  for insert
  to authenticated
  with check (
    auth.uid() = teacher_id
    and get_my_role() = 'teacher'
  );

-- Teachers can only update classes they own
create policy "classes: teachers can update own"
  on public.classes
  for update
  to authenticated
  using (auth.uid() = teacher_id and get_my_role() = 'teacher')
  with check (auth.uid() = teacher_id);

-- Teachers can only delete classes they own
create policy "classes: teachers can delete own"
  on public.classes
  for delete
  to authenticated
  using (auth.uid() = teacher_id and get_my_role() = 'teacher');


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: class_enrollments
-- ─────────────────────────────────────────────────────────────

-- Students see their own enrollments; teachers see enrollments in their classes
create policy "enrollments: student sees own, teacher sees class"
  on public.class_enrollments
  for select
  to authenticated
  using (
    auth.uid() = student_id
    or exists (
      select 1 from public.classes c
      where c.id = class_id
        and c.teacher_id = auth.uid()
    )
  );

-- Only students can enroll themselves
create policy "enrollments: student can self-enroll"
  on public.class_enrollments
  for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and get_my_role() = 'student'
  );

-- Students can unenroll themselves; teachers can remove students from their class
create policy "enrollments: student or teacher can delete"
  on public.class_enrollments
  for delete
  to authenticated
  using (
    auth.uid() = student_id
    or exists (
      select 1 from public.classes c
      where c.id = class_id
        and c.teacher_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: assignments
-- ─────────────────────────────────────────────────────────────

-- Students see published assignments for classes they are enrolled in.
-- Teachers always see all their own assignments (including drafts).
create policy "assignments: students see published enrolled, teachers see own"
  on public.assignments
  for select
  to authenticated
  using (
    -- teacher sees their own (any status)
    auth.uid() = teacher_id
    or
    -- student sees published assignments in their enrolled classes
    (
      is_published = true
      and exists (
        select 1 from public.class_enrollments e
        where e.class_id   = assignments.class_id
          and e.student_id = auth.uid()
      )
    )
  );

create policy "assignments: teachers can insert"
  on public.assignments
  for insert
  to authenticated
  with check (
    auth.uid() = teacher_id
    and get_my_role() = 'teacher'
  );

create policy "assignments: teachers can update own"
  on public.assignments
  for update
  to authenticated
  using (auth.uid() = teacher_id and get_my_role() = 'teacher')
  with check (auth.uid() = teacher_id);

create policy "assignments: teachers can delete own"
  on public.assignments
  for delete
  to authenticated
  using (auth.uid() = teacher_id and get_my_role() = 'teacher');


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: submissions
-- ─────────────────────────────────────────────────────────────

-- Students see only their own submissions.
-- Teachers see all submissions for their assignments.
create policy "submissions: student sees own, teacher sees class submissions"
  on public.submissions
  for select
  to authenticated
  using (
    auth.uid() = student_id
    or exists (
      select 1 from public.assignments a
      where a.id         = assignment_id
        and a.teacher_id = auth.uid()
    )
  );

-- Only students can create their own submissions
create policy "submissions: student can insert own"
  on public.submissions
  for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and get_my_role() = 'student'
  );

-- Students can update their own pending/submitted work;
-- Teachers can update to add scores and feedback.
create policy "submissions: student or teacher can update"
  on public.submissions
  for update
  to authenticated
  using (
    auth.uid() = student_id
    or exists (
      select 1 from public.assignments a
      where a.id         = assignment_id
        and a.teacher_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: tokens
-- ─────────────────────────────────────────────────────────────

-- Students see only their own token entries
create policy "tokens: student sees own"
  on public.tokens
  for select
  to authenticated
  using (auth.uid() = student_id);

-- Tokens can be inserted by a teacher (awarding) or by the student
-- themselves via an automated server action (e.g., on submission).
-- Bulk/system inserts should use the service-role key in Server Actions.
create policy "tokens: teacher or student can insert"
  on public.tokens
  for insert
  to authenticated
  with check (
    get_my_role() = 'teacher'
    or auth.uid() = student_id
  );

-- No UPDATE or DELETE policies — the ledger is append-only.
-- Use the service-role key in server-side code for any corrections.


-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES: ai_tutor_logs
-- ─────────────────────────────────────────────────────────────

-- Students see their own logs; teachers see logs tied to their assignments
create policy "ai_tutor_logs: student sees own, teacher sees class logs"
  on public.ai_tutor_logs
  for select
  to authenticated
  using (
    auth.uid() = student_id
    or exists (
      select 1 from public.assignments a
      where a.id         = assignment_id
        and a.teacher_id = auth.uid()
    )
  );

-- Only the student (or service role from API route) inserts logs
create policy "ai_tutor_logs: student can insert own"
  on public.ai_tutor_logs
  for insert
  to authenticated
  with check (auth.uid() = student_id);
