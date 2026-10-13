'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export interface ScheduleActionResult {
  success: boolean
  error?: string
}

/**
 * Verify current user has admin role and return user and school_id
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
 * Add a new schedule entry for a class
 */
export async function createScheduleEntry(data: {
  class_id: string
  subject: string
  day_of_week: number
  start_time: string
  end_time: string
  room_number?: string
}): Promise<ScheduleActionResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth

  if (!data.class_id) {
    return { success: false, error: 'Class is required.' }
  }

  const subject = data.subject?.trim()
  if (!subject) {
    return { success: false, error: 'Subject is required.' }
  }

  const dayOfWeek = Number(data.day_of_week)
  if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6) {
    return { success: false, error: 'Day of week must be Monday through Saturday.' }
  }

  if (!data.start_time || !data.end_time) {
    return { success: false, error: 'Start and end times are required.' }
  }

  if (data.start_time >= data.end_time) {
    return { success: false, error: 'Start time must be earlier than end time.' }
  }

  const adminClient = createAdminClient()

  // Verify the class belongs to this school
  const { data: cls, error: clsErr } = await adminClient
    .from('classes')
    .select('id, school_id, name')
    .eq('id', data.class_id)
    .maybeSingle()

  if (clsErr || !cls) {
    return { success: false, error: 'Class not found.' }
  }

  if (cls.school_id !== profile.school_id) {
    return { success: false, error: 'Cross-tenant schedule modification is prohibited.' }
  }

  // Insert the schedule entry
  const { error: insertErr } = await adminClient
    .from('class_schedules')
    .insert({
      school_id: profile.school_id,
      class_id: data.class_id,
      subject,
      day_of_week: dayOfWeek,
      start_time: data.start_time,
      end_time: data.end_time,
      room_number: data.room_number?.trim() || null,
    })

  if (insertErr) {
    return { success: false, error: insertErr.message }
  }

  revalidatePath('/admin/schedules')
  revalidatePath('/student/schedule')
  revalidatePath('/teacher/schedule')
  return { success: true }
}

/**
 * Delete a schedule entry
 */
export async function deleteScheduleEntry(scheduleId: string): Promise<ScheduleActionResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth
  if (!scheduleId) {
    return { success: false, error: 'Schedule ID is required.' }
  }

  const adminClient = createAdminClient()

  // Verify entry belongs to the admin's school
  const { data: schedule, error: fetchErr } = await adminClient
    .from('class_schedules')
    .select('id, school_id')
    .eq('id', scheduleId)
    .maybeSingle()

  if (fetchErr || !schedule) {
    return { success: false, error: 'Schedule entry not found.' }
  }

  if (schedule.school_id !== profile.school_id) {
    return { success: false, error: 'Unauthorized to delete schedule entry from another school.' }
  }

  const { error: deleteErr } = await adminClient
    .from('class_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('school_id', profile.school_id)

  if (deleteErr) {
    return { success: false, error: deleteErr.message }
  }

  revalidatePath('/admin/schedules')
  revalidatePath('/student/schedule')
  revalidatePath('/teacher/schedule')
  return { success: true }
}
