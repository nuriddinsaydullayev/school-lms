'use server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import type { UserRole } from '@/types/database.types'

export interface AdminActionResult {
  success: boolean
  error?: string
}

/**
 * Helper to authenticate the admin and get their school_id
 */
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Forbidden. Admin privileges required.' }
  }

  if (!profile.school_id) {
    return { error: 'No school associated with this administrator.' }
  }

  return { user, profile }
}

/**
 * Create a new class and assign an existing teacher to it
 */
export async function createAdminClass(data: {
  name: string
  subject?: string
  description?: string
  teacher_id: string
}): Promise<AdminActionResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth
  const name = data.name?.trim()
  if (!name) {
    return { success: false, error: 'Class name is required.' }
  }

  if (!data.teacher_id) {
    return { success: false, error: 'A teacher must be selected.' }
  }

  const adminClient = createAdminClient()

  // Verify the assigned teacher is indeed in the same school and has teacher/admin role
  const { data: teacher, error: teacherErr } = await adminClient
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('id', data.teacher_id)
    .maybeSingle()

  if (teacherErr || !teacher) {
    return { success: false, error: 'Teacher not found.' }
  }

  if (teacher.school_id !== profile.school_id) {
    return { success: false, error: 'Cross-tenant assignment is strictly prohibited.' }
  }

  if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
    return { success: false, error: 'Selected user is not assigned a teacher role.' }
  }

  // Insert class with teacher_id and tenant isolation (school_id)
  const { error: insertErr } = await adminClient
    .from('classes')
    .insert({
      name,
      subject: data.subject?.trim() || null,
      description: data.description?.trim() || null,
      teacher_id: data.teacher_id,
      school_id: profile.school_id,
      is_active: true,
    })

  if (insertErr) {
    return { success: false, error: insertErr.message }
  }

  revalidatePath('/admin/classes')
  revalidatePath('/admin/dashboard')
  revalidatePath('/teacher/classes')
  return { success: true }
}

/**
 * Update a user's role in the current school
 */
export async function updateUserRole(data: {
  userId: string
  newRole: UserRole
}): Promise<AdminActionResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile: adminProfile } = auth

  const validRoles: UserRole[] = ['student', 'teacher', 'admin']
  if (!validRoles.includes(data.newRole)) {
    return { success: false, error: 'Invalid user role specified.' }
  }

  const adminClient = createAdminClient()

  // Fetch the target user to ensure they belong to the same school
  const { data: targetProfile, error: targetErr } = await adminClient
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', data.userId)
    .maybeSingle()

  if (targetErr || !targetProfile) {
    return { success: false, error: 'Target user not found.' }
  }

  if (targetProfile.school_id !== adminProfile.school_id) {
    return { success: false, error: 'Cannot modify users from another school.' }
  }

  // Prevent admin from removing their own admin role
  if (targetProfile.id === adminProfile.id && data.newRole !== 'admin') {
    return { success: false, error: 'You cannot revoke your own admin permissions.' }
  }

  // Update profile role
  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({ role: data.newRole })
    .eq('id', data.userId)
    .eq('school_id', adminProfile.school_id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/classes')
  return { success: true }
}
