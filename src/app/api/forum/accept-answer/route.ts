import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// ── Config ─────────────────────────────────────────────────────────────────────
export const maxDuration = 30

/**
 * Subjects that trigger the AI quality-evaluation step before awarding tokens.
 * Factual / essay-based subjects where accuracy can be assessed by the model.
 */
const AI_VERIFIED_SUBJECTS = new Set([
  'History',
  'Literature',
  'English',
  'Chemistry',
  'Physics',
])

/** Token multipliers returned by AI evaluation (0 – 1.0 scale) */
type QualityTier = 'excellent' | 'good' | 'partial' | 'poor'

const QUALITY_MULTIPLIERS: Record<QualityTier, number> = {
  excellent: 1.0,   // Full bounty
  good:      0.75,  // 75 % of bounty
  partial:   0.40,  // 40 % of bounty
  poor:      0.0,   // No reward (incorrect / harmful)
}

// ── Request body type ──────────────────────────────────────────────────────────
interface AcceptPayload {
  questionId:     string   // UUID of the forum_questions row
  answerId:       string   // UUID of the forum_answers row being accepted
  answerAuthorId: string   // UUID of the user who wrote the answer
  questionTitle:  string   // For AI context
  questionBody:   string   // For AI context
  answerBody:     string   // The actual answer text to be evaluated
  subject:        string   // e.g. 'History' | 'Math' | …
  bounty:         number   // Declared bounty on the question
}

// ── POST /api/forum/accept-answer ──────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient()

  // ── 1. Auth guard — caller must be authenticated ──────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse & validate payload ───────────────────────────────────────────
  let payload: AcceptPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    questionId,
    answerId,
    answerAuthorId,
    questionTitle,
    questionBody,
    answerBody,
    subject,
    bounty,
  } = payload

  if (!questionId || !answerId || !answerAuthorId || !answerBody || bounty == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── 3. Verify caller IS the question author ───────────────────────────────
  const { data: question, error: qErr } = await (supabase as any)
    .from('forum_questions')
    .select('author_id, solved')
    .eq('id', questionId)
    .maybeSingle()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  if (question.author_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the question author can accept an answer' },
      { status: 403 }
    )
  }

  // ── 4. Prevent double-accept ──────────────────────────────────────────────
  if (question.solved) {
    return NextResponse.json(
      { error: 'This question is already solved' },
      { status: 409 }
    )
  }

  // ── 5. Determine token reward amount ─────────────────────────────────────
  let tokensAwarded = bounty            // default: full bounty
  let qualityTier: QualityTier = 'excellent'
  let aiRationale: string | null = null

  if (AI_VERIFIED_SUBJECTS.has(subject)) {
    // ── 5a. Call AI for quality evaluation ─────────────────────────────────
    const evalPrompt = `
You are an academic quality evaluator for a school forum.
A student asked a question and another student answered. 
Your job is to rate the ACCURACY and QUALITY of the answer.

QUESTION (subject: ${subject}):
Title: ${questionTitle}
${questionBody ? `Details: ${questionBody}` : ''}

ANSWER TO EVALUATE:
"${answerBody}"

Rate the answer using EXACTLY one of these tiers (output the tier name only on the FIRST line, followed by a one-sentence rationale on the second line):
- excellent   → factually correct, thorough, easy to understand
- good        → mostly correct with minor gaps
- partial     → partially correct or missing important detail
- poor        → factually wrong, misleading, or unhelpful

Output format:
TIER: <one of: excellent|good|partial|poor>
REASON: <one sentence>
`.trim()

    try {
      const { text } = await generateText({
        model:           google('gemini-3.5-flash'),
        prompt:          evalPrompt,
        maxOutputTokens: 80,
        temperature:     0.1,   // low temperature for consistent grading
      })

      // Parse the structured response
      const tierMatch   = text.match(/TIER:\s*(excellent|good|partial|poor)/i)
      const reasonMatch = text.match(/REASON:\s*(.+)/i)

      if (tierMatch) {
        qualityTier  = tierMatch[1].toLowerCase() as QualityTier
        aiRationale  = reasonMatch?.[1]?.trim() ?? null
        tokensAwarded = Math.round(bounty * QUALITY_MULTIPLIERS[qualityTier])
      }
    } catch (aiErr) {
      // AI evaluation failed — fall back to full bounty (safe default)
      console.error('[accept-answer] AI evaluation error, using full bounty fallback:', aiErr)
      qualityTier   = 'excellent'
      tokensAwarded = bounty
      aiRationale   = null
    }
  }

  // ── 6. Mark answer as accepted & question as solved ──────────────────────
  const { error: ansErr } = await (supabase as any)
    .from('forum_answers')
    .update({ is_accepted: true })
    .eq('id', answerId)
    .eq('question_id', questionId)   // safety: must belong to the question

  if (ansErr) {
    console.error('[accept-answer] Failed to mark answer accepted:', ansErr.message)
    return NextResponse.json({ error: 'Failed to mark answer as accepted' }, { status: 500 })
  }

  const { error: qUpdateErr } = await (supabase as any)
    .from('forum_questions')
    .update({ solved: true })
    .eq('id', questionId)

  if (qUpdateErr) {
    console.error('[accept-answer] Failed to mark question solved:', qUpdateErr.message)
    // Non-fatal — answer is already marked; continue to token award
  }

  // ── 7. Award tokens to the ANSWER AUTHOR (not the caller) ────────────────
  if (tokensAwarded > 0) {
    const { error: tokenErr } = await supabase.from('tokens').insert({
      student_id: answerAuthorId,    // ← answer author gets the reward
      amount:     tokensAwarded,
      type:       'earned',
      reason:     `Forum bounty: "${questionTitle.slice(0, 60)}" [${subject}]${
        aiRationale ? ` — AI: ${aiRationale.slice(0, 80)}` : ''
      }`,
    })

    if (tokenErr) {
      console.error('[accept-answer] Failed to insert token reward:', tokenErr.message)
      // Answer is already accepted — report partial success
      return NextResponse.json(
        {
          success:       true,
          warning:       'Answer accepted but token transfer failed. Contact support.',
          tokensAwarded: 0,
          qualityTier,
          aiRationale,
        },
        { status: 207 }
      )
    }
  }

  // ── 8. Return result to client ────────────────────────────────────────────
  return NextResponse.json({
    success:       true,
    tokensAwarded,
    qualityTier,
    aiRationale,
    aiVerified:    AI_VERIFIED_SUBJECTS.has(subject),
  })
}
