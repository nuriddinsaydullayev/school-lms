'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import {
  FORUM_SUBJECTS,
  type ForumData,
  type ForumQuestionDTO,
  type QuestionStatus,
} from '@/types/forum'

// forum_* tables are not yet in the generated database.types.ts —
// use an untyped client view for those tables only.
type Untyped = SupabaseClient<any, 'public', any>

// ── Read: all questions visible to the current user's school ───────────────
export async function getForumData(): Promise<ForumData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { currentUserId: null, balance: 0, questions: [], error: 'Not signed in' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.school_id) {
    return {
      currentUserId: user.id,
      balance: 0,
      questions: [],
      error: 'Your account is not linked to a school, so the forum is empty for you. Ask an admin to assign your school.',
    }
  }

  const [{ data: bal }, { data: rows, error }] = await Promise.all([
    supabase.from('token_balances').select('balance').eq('student_id', user.id).maybeSingle(),
    (supabase as unknown as Untyped)
      .from('forum_questions')
      .select(`
        id, author_id, title, body, subject, bounty, target_grade, is_ai_graded, status, created_at,
        author:profiles!author_id ( full_name ),
        forum_answers (
          id, author_id, body, likes, is_accepted, created_at,
          author:profiles!author_id ( full_name )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (error) {
    return { currentUserId: user.id, balance: bal?.balance ?? 0, questions: [], error: error.message }
  }

  const questions: ForumQuestionDTO[] = (rows ?? []).map((q: any) => ({
    id:          q.id,
    authorId:    q.author_id,
    authorName:  q.author_id === user.id ? 'You' : (q.author?.full_name ?? 'Student'),
    title:       q.title,
    body:        q.body ?? '',
    subject:     q.subject,
    bounty:      q.bounty,
    targetGrade: q.target_grade,
    isAiGraded:  q.is_ai_graded,
    status:      q.status as QuestionStatus,
    createdAt:   q.created_at,
    answers: (q.forum_answers ?? [])
      .map((a: any) => ({
        id:         a.id,
        authorId:   a.author_id,
        authorName: a.author_id === user.id ? 'You' : (a.author?.full_name ?? 'Student'),
        body:       a.body,
        likes:      a.likes,
        isAccepted: a.is_accepted,
        createdAt:  a.created_at,
      }))
      .sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt)),
  }))

  return { currentUserId: user.id, balance: bal?.balance ?? 0, questions }
}

// ── Write: ask a question (bounty is escrowed from the author's balance) ───
export async function askQuestion(input: {
  title:       string
  body:        string
  subject:     string
  bounty:      number
  targetGrade: number | null
  isAiGraded:  boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const title  = input.title.trim()
  const bounty = Math.floor(Number(input.bounty))
  const grade  = input.targetGrade == null ? null : Math.floor(Number(input.targetGrade))

  if (title.length < 5 || title.length > 200) return { success: false, error: 'Title must be 5–200 characters.' }
  if (!Number.isFinite(bounty) || bounty < 5 || bounty > 100) return { success: false, error: 'Bounty must be between 5 and 100 tokens.' }
  if (!(FORUM_SUBJECTS as readonly string[]).includes(input.subject)) return { success: false, error: 'Invalid subject.' }
  if (grade !== null && (grade < 1 || grade > 11)) return { success: false, error: 'Grade must be 1–11.' }

  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).maybeSingle()
  if (!profile?.school_id) return { success: false, error: 'Your account is not linked to a school.' }

  const { data: bal } = await supabase.from('token_balances').select('balance').eq('student_id', user.id).maybeSingle()
  if ((bal?.balance ?? 0) < bounty) return { success: false, error: `Not enough tokens — you have ${bal?.balance ?? 0}, bounty is ${bounty}.` }

  const admin = createAdminClient()
  const db    = admin as unknown as Untyped

  // 1. Insert question (service role → explicit school_id; escrow flag false until paid)
  const { data: question, error: qErr } = await db
    .from('forum_questions')
    .insert({
      school_id:       profile.school_id,
      author_id:       user.id,
      title,
      body:            input.body.trim() || null,
      subject:         input.subject,
      bounty,
      target_grade:    grade,
      is_ai_graded:    !!input.isAiGraded,
      status:          'open',
      bounty_escrowed: false,
    })
    .select('id')
    .single()

  if (qErr || !question) return { success: false, error: qErr?.message ?? 'Failed to create question' }

  // 2. Escrow the bounty
  const { error: tErr } = await admin.from('tokens').insert({
    school_id:    profile.school_id,
    student_id:   user.id,
    type:         'spent',
    amount:       bounty,
    reason:       `Forum bounty escrow: "${title.slice(0, 60)}"`,
    reference_id: question.id,
  })

  if (tErr) {
    await db.from('forum_questions').delete().eq('id', question.id)   // roll back
    return { success: false, error: 'Could not reserve your bounty. Please try again.' }
  }

  await db.from('forum_questions').update({ bounty_escrowed: true }).eq('id', question.id)
  return { success: true }
}

// ── Write: post an answer (RLS enforces open question + same school) ───────
export async function postAnswer(questionId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const text = body.trim()
  if (text.length < 2 || text.length > 5000) return { success: false, error: 'Answer must be 2–5000 characters.' }

  const { error } = await (supabase as unknown as Untyped)
    .from('forum_answers')
    .insert({ question_id: questionId, author_id: user.id, body: text })

  if (error) {
    return { success: false, error: error.code === '42501' ? 'This question is no longer open.' : error.message }
  }
  return { success: true }
}
