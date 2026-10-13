-- ============================================================
-- 007_class_schedules.sql
-- Create class_schedules table with Tenant Isolation and RLS
-- ============================================================

create table if not exists public.class_schedules (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references public.schools(id) on delete cascade default public.get_my_school_id(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  day_of_week smallint not null check (day_of_week between 1 and 6), -- 1: Monday ... 6: Saturday
  start_time time not null,
  end_time time not null,
  room_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_schedule_time check (start_time < end_time)
);

-- Trigger for auto-updating updated_at
create trigger set_class_schedules_updated_at
  before update on public.class_schedules
  for each row execute procedure public.set_updated_at();

-- Indexes for performance
create index if not exists idx_class_schedules_school_id on public.class_schedules(school_id);
create index if not exists idx_class_schedules_class_id on public.class_schedules(class_id);
create index if not exists idx_class_schedules_day on public.class_schedules(day_of_week);

-- Enable Row Level Security
alter table public.class_schedules enable row level security;

-- 1. Restrictive Policy for Multi-tenant isolation (strict school_id match)
create policy "Tenant Isolation" on public.class_schedules
  as restrictive
  for all
  to authenticated
  using (school_id = public.get_my_school_id());

-- 2. Read Policy: All authenticated users (Admins, Teachers, Students) in the school can view schedules
create policy "View class schedules in school" on public.class_schedules
  for select
  to authenticated
  using (true);

-- 3. Write Policies: Only Admins can insert, update, or delete schedules
create policy "Admins can insert class schedules" on public.class_schedules
  for insert
  to authenticated
  with check (
    public.get_my_role() = 'admin'
  );

create policy "Admins can update class schedules" on public.class_schedules
  for update
  to authenticated
  using (
    public.get_my_role() = 'admin'
  )
  with check (
    public.get_my_role() = 'admin'
  );

create policy "Admins can delete class schedules" on public.class_schedules
  for delete
  to authenticated
  using (
    public.get_my_role() = 'admin'
  );
