'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import type { ActionResult } from './homework' // Re-use ActionResult type

// ─────────────────────────────────────────────────────────────
// createAssignment
// ─────────────────────────────────────────────────────────────
export async function createAssignment(data: {
  title: string
  description: string
  class_id: string
  due_date?: string
  max_score: number
  xp_reward: number
  token_reward: number
  is_published: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('assignments').insert({
    ...data,
    teacher_id: user.id,
    due_date: data.due_date || null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/dashboard')
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
