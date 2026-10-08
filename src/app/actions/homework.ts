'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { grantTokens, getSchoolId } from '@/lib/tokens/ledger'

// ── Types ─────────────────────────────────────────────────────
export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// submitAssignment
//
// Creates or updates a submission row, then rewards the student
// with tokens (via service-role client to bypass RLS) and
// increments their XP on the profile.
// ─────────────────────────────────────────────────────────────
export async function submitAssignment(
  assignmentId: string,
  content: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify the requesting user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to submit.' }
  }

  // Check there is not already a submitted/graded entry
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing && ['submitted', 'graded'].includes(existing.status)) {
    return { success: false, error: 'You have already submitted this assignment.' }
  }

  // Upsert the submission (handles both first submit and re-submit from 'pending')
  const { data: submission, error: submitError } = await supabase
    .from('submissions')
    .upsert(
      {
        assignment_id: assignmentId,
        student_id:   user.id,
        status:       'submitted',
        content,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single()

  if (submitError || !submission) {
    return { success: false, error: submitError?.message ?? 'Submission failed.' }
  }

  // ── Award tokens & XP (server-only ledger, idempotent per assignment) ──
  // The unique (student_id, source, reference_id) index guarantees one payout
  // per assignment even under double-clicks or concurrent requests.
  const { data: assignment } = await supabase
    .from('assignments')
    .select('token_reward, xp_reward, title')
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignment && assignment.token_reward > 0) {
    const schoolId = await getSchoolId(user.id)
    const grant = await grantTokens({
      studentId:   user.id,
      schoolId,
      amount:      assignment.token_reward,
      reason:      `Submitted: ${assignment.title}`,
      source:      'homework',
      referenceId: assignmentId,
    })

    // Only add XP on a brand-new payout
    if (grant.ok && !grant.duplicate && assignment.xp_reward > 0) {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('xp_points')
        .eq('id', user.id)
        .single()

      if (profile) {
        const newXp    = profile.xp_points + assignment.xp_reward
        // Simple levelling: level = floor(xp / 100) + 1, capped at 10
        const newLevel = Math.min(Math.floor(newXp / 100) + 1, 10)

        await admin
          .from('profiles')
          .update({ xp_points: newXp, level: newLevel })
          .eq('id', user.id)
      }
    }
  }

  revalidatePath('/student/dashboard')
  return { success: true, data: { submissionId: submission.id } }
}

// ─────────────────────────────────────────────────────────────
// getStudentAssignments
//
// Fetches all published, pending (unsubmitted) assignments for
// the authenticated student across all their enrolled classes.
// Used by the dashboard page to hydrate HomeworkList.
// ─────────────────────────────────────────────────────────────
export async function getStudentAssignments() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // IDs of assignments the student has already submitted or had graded
  const { data: doneRows } = await supabase
    .from('submissions')
    .select('assignment_id')
    .eq('student_id', user.id)
    .in('status', ['submitted', 'graded'])

  const doneIds = doneRows?.map((r) => r.assignment_id) ?? []

  // RLS automatically scopes to published assignments in enrolled classes
  let query = supabase
    .from('assignments')
    .select('*, classes(name, subject)')
    .eq('is_published', true)
    .order('due_date', { ascending: true })

  if (doneIds.length > 0) {
    query = query.not('id', 'in', `(${doneIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getStudentAssignments]', error.message)
    return []
  }

  return data ?? []
}
