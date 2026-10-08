'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { grantTokens, spendTokens } from '@/lib/tokens/ledger'
import type { ActionResult } from './homework' // Re-use ActionResult type

// ─────────────────────────────────────────────────────────────
// createAssignment
// ─────────────────────────────────────────────────────────────
export async function createAssignment(data: {
  title: string
  description: string
  class_id: string
  due_date?: string
  max_score?: number
  xp_reward?: number
  token_reward?: number
  is_published?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Authenticate caller
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 2. Verify caller has 'teacher' role and obtain school_id
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!teacherProfile || teacherProfile.role !== 'teacher') {
    return { success: false, error: 'Only teachers can create assignments.' }
  }

  const title = data.title.trim()
  if (!title) {
    return { success: false, error: 'Title is required.' }
  }

  if (!data.class_id) {
    return { success: false, error: 'A class must be selected.' }
  }

  // 3. Verify class belongs to this teacher and matches their school_id
  const { data: cls } = await supabase
    .from('classes')
    .select('id, teacher_id, school_id')
    .eq('id', data.class_id)
    .maybeSingle()

  if (!cls || cls.teacher_id !== user.id || cls.school_id !== teacherProfile.school_id) {
    return { success: false, error: 'Invalid class selection or permission denied.' }
  }

  // 4. Secure insert with teacher_id and school_id enforced
  const maxScore = Number(data.max_score) || 100
  const xpReward = Number(data.xp_reward) || 50
  const tokenReward = Number(data.token_reward) || 10

  const { error } = await supabase.from('assignments').insert({
    title,
    description: data.description ? data.description.trim() : null,
    class_id: data.class_id,
    teacher_id: user.id,
    school_id: teacherProfile.school_id,
    due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
    max_score: maxScore,
    xp_reward: xpReward,
    token_reward: tokenReward,
    is_published: data.is_published ?? true,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/teacher/assignments')
  revalidatePath('/student/assignments')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// gradeSubmission
// ─────────────────────────────────────────────────────────────
export async function gradeSubmission(
  submissionId: string,
  score: number,
  feedback: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // We should verify this submission belongs to an assignment owned by this teacher.
  // RLS handles this (teachers can only update if they own the assignment),
  // but we can just attempt the update and let RLS block it if unauthorized.
  
  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'graded',
      score,
      feedback: feedback || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/dashboard')
  return { success: true }
}

// -------------------------------------------------------------
// deleteAssignment
// -------------------------------------------------------------
export async function deleteAssignment(assignmentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/teacher/assignments')
  return { success: true }
}

// -------------------------------------------------------------
// updateProfile
// -------------------------------------------------------------
export async function updateProfile(data: { full_name: string }): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: data.full_name })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/settings')
  revalidatePath('/teacher/dashboard')
  return { success: true }
}

// -------------------------------------------------------------
// manageStudentTokens (Teacher awards or deducts student tokens)
// -------------------------------------------------------------
export async function manageStudentTokens(data: {
  studentId: string
  amount: number
  reason: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Authenticate caller
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 2. Verify caller has 'teacher' role and get their school_id
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!callerProfile || callerProfile.role !== 'teacher') {
    return { success: false, error: 'Only teachers can adjust student tokens.' }
  }

  const amount = Math.floor(data.amount)
  if (!Number.isFinite(amount) || amount === 0) {
    return { success: false, error: 'Please enter a valid non-zero token amount.' }
  }

  const reason = data.reason.trim()
  if (!reason) {
    return { success: false, error: 'A reason is required.' }
  }

  // 3. Verify target student exists, has role 'student', and belongs to the same school
  const admin = createAdminClient()
  const { data: targetStudent } = await admin
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('id', data.studentId)
    .maybeSingle()

  if (!targetStudent || targetStudent.role !== 'student') {
    return { success: false, error: 'Target student not found.' }
  }

  if (targetStudent.school_id !== callerProfile.school_id) {
    return { success: false, error: 'Student belongs to a different school.' }
  }

  const transactionId = crypto.randomUUID()

  // 4. Handle Reward (+) vs Penalty / Deduct (-)
  if (amount > 0) {
    const grant = await grantTokens({
      studentId: targetStudent.id,
      schoolId: callerProfile.school_id,
      amount,
      reason: `Awarded by teacher: ${reason}`,
      source: 'teacher_grant',
      referenceId: transactionId,
    })

    if (!grant.ok) {
      return { success: false, error: grant.error }
    }
  } else {
    const deductAmount = Math.abs(amount)
    const spend = await spendTokens({
      studentId: targetStudent.id,
      schoolId: callerProfile.school_id,
      amount: deductAmount,
      reason: `Deducted by teacher: ${reason}`,
      source: 'teacher_deduct',
      referenceId: transactionId,
    })

    if (!spend.ok) {
      return { success: false, error: spend.error }
    }
  }

  revalidatePath('/teacher/classes')
  revalidatePath('/teacher/classes/[id]', 'page')
  return { success: true }
}
