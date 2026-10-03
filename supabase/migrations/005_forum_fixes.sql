-- ============================================================
-- 005_forum_fixes.sql
-- Forum: grade grouping, opt-in AI grading, escrow/status
-- tracking, and hardened RLS.
-- ============================================================

-- ── 1. New columns ─────────────────────────────────────────────
alter table public.forum_questions
  add column if not exists target_grade    smallint    check (target_grade between 1 and 11),
  add column if not exists is_ai_graded    boolean     not null default false,
  add column if not exists status          text        not null default 'open'
                                                       check (status in ('open', 'solved', 'closed')),
  add column if not exists bounty_escrowed boolean     not null default false,
  add column if not exists closed_at       timestamptz;

comment on column public.forum_questions.target_grade    is 'Grade the question is aimed at (1–11). NULL = all grades.';
comment on column public.forum_questions.is_ai_graded    is 'Author opted in: Gemini grades the accepted answer and scales the bounty.';
comment on column public.forum_questions.status          is 'open → solved (answer accepted) | closed (author closed & reclaimed bounty).';
comment on column public.forum_questions.bounty_escrowed is 'TRUE only when the server deducted the bounty from the author at ask-time. Refunds require this.';

-- Backfill status for any legacy rows
update public.forum_questions set status = 'solved' where solved = true and status = 'open';

-- ── 2. Indexes & integrity ─────────────────────────────────────
create index if not exists forum_questions_school_grade_idx
  on public.forum_questions (school_id, target_grade, created_at desc);

create index if not exists forum_answers_question_idx
  on public.forum_answers (question_id);

-- DB-level guarantee: at most ONE accepted answer per question
create unique index if not exists forum_answers_one_accepted_per_question
  on public.forum_answers (question_id) where is_accepted;

-- ── 3. Harden get_my_school_id (security definer needs a fixed search_path)
alter function public.get_my_school_id() set search_path = public;

-- ── 4. RLS: forum_questions ────────────────────────────────────
drop policy if exists "forum_questions: read own school"     on public.forum_questions;
drop policy if exists "forum_questions: insert own school"   on public.forum_questions;
drop policy if exists "forum_questions: update own question" on public.forum_questions;
drop policy if exists "Tenant Isolation"                     on public.forum_questions;

-- Every authenticated member of the same school can read every question
create policy "forum_questions: school members can read"
  on public.forum_questions for select to authenticated
  using (school_id is not null and school_id = public.get_my_school_id());

-- NOTE: No INSERT / UPDATE / DELETE policies for `authenticated`.
-- All writes go through server code (service role) so the bounty escrow,
-- status transitions and token payouts cannot be forged from the browser.

create policy "Tenant Isolation"
  on public.forum_questions as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());

-- ── 5. RLS: forum_answers ──────────────────────────────────────
drop policy if exists "forum_answers: read own school"   on public.forum_answers;
drop policy if exists "forum_answers: insert own school" on public.forum_answers;
drop policy if exists "forum_answers: update own answer" on public.forum_answers;
drop policy if exists "Tenant Isolation"                 on public.forum_answers;

create policy "forum_answers: school members can read"
  on public.forum_answers for select to authenticated
  using (school_id is not null and school_id = public.get_my_school_id());

-- Students may post answers only to OPEN questions in their school,
-- and can never self-mark an answer as accepted.
create policy "forum_answers: insert to open questions"
  on public.forum_answers for insert to authenticated
  with check (
    author_id   = auth.uid()
    and school_id = public.get_my_school_id()
    and is_accepted = false
    and exists (
      select 1 from public.forum_questions q
      where q.id = question_id and q.status = 'open'
    )
  );

-- No UPDATE policy: accepting is done server-side only.

create policy "Tenant Isolation"
  on public.forum_answers as restrictive for all to authenticated
  using (school_id = public.get_my_school_id());

-- ── 6. Diagnostic ──────────────────────────────────────────────
-- Users with a NULL school_id see NOTHING (get_my_school_id() returns NULL).
-- If this returns rows, link those profiles to a school:
--   select id, full_name, role from public.profiles where school_id is null;
