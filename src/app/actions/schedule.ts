'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export interface ScheduleActionResult {
  success: boolean
  error?: string
}

export interface AiScheduleGenerationParams {
  school_start_time?: string
  period_duration_minutes?: number
  break_duration_minutes?: number
  max_periods_per_day?: number
  curriculum_workload?: string
  additional_constraints?: string
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
 * Helper to compute exact time slots for school days
 */
function computeTimeSlots(
  startTimeStr: string,
  periodMinutes: number,
  breakMinutes: number,
  maxPeriods: number
): { slot_index: number; start_time: string; end_time: string }[] {
  const [startH, startM] = (startTimeStr || '08:00').split(':').map((v) => parseInt(v, 10))
  let currentMinutes = (isNaN(startH) ? 8 : startH) * 60 + (isNaN(startM) ? 0 : startM)

  const slots = []
  for (let i = 1; i <= maxPeriods; i++) {
    const endMinutes = currentMinutes + periodMinutes

    const formatMins = (m: number) => {
      const hh = Math.floor(m / 60)
        .toString()
        .padStart(2, '0')
      const mm = (m % 60).toString().padStart(2, '0')
      return `${hh}:${mm}`
    }

    slots.push({
      slot_index: i,
      start_time: formatMins(currentMinutes),
      end_time: formatMins(endMinutes),
    })

    currentMinutes = endMinutes + breakMinutes
  }

  return slots
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

/**
 * AI-powered Auto-Schedule Generator using Gemini API
 * Enhanced with pre-computed time slots, dense workload distribution, and strict JSON output
 */
export async function generateScheduleWithAI(
  params?: AiScheduleGenerationParams | string
): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth
  const adminClient = createAdminClient()

  // Extract structured parameters with sensible defaults
  const options: AiScheduleGenerationParams =
    typeof params === 'string'
      ? { additional_constraints: params }
      : params || {}

  const startTime = options.school_start_time || '08:00'
  const periodDuration = Number(options.period_duration_minutes) || 45
  const breakDuration = Number(options.break_duration_minutes) || 5
  const maxPeriods = Math.min(Math.max(Number(options.max_periods_per_day) || 6, 1), 9)
  const curriculumWorkload = options.curriculum_workload?.trim() || ''
  const additionalConstraints = options.additional_constraints?.trim() || ''

  // 1. Pre-compute discrete daily time blocks
  const timeSlots = computeTimeSlots(startTime, periodDuration, breakDuration, maxPeriods)

  // 2. Fetch all classes with assigned teachers
  const { data: classes, error: classesErr } = await adminClient
    .from('classes')
    .select(`
      id,
      name,
      subject,
      description,
      teacher:profiles!classes_teacher_id_fkey(id, full_name)
    `)
    .eq('school_id', profile.school_id)
    .order('name', { ascending: true })

  if (classesErr || !classes || classes.length === 0) {
    return {
      success: false,
      error: 'No classes found for this school. Please create classes first.',
    }
  }

  // 3. Fetch all teachers in this school
  const { data: teachers } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('school_id', profile.school_id)
    .in('role', ['teacher', 'admin'])

  const classesInfo = classes.map((c: any) => {
    const teacher = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher
    return {
      class_id: c.id,
      class_name: c.name,
      subject: c.subject || 'General Studies',
      teacher_name: teacher?.full_name || 'Unassigned',
      teacher_id: teacher?.id || null,
    }
  })

  // 4. Construct high-density Master Timetable Prompt
  const prompt = `You are an elite, highly precise school master timetable and constraint-satisfaction scheduling engine.
Your mission is to generate a comprehensive, dense, fully-packed weekly timetable (Monday=1 through Friday=5) for every class.

PRE-COMPUTED DAILY TIME SLOTS (Every school day Monday to Friday has exactly these ${timeSlots.length} periods):
${JSON.stringify(timeSlots, null, 2)}

CLASSES TO SCHEDULE:
${JSON.stringify(classesInfo, null, 2)}

TEACHERS:
${JSON.stringify(teachers ?? [], null, 2)}

CURRICULUM WORKLOAD (Weekly periods per subject/class):
${curriculumWorkload || 'Standard full academic schedule. Ensure every class has an active period in every time slot Monday through Friday.'}

ADDITIONAL CONSTRAINTS:
${additionalConstraints || 'None.'}

MANDATORY SCHEDULING RULES:
1. FULL TIME-SLOT DENSITY:
   - For every class in the list, schedule a meaningful academic subject period for each of the ${timeSlots.length} daily time slots across Monday (1), Tuesday (2), Wednesday (3), Thursday (4), and Friday (5).
   - Use the exact "start_time" and "end_time" strings from the PRE-COMPUTED DAILY TIME SLOTS list (e.g. "${timeSlots[0]?.start_time}" to "${timeSlots[0]?.end_time}"). Do not invent random timestamps.
2. NO TEACHER CONFLICTS:
   - A teacher CANNOT be scheduled to teach two different classes at the same day_of_week and start_time.
3. NO CLASS CONFLICTS:
   - A class cannot have two subjects at the same day_of_week and start_time.
4. VALID IDENTIFIERS:
   - "class_id" MUST strictly be one of the exact UUID strings from the CLASSES list.
   - "day_of_week" must be an integer from 1 to 5 (1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri).
5. REALISTIC ROOMS:
   - Assign reasonable classroom numbers (e.g. "Room 101", "Room 202", "Lab 1", "Hall B").

OUTPUT FORMAT:
Return a valid JSON array of objects adhering strictly to this schema:
[
  {
    "class_id": "UUID",
    "subject": "Subject Name",
    "day_of_week": 1,
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "room_number": "Room 101"
  }
]
Do not output markdown explanations or prose.`

  try {
    const { google } = await import('@ai-sdk/google')
    const { generateText } = await import('ai')

    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      prompt,
      temperature: 0.2,
    })

    // Parse and clean JSON
    let cleanJson = text.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    }

    const parsedEntries = JSON.parse(cleanJson)

    if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
      return { success: false, error: 'AI did not return any timetable slots. Please try again.' }
    }

    // Validate and sanitize records
    const validClassIds = new Set(classes.map((c) => c.id))
    const recordsToInsert = []

    for (const entry of parsedEntries) {
      if (
        entry.class_id &&
        validClassIds.has(entry.class_id) &&
        entry.subject &&
        typeof entry.day_of_week === 'number' &&
        entry.day_of_week >= 1 &&
        entry.day_of_week <= 6 &&
        entry.start_time &&
        entry.end_time &&
        entry.start_time < entry.end_time
      ) {
        recordsToInsert.push({
          school_id: profile.school_id,
          class_id: entry.class_id,
          subject: String(entry.subject).trim(),
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room_number: entry.room_number ? String(entry.room_number).trim() : null,
        })
      }
    }

    if (recordsToInsert.length === 0) {
      return {
        success: false,
        error: 'No valid timetable entries matched the school classes.',
      }
    }

    // Bulk insert into class_schedules
    const { error: insertErr } = await adminClient
      .from('class_schedules')
      .insert(recordsToInsert)

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    revalidatePath('/admin/schedules')
    revalidatePath('/student/schedule')
    revalidatePath('/teacher/schedule')

    return {
      success: true,
      count: recordsToInsert.length,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An error occurred while generating timetable with Gemini AI.',
    }
  }
}
