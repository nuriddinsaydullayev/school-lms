-- ============================================================
-- 008_teacher_profile_and_schedule_teacher.sql
--  1. Extended teacher profile fields (phone, qualifications, subjects_taught)
--  2. Per-slot instructor mapping on class_schedules (teacher_id)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES: professional fields
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists phone           text,
  add column if not exists qualifications  text,
  add column if not exists subjects_taught text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_phone_len;
alter table public.profiles
  add constraint profiles_phone_len check (phone is null or char_length(phone) <= 32);

alter table public.profiles drop constraint if exists profiles_qualifications_len;
alter table public.profiles
  add constraint profiles_qualifications_len check (qualifications is null or char_length(qualifications) <= 1000);

-- 006 revoked blanket UPDATE and re-granted only (full_name, avatar_url, bio).
-- Extend the column-level grant so users can edit their own new fields
-- (row ownership is still enforced by the "profiles: user can update own" policy).
grant update (phone, qualifications, subjects_taught) on public.profiles to authenticated;


-- ─────────────────────────────────────────────────────────────
-- 2. CLASS_SCHEDULES: per-slot instructor
-- A class (e.g. "10-A") has many subjects taught by different teachers,
-- so the instructor must live on the slot, not only on the class.
-- ─────────────────────────────────────────────────────────────
alter table public.class_schedules
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_class_schedules_teacher_day
  on public.class_schedules(teacher_id, day_of_week, start_time);

-- Backfill conservatively: only assign the class owner to slots whose subject
-- matches the class's own subject. Other legacy slots stay NULL ("Unassigned")
-- so teachers no longer see periods they don't actually teach.
update public.class_schedules cs
set    teacher_id = c.teacher_id
from   public.classes c
where  cs.class_id = c.id
  and  cs.teacher_id is null
  and  c.subject is not null
  and  lower(trim(cs.subject)) = lower(trim(c.subject));
