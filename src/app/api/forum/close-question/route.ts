import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import {
  CLOSE_AFTER_HOURS,
  MAX_BONUS_CLAIMS_PER_WEEK,
  hardQuestionBonus,
  type CloseResult,
} from '@/types/forum'

type Untyped = SupabaseClient<any, 'public', any>

const BONUS_REASON_PREFIX = 'Hard question bonus'

function json(body: CloseResult, status = 200) {
  return NextResponse.json(body, { status })
}

// ── POST /api/forum/close-question ────────────────────────────────────────────
// Body: { questionId }
// Author closes an unresolved question after 24h → escrowed bounty refunded.
// Bonus only if NOBODY else answered (proof it was hard), rate-limited weekly.
export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ success: false, error: 'Unauthorized' }, 401)

  let questionId: string
  try {
    ;({ questionId } = await req.json())
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400)
  }
  if (!questionId) return json({ success: false, error: 'questionId is required' }, 400)

  const userDb = supabase as unknown as Untyped

  const { data: q } = await userDb
    .from('forum_questions')
    .select('id, school_id, author_id, title, bounty, status, bounty_escrowed, created_at')
    .eq('id', questionId)
    .maybeSingle()

  if (!q) return json({ success: false, error: 'Question not found' }, 404)
  if (q.author_id !== user.id) return json({ success: false, error: 'Only the author can close this question' }, 403)
  if (q.status !== 'open') return json({ success: false, error: 'This question is already solved or closed' }, 409)

  const ageHours = (Date.now() - new Date(q.created_at).getTime()) / 3_600_000
  if (ageHours < CLOSE_AFTER_HOURS) {
    const left = Math.ceil(CLOSE_AFTER_HOURS - ageHours)
    return json({ success: false, error: `You can close this question in ${left}h.` }, 400)
  }

  // Answers from OTHER students (self-answers don't count)
  const { count: othersAnswers } = await userDb
    .from('forum_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', questionId)
    .neq('author_id', user.id)

  const admin = createAdminClient()
  const db    = admin as unknown as Untyped

  // Atomic claim: open → closed
  const { data: locked, error: lockErr } = await db
    .from('forum_questions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', questionId)
    .eq('status', 'open')
    .select('id')

  if (lockErr) return json({ success: false, error: 'Failed to close question' }, 500)
  if (!locked || locked.length === 0) return json({ success: false, error: 'This question was already resolved' }, 409)

  // Refund (only if the bounty was actually escrowed by the server)
  const refunded: number = q.bounty_escrowed ? q.bounty : 0

  // Bonus eligibility
  let bonus = 0
  let bonusSkippedReason: string | undefined

  if (!q.bounty_escrowed) {
    bonusSkippedReason = 'No bounty was reserved for this question.'
  } else if ((othersAnswers ?? 0) > 0) {
    bonusSkippedReason = 'Other students attempted an answer, so the hard-question bonus does not apply.'
  } else {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { count: recentBonuses } = await db
      .from('tokens')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('type', 'bonus')
      .like('reason', `${BONUS_REASON_PREFIX}%`)
      .gte('created_at', weekAgo)

    if ((recentBonuses ?? 0) >= MAX_BONUS_CLAIMS_PER_WEEK) {
      bonusSkippedReason = `Weekly limit reached (${MAX_BONUS_CLAIMS_PER_WEEK} hard-question bonuses per 7 days).`
    } else {
      bonus = hardQuestionBonus(q.bounty)
    }
  }

  const title = String(q.title).slice(0, 60)
  const ledger: Array<Record<string, unknown>> = []
  if (refunded > 0) {
    ledger.push({
      school_id: q.school_id, student_id: user.id, type: 'earned', amount: refunded,
      reason: `Forum bounty refund (closed): "${title}"`, reference_id: questionId,
    })
  }
  if (bonus > 0) {
    ledger.push({
      school_id: q.school_id, student_id: user.id, type: 'bonus', amount: bonus,
      reason: `${BONUS_REASON_PREFIX}: "${title}"`, reference_id: questionId,
    })
  }

  if (ledger.length > 0) {
    const { error: tokenErr } = await db.from('tokens').insert(ledger)
    if (tokenErr) {
      console.error('[close-question] Token payout failed:', tokenErr.message)
      return json({ success: true, refunded: 0, bonus: 0, warning: 'Question closed, but the refund failed. Please contact a teacher.' }, 207)
    }
  }

  return json({ success: true, refunded, bonus, bonusSkippedReason })
}
