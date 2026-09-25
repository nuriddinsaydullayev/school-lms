-- ============================================================
-- seed.sql
-- AI-Powered School LMS — Mock Seed Data
--
-- HOW TO USE:
--   1. Go to your Supabase project → Authentication → Users
--   2. Create 3 users manually (or via Admin API) with these emails:
--        teacher@school.dev   (set metadata: role=teacher, full_name=Ms. Aisha Raza)
--        student1@school.dev  (set metadata: role=student, full_name=Ali Hassan)
--        student2@school.dev  (set metadata: role=student, full_name=Sara Khan)
--   3. Copy the UUID shown for each user in the Auth dashboard.
--   4. Replace the three placeholder values below with the real UUIDs.
--   5. Run this entire script in the Supabase SQL Editor.
--
--   The profiles rows may already exist (created by the handle_new_user trigger).
--   All inserts use ON CONFLICT so the script is safe to re-run.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 0 ─ Set your real UUIDs here
-- ─────────────────────────────────────────────────────────────
do $$
begin
  -- ⚠️  Replace these with the real UUIDs from your Supabase Auth dashboard
  perform set_config('seed.teacher_id',  'aaaaaaaa-0000-0000-0000-000000000001', false);
  perform set_config('seed.student1_id', 'bbbbbbbb-0000-0000-0000-000000000002', false);
  perform set_config('seed.student2_id', 'cccccccc-0000-0000-0000-000000000003', false);
end $$;


-- ─────────────────────────────────────────────────────────────
-- STEP 1 ─ Profiles
-- ─────────────────────────────────────────────────────────────
insert into public.profiles (id, role, full_name, bio, xp_points, level)
values
  -- Teacher
  (
    current_setting('seed.teacher_id')::uuid,
    'teacher',
    'Ms. Aisha Raza',
    'Mathematics & Science teacher with 10 years of experience. Passionate about making STEM fun.',
    0,
    1
  ),
  -- Student 1
  (
    current_setting('seed.student1_id')::uuid,
    'student',
    'Ali Hassan',
    'Loves coding, robotics, and competitive math.',
    340,
    4
  ),
  -- Student 2
  (
    current_setting('seed.student2_id')::uuid,
    'student',
    'Sara Khan',
    'Aspiring data scientist with a passion for statistics.',
    210,
    3
  )
on conflict (id) do update
  set
    role      = excluded.role,
    full_name = excluded.full_name,
    bio       = excluded.bio,
    xp_points = excluded.xp_points,
    level     = excluded.level;


-- ─────────────────────────────────────────────────────────────
-- STEP 2 ─ Class
-- ─────────────────────────────────────────────────────────────
insert into public.classes (id, teacher_id, name, description, subject, join_code, is_active)
values (
  'd1d1d1d1-0000-0000-0000-000000000010',
  current_setting('seed.teacher_id')::uuid,
  'Grade 9 — Mathematics',
  'Covers algebra, geometry, and an introduction to calculus. Weekly quizzes and AI-assisted homework.',
  'Mathematics',
  'MATH9A',
  true
)
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- STEP 3 ─ Enrollments (both students join the class)
-- ─────────────────────────────────────────────────────────────
insert into public.class_enrollments (class_id, student_id)
values
  ('d1d1d1d1-0000-0000-0000-000000000010', current_setting('seed.student1_id')::uuid),
  ('d1d1d1d1-0000-0000-0000-000000000010', current_setting('seed.student2_id')::uuid)
on conflict (class_id, student_id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- STEP 4 ─ Assignments
--   • Assignment 1 — published, past due date (graded)
--   • Assignment 2 — published, upcoming
--   • Assignment 3 — draft (not published, students cannot see it)
-- ─────────────────────────────────────────────────────────────
insert into public.assignments
  (id, class_id, teacher_id, title, description, due_date, max_score,
   xp_reward, token_reward, is_published, ai_hints_enabled)
values

  -- Assignment 1: published & already graded
  (
    'e1e1e1e1-0000-0000-0000-000000000020',
    'd1d1d1d1-0000-0000-0000-000000000010',
    current_setting('seed.teacher_id')::uuid,
    'Algebra Basics Quiz',
    'Solve 10 linear equations and show all working steps. '
      'Use the AI Tutor if you get stuck — it will give you hints, not answers!',
    now() - interval '3 days',   -- already past due
    100,
    80,
    15,
    true,
    true
  ),

  -- Assignment 2: published, upcoming
  (
    'e2e2e2e2-0000-0000-0000-000000000021',
    'd1d1d1d1-0000-0000-0000-000000000010',
    current_setting('seed.teacher_id')::uuid,
    'Geometry: Area & Perimeter',
    'Calculate the area and perimeter of 8 mixed shapes (rectangles, triangles, circles). '
      'Show formulas and substitution steps.',
    now() + interval '7 days',
    50,
    50,
    10,
    true,
    true
  ),

  -- Assignment 3: draft — invisible to students via RLS
  (
    'e3e3e3e3-0000-0000-0000-000000000022',
    'd1d1d1d1-0000-0000-0000-000000000010',
    current_setting('seed.teacher_id')::uuid,
    'Intro to Calculus (Draft)',
    'Limits and derivatives — first look. Work in progress.',
    now() + interval '21 days',
    100,
    100,
    20,
    false,   -- NOT published
    true
  )

on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- STEP 5 ─ Submissions
--   • Ali   → Assignment 1 → graded (score 88)
--   • Sara  → Assignment 1 → submitted but not yet graded
-- ─────────────────────────────────────────────────────────────
insert into public.submissions
  (assignment_id, student_id, status, content, score, feedback, submitted_at, graded_at)
values

  -- Ali's graded submission
  (
    'e1e1e1e1-0000-0000-0000-000000000020',
    current_setting('seed.student1_id')::uuid,
    'graded',
    '1) x=3  2) x=7  3) x=-2  4) x=11  5) x=0  '
      '6) x=5  7) x=-4  8) x=8  9) x=1  10) x=-9',
    88,
    'Great work Ali! Minor arithmetic error on question 4 — double-check your sign when dividing. '
      'Overall excellent effort.',
    now() - interval '2 days',
    now() - interval '1 day'
  ),

  -- Sara's pending-grade submission
  (
    'e1e1e1e1-0000-0000-0000-000000000020',
    current_setting('seed.student2_id')::uuid,
    'submitted',
    '1) x=3  2) x=7  3) x=-2  4) x=11  5) x=0  '
      '6) x=5  7) x=-4  8) x=9  9) x=1  10) x=-9',
    null,
    null,
    now() - interval '18 hours',
    null
  )

on conflict (assignment_id, student_id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- STEP 6 ─ Tokens (gamification ledger)
--
--   Ali:   earned 15 (submission) + 5 bonus (high score) − 10 spent = 10 balance
--   Sara:  earned 15 (submission)                                   = 15 balance
-- ─────────────────────────────────────────────────────────────
insert into public.tokens (student_id, type, amount, reason, reference_id)
values

  -- Ali: earned tokens for submitting Assignment 1
  (
    current_setting('seed.student1_id')::uuid,
    'earned',
    15,
    'Submitted: Algebra Basics Quiz',
    'e1e1e1e1-0000-0000-0000-000000000020'
  ),

  -- Ali: bonus for scoring ≥ 85%
  (
    current_setting('seed.student1_id')::uuid,
    'bonus',
    5,
    'High Score Bonus — scored 88% on Algebra Basics Quiz',
    'e1e1e1e1-0000-0000-0000-000000000020'
  ),

  -- Ali: spent tokens at the reward store
  (
    current_setting('seed.student1_id')::uuid,
    'spent',
    10,
    'Redeemed: Extra AI Hint Token pack',
    null
  ),

  -- Sara: earned tokens for submitting Assignment 1
  (
    current_setting('seed.student2_id')::uuid,
    'earned',
    15,
    'Submitted: Algebra Basics Quiz',
    'e1e1e1e1-0000-0000-0000-000000000020'
  );


-- ─────────────────────────────────────────────────────────────
-- STEP 7 ─ AI Tutor Logs
-- ─────────────────────────────────────────────────────────────
insert into public.ai_tutor_logs
  (student_id, assignment_id, prompt, response, model, tokens_used)
values

  -- Ali asked for help on a linear equation
  (
    current_setting('seed.student1_id')::uuid,
    'e1e1e1e1-0000-0000-0000-000000000020',
    'Can you explain how to solve 2x + 4 = 10 step by step?',
    E'Sure! Here''s a step-by-step guide:\n\n'
      '**Step 1:** Subtract 4 from both sides to isolate the term with x.\n'
      '  2x + 4 − 4 = 10 − 4  →  2x = 6\n\n'
      '**Step 2:** Divide both sides by 2.\n'
      '  2x ÷ 2 = 6 ÷ 2  →  x = 3 ✅\n\n'
      '**Tip:** Always do the same operation to both sides to keep the equation balanced!',
    'gemini-2.0-flash',
    148
  ),

  -- Sara asked a conceptual question
  (
    current_setting('seed.student2_id')::uuid,
    'e1e1e1e1-0000-0000-0000-000000000020',
    'What does a negative solution mean in a linear equation?',
    E'Great question! A negative solution simply means the variable''s value is less than zero — '
      'and that''s perfectly valid mathematically.\n\n'
      'For example, if x = −3, it means you would substitute −3 wherever x appears, '
      'and the equation will still balance.\n\n'
      '**Real-world analogy:** Think of x as temperature. A negative temperature is cold, '
      'but it''s still a real, meaningful value! 🌡️',
    'gemini-2.0-flash',
    112
  );


-- ─────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- Uncomment and run these after seeding to confirm correctness.
-- ─────────────────────────────────────────────────────────────

-- Check all profiles
-- select id, role, full_name, xp_points, level from public.profiles;

-- Check token balances (Ali = 10, Sara = 15)
-- select p.full_name, tb.balance, tb.total_earned, tb.total_spent
-- from public.token_balances tb
-- join public.profiles p on p.id = tb.student_id;

-- Confirm unpublished assignment is NOT visible (should return 0 rows for student login)
-- select * from public.assignments where is_published = false;

-- Check submission statuses
-- select
--   p.full_name,
--   a.title,
--   s.status,
--   s.score
-- from public.submissions s
-- join public.profiles p on p.id = s.student_id
-- join public.assignments a on a.id = s.assignment_id;
