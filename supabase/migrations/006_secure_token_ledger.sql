-- ============================================================
-- 006_secure_token_ledger.sql
-- Close every path a student could use to mint tokens / XP /
-- vouchers from the browser. All economy writes go through
-- server code using the service-role key.
-- ============================================================

-- ── 1. tokens: provenance column + idempotency ─────────────────
alter table public.tokens add column if not exists source text;

comment on column public.tokens.source is
  'Origin of the ledger row: homework | reward_purchase | reward_refund | forum_escrow | forum_answer | forum_refund | forum_bonus | teacher_grant | teacher_deduct';

-- One payout per (student, source, reference). Stops double-awards from
-- double-clicks, retries and concurrent requests.
create unique index if not exists tokens_idempotency_idx
  on public.tokens (student_id, source, reference_id)
  where source is not null and reference_id is not null;

-- ── 2. tokens: RLS — students can no longer INSERT ─────────────
drop policy if exists "tokens: teacher or student can insert" on public.tokens;
drop policy if exists "tokens: teachers can grant to own school students" on public.tokens;

-- Teachers may grant/deduct for STUDENTS in their own school only,
-- never for themselves, max 100 tokens per row.
create policy "tokens: teachers can grant to own school students"
  on public.tokens for insert to authenticated
  with check (
    public.get_my_role() = 'teacher'
    and student_id <> auth.uid()
    and amount <= 100
    and type in ('earned', 'bonus', 'spent')
    and school_id = public.get_my_school_id()
    and exists (
      select 1 from public.profiles p
      where p.id = student_id
        and p.role = 'student'
        and p.school_id = public.get_my_school_id()
    )
  );

-- Table-level privileges as a second wall (RLS + GRANT both must pass)
revoke update, delete, truncate on public.tokens from anon, authenticated;
revoke insert on public.tokens from anon;

-- ── 3. Atomic spend: lock per student, check balance, insert ───
create or replace function public.spend_tokens(
  p_student_id   uuid,
  p_school_id    uuid,
  p_amount       integer,
  p_reason       text,
  p_source       text,
  p_reference_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  -- Serialise all spends for this student (prevents double-spend races)
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select coalesce(sum(case when type in ('earned', 'bonus') then amount else -amount end), 0)
    into v_balance
    from public.tokens
   where student_id = p_student_id;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_TOKENS' using errcode = 'P0001';
  end if;

  insert into public.tokens (school_id, student_id, type, amount, reason, source, reference_id)
  values (p_school_id, p_student_id, 'spent', p_amount, p_reason, p_source, p_reference_id);

  return v_balance - p_amount;
end;
$$;

revoke all on function public.spend_tokens(uuid, uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens(uuid, uuid, integer, text, text, uuid) to service_role;

-- ── 4. reward_redemptions: students can't forge vouchers ───────
drop policy if exists "reward_redemptions: insert own redemption" on public.reward_redemptions;
revoke insert, update, delete on public.reward_redemptions from anon, authenticated;

alter table public.reward_redemptions add column if not exists item_id text;

-- ── 5. profiles: students can't edit xp_points / level / role / school_id
-- The existing "user can update own" row policy stays; column grants
-- restrict WHICH columns can be changed from the browser.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, avatar_url, bio) on public.profiles to authenticated;

-- ── 6. token_balances: respect caller's RLS (was leaking all schools)
alter view public.token_balances set (security_invoker = true);
