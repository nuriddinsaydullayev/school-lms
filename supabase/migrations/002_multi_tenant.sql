-- 1. Create schools table
create table public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subdomain text unique not null,
  created_at timestamptz not null default now()
);

-- Enable RLS for schools
alter table public.schools enable row level security;
create policy "Schools are viewable by everyone" on public.schools for select to authenticated, anon using (true);

-- 2. Add school_id foreign key to all tenant-scoped tables
alter table public.profiles add column school_id uuid references public.schools(id) on delete cascade;
alter table public.classes add column school_id uuid references public.schools(id) on delete cascade;
alter table public.class_enrollments add column school_id uuid references public.schools(id) on delete cascade;
alter table public.assignments add column school_id uuid references public.schools(id) on delete cascade;
alter table public.submissions add column school_id uuid references public.schools(id) on delete cascade;
alter table public.tokens add column school_id uuid references public.schools(id) on delete cascade;
alter table public.ai_tutor_logs add column school_id uuid references public.schools(id) on delete cascade;

-- 3. Recreate the token_balances view to include school_id
drop view if exists public.token_balances;
create view public.token_balances as
  select
    student_id,
    school_id,
    sum(
      case
        when type in ('earned', 'bonus') then amount
        when type = 'spent'             then -amount
      end
    ) as balance,
    sum(case when type in ('earned','bonus') then amount else 0 end) as total_earned,
    sum(case when type = 'spent'            then amount else 0 end)  as total_spent
  from public.tokens
  group by student_id, school_id;

-- 4. Update handle_new_user trigger to read school_id from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, school_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    (new.raw_user_meta_data ->> 'school_id')::uuid -- Extracts school_id upon signup
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5. Helper function to fetch the current user's school_id
create or replace function public.get_my_school_id()
returns uuid
language sql
stable
security definer
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

-- 6. Set default values for inserts so Server Actions don't need manual changes
alter table public.classes alter column school_id set default public.get_my_school_id();
alter table public.class_enrollments alter column school_id set default public.get_my_school_id();
alter table public.assignments alter column school_id set default public.get_my_school_id();
alter table public.submissions alter column school_id set default public.get_my_school_id();
alter table public.tokens alter column school_id set default public.get_my_school_id();
alter table public.ai_tutor_logs alter column school_id set default public.get_my_school_id();

-- 7. Add RESTRICTIVE policies for unbreakable multi-tenancy isolation.
create policy "Tenant Isolation" on public.profiles as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.classes as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.class_enrollments as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.assignments as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.submissions as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.tokens as restrictive for all to authenticated using (school_id = public.get_my_school_id());
create policy "Tenant Isolation" on public.ai_tutor_logs as restrictive for all to authenticated using (school_id = public.get_my_school_id());
