import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { grantTokensBatch } from '@/lib/tokens/ledger'
import type { AcceptResult, QualityTier } from '@/types/forum'

export const maxDuration = 30

type Untyped = SupabaseClient<any, 'public', any>

const QUALITY_MULTIPLIERS: Record<QualityTier, number> = {
  excellent: 1.0,
  good:      0.75,
  partial:   0.4,
  poor:      0.0,
}

function json(body: AcceptResult, status = 200) {
  return NextResponse.json(body, { status })
}

// ── POST /api/forum/accept-answer ─────────────────────────────────────────────
// Body: { questionId, answerId }. Everything else (bounty, author, AI flag,
// answer text) is read from the DB — never trusted from the client.
export async function POST(req: Request) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ success: false, error: 'Unauthorized' }, 401)

  // 2. Payload
  let questionId: string, answerId: string
  try {
    ;({ questionId, answerId } = await req.json())
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400)
  }
  if (!questionId || !answerId) return json({ success: false, error: 'questionId and answerId are required' }, 400)

  // 3. Load question + answer under the caller's RLS (enforces same school)
  const userDb = supabase as unknown as Untyped

  const { data: question } = await userDb
    .from('forum_questions')
    .select('id, school_id, author_id, title, body, subject, bounty, is_ai_graded, status, bounty_escrowed')
    .eq('id', questionId)
    .maybeSingle()

  if (!question) return json({ success: false, error: 'Question not found' }, 404)
  if (question.author_id !== user.id) {
    return json({ success: false, error: 'Only the question author can accept an answer' }, 403)
  }
  if (question.status !== 'open') {
    return json({ success: false, error: 'This question is already solved or closed' }, 409)
  }

  const { data: answer } = await userDb
    .from('forum_answers')
    .select('id, question_id, author_id, body')
    .eq('id', answerId)
    .maybeSingle()

  if (!answer || answer.question_id !== questionId) {
    return json({ success: false, error: 'Answer not found for this question' }, 404)
  }

  // 4. Self-answer exploit guard
  if (answer.author_id === user.id) {
    return json({ success: false, error: 'You cannot accept your own answer' }, 403)
  }

  const admin = createAdminClient()
  const db    = admin as unknown as Untyped

  // 5. Atomic claim: only one request can flip open → solved
  const { data: locked, error: lockErr } = await db
    .from('forum_questions')
    .update({ status: 'solved', solved: true, closed_at: new Date().toISOString() })
    .eq('id', questionId)
    .eq('status', 'open')
    .select('id')

  if (lockErr) return json({ success: false, error: 'Failed to update question' }, 500)
  if (!locked || locked.length === 0) {
    return json({ success: false, error: 'This question was already resolved' }, 409)
  }

  const { error: ansErr } = await db
    .from('forum_answers')
    .update({ is_accepted: true })
    .eq('id', answerId)

  if (ansErr) {
    // Roll back the claim so the author can retry
    await db.from('forum_questions').update({ status: 'open', solved: false, closed_at: null }).eq('id', questionId)
    return json({ success: false, error: 'Failed to mark answer as accepted' }, 500)
  }

  // 6. Reward amount — AI grading only if the author opted in
  const bounty: number = question.bounty
  let tokensAwarded = bounty
  let qualityTier: QualityTier | null = null
  let aiRationale: string | null = null
  let aiVerified = false

  if (question.is_ai_graded) {
    const prompt = `
You are an academic quality evaluator for a school Q&A forum.
Rate the ACCURACY and QUALITY of the student's answer.

QUESTION (subject: ${question.subject}):
Title: ${question.title}
${question.body ? `Details: ${question.body}` : ''}

ANSWER:
"""${answer.body}"""

Tiers:
- excellent → factually correct, thorough, easy to understand
- good      → mostly correct with minor gaps
- partial   → partially correct or missing important detail
- poor      → wrong, misleading, or unhelpful

Respond in exactly this format:
TIER: <excellent|good|partial|poor>
REASON: <one sentence>
`.trim()

    try {
      const { text } = await generateText({
        model:           google('gemini-3.5-flash'),
        prompt,
        maxOutputTokens: 100,
        temperature:     0.1,
      })
      const tier   = text.match(/TIER:\s*(excellent|good|partial|poor)/i)?.[1]?.toLowerCase() as QualityTier | undefined
      const reason = text.match(/REASON:\s*(.+)/i)?.[1]?.trim()

      if (tier) {
        qualityTier   = tier
        aiRationale   = reason ?? null
        aiVerified    = true
        tokensAwarded = Math.round(bounty * QUALITY_MULTIPLIERS[tier])
      }
    } catch (err) {
      console.error('[accept-answer] AI evaluation failed — paying full bounty:', err)
    }
  }

  // 7. Payouts (server-only ledger with source tracking and idempotency)
  const entries = []

  if (tokensAwarded > 0) {
    entries.push({
      schoolId:    question.school_id,
      studentId:   answer.author_id,                  // ← the ANSWER AUTHOR
      type:         'earned' as const,
      amount:       tokensAwarded,
      reason:       `Forum answer accepted: "${String(question.title).slice(0, 60)}"${
        aiRationale ? ` — AI: ${aiRationale.slice(0, 80)}` : ''
      }`,
      source:       'forum_answer' as const,
      referenceId:  questionId,
    })
  }

  // Unawarded part of an escrowed bounty goes back to the asker
  const refunded = question.bounty_escrowed ? bounty - tokensAwarded : 0
  if (refunded > 0) {
    entries.push({
      schoolId:    question.school_id,
      studentId:   user.id,
      type:         'earned' as const,
      amount:       refunded,
      reason:       `Forum bounty refund (AI-graded ${qualityTier}): "${String(question.title).slice(0, 60)}"`,
      source:       'forum_refund' as const,
      referenceId:  questionId,
    })
  }

  if (entries.length > 0) {
    const grant = await grantTokensBatch(entries)
    if (!grant.ok) {
      console.error('[accept-answer] Token payout failed:', grant.error)
      return json(
        {
          success: true,
          warning: 'Answer accepted, but the token payout failed. Please contact a teacher.',
          tokensAwarded: 0, refunded: 0, qualityTier, aiRationale, aiVerified,
        },
        207
      )
    }
  }

  return json({ success: true, tokensAwarded, refunded, qualityTier, aiRationale, aiVerified })
}
