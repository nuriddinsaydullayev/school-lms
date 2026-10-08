/**
 * Token ledger — SERVER ONLY.
 *
 * ⚠️  Do NOT add 'use server' to this file. Every export of a 'use server'
 * module becomes a public POST endpoint callable with arbitrary arguments.
 * These helpers take raw amounts, so they must only be reachable from
 * server actions / route handlers that compute amounts themselves.
 *
 * (Importing '@/utils/supabase/server' pulls in next/headers, which makes
 * any accidental client import fail at build time.)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/server'

type Untyped = SupabaseClient<any, 'public', any>

export type TokenSource =
  | 'homework'
  | 'reward_purchase'
  | 'reward_refund'
  | 'forum_escrow'
  | 'forum_answer'
  | 'forum_refund'
  | 'forum_bonus'
  | 'teacher_grant'
  | 'teacher_deduct'

export interface LedgerEntry {
  studentId:    string
  schoolId:     string | null
  amount:       number
  reason:       string
  source:       TokenSource
  referenceId:  string
  type?:        'earned' | 'bonus'
}

export type GrantResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }     // already paid for this (source, reference)
  | { ok: false; error: string }

export type SpendResult =
  | { ok: true; remainingBalance: number }
  | { ok: false; error: string; insufficient?: boolean }

const MAX_SINGLE_GRANT = 500

function admin(): Untyped {
  return createAdminClient() as unknown as Untyped
}

/** Credit tokens. Idempotent per (student, source, referenceId). */
export async function grantTokens(entry: LedgerEntry): Promise<GrantResult> {
  const amount = Math.floor(entry.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_SINGLE_GRANT) {
    return { ok: false, error: `Invalid grant amount: ${entry.amount}` }
  }

  const { error } = await admin().from('tokens').insert({
    school_id:    entry.schoolId,
    student_id:   entry.studentId,
    type:         entry.type ?? 'earned',
    amount,
    reason:       entry.reason.slice(0, 300),
    source:       entry.source,
    reference_id: entry.referenceId,
  })

  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true }
    console.error('[ledger] grantTokens failed:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, duplicate: false }
}

/** Credit several rows in one statement (all-or-nothing). */
export async function grantTokensBatch(entries: LedgerEntry[]): Promise<GrantResult> {
  const rows = entries.filter((e) => e.amount > 0)
  if (rows.length === 0) return { ok: true, duplicate: false }

  for (const e of rows) {
    if (!Number.isFinite(e.amount) || e.amount > MAX_SINGLE_GRANT) {
      return { ok: false, error: `Invalid grant amount: ${e.amount}` }
    }
  }

  const { error } = await admin().from('tokens').insert(
    rows.map((e) => ({
      school_id:    e.schoolId,
      student_id:   e.studentId,
      type:         e.type ?? 'earned',
      amount:       Math.floor(e.amount),
      reason:       e.reason.slice(0, 300),
      source:       e.source,
      reference_id: e.referenceId,
    }))
  )

  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true }
    console.error('[ledger] grantTokensBatch failed:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, duplicate: false }
}

/** Debit tokens atomically (row-locked balance check in Postgres). */
export async function spendTokens(entry: Omit<LedgerEntry, 'type'>): Promise<SpendResult> {
  const amount = Math.floor(entry.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: `Invalid spend amount: ${entry.amount}` }
  }

  const { data, error } = await admin().rpc('spend_tokens', {
    p_student_id:   entry.studentId,
    p_school_id:    entry.schoolId,
    p_amount:       amount,
    p_reason:       entry.reason.slice(0, 300),
    p_source:       entry.source,
    p_reference_id: entry.referenceId,
  })

  if (error) {
    if (error.message?.includes('INSUFFICIENT_TOKENS')) {
      return { ok: false, error: "You don't have enough tokens.", insufficient: true }
    }
    if (error.code === '23505') {
      return { ok: false, error: 'This transaction was already processed.' }
    }
    console.error('[ledger] spendTokens failed:', error.message)
    return { ok: false, error: 'Token transaction failed. Please try again.' }
  }

  return { ok: true, remainingBalance: Number(data ?? 0) }
}

/** Look up the caller's school_id (needed because service-role inserts can't use get_my_school_id()). */
export async function getSchoolId(userId: string): Promise<string | null> {
  const { data } = await admin().from('profiles').select('school_id').eq('id', userId).maybeSingle()
  return (data?.school_id as string | null) ?? null
}
