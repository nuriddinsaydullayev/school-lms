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

/**
 * AI-powered Auto-Schedule Generator using Gemini API
 */
export async function generateScheduleWithAI(constraints?: string): Promise<{
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

  // 1. Fetch all classes and their assigned teachers in this school
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

  // 2. Fetch all teachers in this school
  const { data: teachers } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('school_id', profile.school_id)
    .in('role', ['teacher', 'admin'])

  // Format classes & teachers info for prompt
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

  // 3. Construct Gemini Prompt
  const prompt = `You are an expert school timetable and master schedule coordinator.
Your task is to generate a well-balanced, realistic weekly class timetable for a school.

AVAILABLE CLASSES TO SCHEDULE:
${JSON.stringify(classesInfo, null, 2)}

AVAILABLE TEACHERS:
${JSON.stringify(teachers ?? [], null, 2)}

ADMIN CONSTRAINTS & PREFERENCES:
${constraints?.trim() ? constraints.trim() : 'Standard balanced weekly schedule across school days.'}

TIMETABLE RULES:
1. Days of week must be integers from 1 to 5 (1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday). (Do NOT schedule on Saturday 6 or Sunday unless explicitly requested in constraints).
2. Daily school hours are typically between 08:30 and 15:30. Periods should be between 45 and 60 minutes (e.g. "09:00" to "09:50", "10:00" to "10:50", "11:00" to "11:50", "13:00" to "13:50", "14:00" to "14:50").
3. Standard lunch break is between 12:00 and 13:00. Avoid scheduling during this period.
4. "start_time" and "end_time" must be in 24-hour "HH:MM" format (e.g., "09:00", "10:45"). start_time must strictly be before end_time.
5. Avoid scheduling teacher or class conflicts (a teacher or class cannot be in two places at the same time).
6. "class_id" must be an EXACT UUID matching one of the class_id values provided in the AVAILABLE CLASSES list above.
7. Assign realistic room numbers if possible (e.g., "Room 101", "Lab A", "Auditorium", "Room 204").
8. Generate between 3 to 5 timetable periods per class spread throughout the week.

OUTPUT INSTRUCTION:
Return ONLY a valid JSON array of objects. Do not include markdown code block formatting (or wrap inside \`\`\`json ... \`\`\`), no extra text or explanations.
Each object in the array must strictly have these fields:
{
  "class_id": string (UUID),
  "subject": string,
  "day_of_week": number (1-5),
  "start_time": string ("HH:MM"),
  "end_time": string ("HH:MM"),
  "room_number": string
}`

  try {
    const { google } = await import('@ai-sdk/google')
    const { generateText } = await import('ai')

    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      prompt,
      temperature: 0.3,
    })

    // Parse the JSON array from response
    let cleanJson = text.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    }

    const parsedEntries = JSON.parse(cleanJson)

    if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
      return { success: false, error: 'AI did not return any schedule slots. Please try again.' }
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
        error: 'No valid schedule records could be constructed from AI response.',
      }
    }

    // 4. Bulk insert into class_schedules
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
      error: err.message || 'An error occurred while generating schedule with Gemini AI.',
    }
  }
}

