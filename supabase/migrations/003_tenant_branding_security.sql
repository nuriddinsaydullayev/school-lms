-- ============================================================
-- 003_tenant_branding_security.sql
-- Multi-tenant invite codes + per-school reward store
-- ============================================================

-- 1. Add invite_code to schools
--    Generate a random 8-char uppercase code as the default.
alter table public.schools
  add column if not exists invite_code text unique
    not null default upper(substring(md5(random()::text), 1, 8));

-- 2. Create the rewards store catalogue table (per-school items)
create table if not exists public.reward_items (
  id           uuid        primary key default uuid_generate_v4(),
  school_id    uuid        not null references public.schools(id) on delete cascade,
  name         text        not null,
  description  text,
  icon         text        not null default '🎁',
  cost         integer     not null check (cost > 0),
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.reward_items is
  'School-specific items students can purchase with tokens. Each school curates its own catalogue.';

-- Enable RLS
alter table public.reward_items enable row level security;

-- Permissive policy: any authenticated user in the same school can read active items
create policy "reward_items: members can read own school items"
  on public.reward_items
  for select
  to authenticated
  using (
    is_active = true
    and school_id = public.get_my_school_id()
  );

-- Teachers of the same school can manage items
create policy "reward_items: teachers can insert"
  on public.reward_items
  for insert
  to authenticated
  with check (
    school_id = public.get_my_school_id()
    and public.get_my_role() = 'teacher'
  );

create policy "reward_items: teachers can update"
  on public.reward_items
  for update
  to authenticated
  using  (school_id = public.get_my_school_id() and public.get_my_role() = 'teacher')
  with check (school_id = public.get_my_school_id());

create policy "reward_items: teachers can delete"
  on public.reward_items
  for delete
  to authenticated
  using  (school_id = public.get_my_school_id() and public.get_my_role() = 'teacher');

-- Restrictive tenant isolation policy (same pattern as other tables)
create policy "Tenant Isolation"
  on public.reward_items
  as restrictive
  for all
  to authenticated
  using (school_id = public.get_my_school_id());

-- 3. Seed default reward items for any existing schools
--    (safe to run even if no schools exist yet)
insert into public.reward_items (school_id, name, description, icon, cost)
select
  s.id,
  r.name,
  r.description,
  r.icon,
  r.cost
from public.schools s
cross join (values
  ('Gold Avatar Border',   'Show off with a shiny gold border on your profile.',          '✨', 50),
  ('Extra AI Hint',        'Unlock one extra detailed hint from the AI Tutor.',           '💡', 20),
  ('Late Homework Pass',   'Turn in one assignment up to 24 hours late, no penalty.',     '⏳', 200),
  ('Dark Mode Theme',      'Unlock the exclusive dark mode dashboard theme.',             '🌙', 100),
  ('Class Pizza Party',    'Contribute to the class pool for a pizza party reward!',      '🍕', 500)
) as r(name, description, icon, cost)
on conflict do nothing;
