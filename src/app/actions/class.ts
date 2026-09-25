'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { ActionResult } from './homework'

// ─────────────────────────────────────────────────────────────
// createClass (Teacher)
// ─────────────────────────────────────────────────────────────
export async function createClass(data: {
  name: string
  subject: string
  description: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Join code is generated automatically by Supabase default
  const { error } = await supabase.from('classes').insert({
    name: data.name,
    subject: data.subject || null,
    description: data.description || null,
    teacher_id: user.id,
    is_active: true,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teacher/classes')
  revalidatePath('/teacher/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// joinClass (Student)
// ─────────────────────────────────────────────────────────────
export async function joinClass(joinCode: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const cleanCode = joinCode.trim().toUpperCase()
  if (!cleanCode) return { success: false, error: 'Join code is required.' }

  // 1. Find the class
  const { data: cls, error: findError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('join_code', cleanCode)
    .maybeSingle()

  if (findError) return { success: false, error: findError.message }
  if (!cls) return { success: false, error: 'Invalid join code. Class not found.' }

  // 2. Check if already enrolled
  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', cls.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing) {
    return { success: false, error: `You are already enrolled in ${cls.name}.` }
  }

  // 3. Enroll
  const { error: enrollError } = await supabase
    .from('class_enrollments')
    .insert({
      class_id: cls.id,
      student_id: user.id,
    })

  if (enrollError) {
    return { success: false, error: enrollError.message }
  }

  revalidatePath('/student/dashboard')
  revalidatePath('/student/classes')
  return { success: true }
}
