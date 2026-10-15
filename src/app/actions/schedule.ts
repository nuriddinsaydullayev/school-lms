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
  /** When true (default), the generated timetable replaces the school's existing one. */
  replace_existing?: boolean
}

type AdminClient = ReturnType<typeof createAdminClient>

interface SchoolTeacher {
  id: string
  full_name: string
  subjects_taught: string[]
}

const SCHEDULE_PATHS = ['/admin/schedules', '/student/schedule', '/teacher/schedule'] as const

function revalidateSchedulePaths() {
  SCHEDULE_PATHS.forEach((p) => revalidatePath(p))
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

  return { user, profile: profile as { id: string; role: string; school_id: string } }
}

/** "HH:MM" or "HH:MM:SS" → minutes since midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m)
}

/** Normalises "08:00:00" → "08:00" so DB values and AI values compare equal */
function hhmm(time: string): string {
  return time.slice(0, 5)
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd)
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
  let currentMinutes = toMinutes(startTimeStr || '08:00')

  const formatMins = (m: number) => {
    const hh = Math.floor(m / 60).toString().padStart(2, '0')
    const mm = (m % 60).toString().padStart(2, '0')
    return `${hh}:${mm}`
  }

  const slots = []
  for (let i = 1; i <= maxPeriods; i++) {
    const endMinutes = currentMinutes + periodMinutes
    if (endMinutes >= 24 * 60) break // never wrap past midnight
    slots.push({
      slot_index: i,
      start_time: formatMins(currentMinutes),
      end_time: formatMins(endMinutes),
    })
    currentMinutes = endMinutes + breakMinutes
  }

  return slots
}

/** All staff in the school who can be assigned to teach a period */
async function loadSchoolTeachers(adminClient: AdminClient, schoolId: string) {
  const { data } = await adminClient
    .from('profiles')
    .select('id, full_name, subjects_taught')
    .eq('school_id', schoolId)
    .in('role', ['teacher', 'admin'])
    .order('full_name', { ascending: true })

  const map = new Map<string, SchoolTeacher>()
  for (const t of (data ?? []) as any[]) {
    map.set(t.id, {
      id: t.id,
      full_name: t.full_name,
      subjects_taught: Array.isArray(t.subjects_taught) ? t.subjects_taught : [],
    })
  }
  return map
}

/**
 * Add a new schedule entry for a class
 */
export async function createScheduleEntry(data: {
  class_id: string
  teacher_id?: string
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
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6) {
    return { success: false, error: 'Day of week must be Monday through Saturday.' }
  }

  if (!data.start_time || !data.end_time) {
    return { success: false, error: 'Start and end times are required.' }
  }

  if (toMinutes(data.start_time) >= toMinutes(data.end_time)) {
    return { success: false, error: 'Start time must be earlier than end time.' }
  }

  const adminClient = createAdminClient()

  // Verify the class belongs to this school
  const { data: cls, error: clsErr } = await adminClient
    .from('classes')
    .select('id, school_id, name, teacher_id')
    .eq('id', data.class_id)
    .maybeSingle()

  if (clsErr || !cls) {
    return { success: false, error: 'Class not found.' }
  }

  if (cls.school_id !== profile.school_id) {
    return { success: false, error: 'Cross-tenant schedule modification is prohibited.' }
  }

  // Resolve the instructor for this period (defaults to the class owner)
  const teacherId = data.teacher_id || cls.teacher_id
  const teachers = await loadSchoolTeachers(adminClient, profile.school_id)
  const teacher = teachers.get(teacherId)
  if (!teacher) {
    return { success: false, error: 'Selected instructor is not a teacher in this school.' }
  }

  // Conflict detection: same class OR same teacher with an overlapping time range that day
  const { data: sameDay } = await adminClient
    .from('class_schedules')
    .select('id, class_id, teacher_id, subject, start_time, end_time')
    .eq('school_id', profile.school_id)
    .eq('day_of_week', dayOfWeek)

  for (const slot of sameDay ?? []) {
    if (!rangesOverlap(data.start_time, data.end_time, slot.start_time, slot.end_time)) continue

    if (slot.teacher_id === teacherId) {
      return {
        success: false,
        error: `${teacher.full_name} already teaches "${slot.subject}" from ${hhmm(slot.start_time)} to ${hhmm(slot.end_time)} on this day.`,
      }
    }
    if (slot.class_id === data.class_id) {
      return {
        success: false,
        error: `${cls.name} already has "${slot.subject}" from ${hhmm(slot.start_time)} to ${hhmm(slot.end_time)} on this day.`,
      }
    }
  }

  const { error: insertErr } = await adminClient
    .from('class_schedules')
    .insert({
      school_id: profile.school_id,
      class_id: data.class_id,
      teacher_id: teacherId,
      subject,
      day_of_week: dayOfWeek,
      start_time: data.start_time,
      end_time: data.end_time,
      room_number: data.room_number?.trim() || null,
    })

  if (insertErr) {
    return { success: false, error: insertErr.message }
  }

  revalidateSchedulePaths()
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

  revalidateSchedulePaths()
  return { success: true }
}

interface AiSlot {
  class_id: string
  teacher_id: string
  subject: string
  day_of_week: number
  start_time: string
  room_number: string
}

/**
 * AI-powered Auto-Schedule Generator using Gemini.
 * - Time blocks are pre-computed server-side; the model only picks from them.
 * - Output is constrained via response JSON schema (enums for IDs and start times).
 * - Every slot carries its own instructor (teacher_id).
 * - Teacher / class double-bookings are rejected server-side regardless of model output.
 */
export async function generateScheduleWithAI(
  params?: AiScheduleGenerationParams | string
): Promise<{
  success: boolean
  count?: number
  skipped?: number
  error?: string
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth
  const schoolId = profile.school_id
  const adminClient = createAdminClient()

  const options: AiScheduleGenerationParams =
    typeof params === 'string' ? { additional_constraints: params } : params || {}

  const startTime = options.school_start_time || '08:00'
  const periodDuration = Math.min(Math.max(Number(options.period_duration_minutes) || 45, 20), 120)
  const breakDuration = Math.min(Math.max(Number(options.break_duration_minutes) || 0, 0), 60)
  const maxPeriods = Math.min(Math.max(Number(options.max_periods_per_day) || 6, 1), 9)
  const curriculumWorkload = options.curriculum_workload?.trim().slice(0, 1000) || ''
  const additionalConstraints = options.additional_constraints?.trim().slice(0, 1500) || ''
  const replaceExisting = options.replace_existing !== false

  // 1. Pre-compute discrete daily time blocks
  const timeSlots = computeTimeSlots(startTime, periodDuration, breakDuration, maxPeriods)
  if (timeSlots.length === 0) {
    return { success: false, error: 'The bell schedule produced no valid periods.' }
  }
  const slotEndByStart = new Map(timeSlots.map((s) => [s.start_time, s.end_time]))

  // 2. Classes + teachers for this school only
  const { data: classes, error: classesErr } = await adminClient
    .from('classes')
    .select('id, name, subject, teacher_id')
    .eq('school_id', schoolId)
    .order('name', { ascending: true })

  if (classesErr || !classes || classes.length === 0) {
    return { success: false, error: 'No classes found for this school. Please create classes first.' }
  }

  const teachers = await loadSchoolTeachers(adminClient, schoolId)
  if (teachers.size === 0) {
    return { success: false, error: 'No teachers found in this school. Promote at least one user to teacher.' }
  }

  const classById = new Map(classes.map((c) => [c.id, c]))

  const classesInfo = classes.map((c) => ({
    class_id: c.id,
    class_name: c.name,
    primary_subject: c.subject || null,
    homeroom_teacher_id: c.teacher_id,
  }))

  const teachersInfo = Array.from(teachers.values()).map((t) => ({
    teacher_id: t.id,
    name: t.full_name,
    subjects_taught: t.subjects_taught.length ? t.subjects_taught : ['(not specified)'],
  }))

  // 3. Prompt
  const prompt = `You are a strict constraint-satisfaction solver for a school master timetable.

FIXED DAILY TIME SLOTS (identical for Monday=1 … Friday=5). You may ONLY use these start_time values:
${timeSlots.map((s) => `  #${s.slot_index}: ${s.start_time}–${s.end_time}`).join('\n')}

CLASSES:
${JSON.stringify(classesInfo)}

TEACHERS (with the subjects each one teaches):
${JSON.stringify(teachersInfo)}

WEEKLY CURRICULUM WORKLOAD (periods per subject per class per week):
${curriculumWorkload || 'Distribute a balanced core curriculum (Math, Science, English, Social Studies, PE, Art).'}

ADDITIONAL CONSTRAINTS:
${additionalConstraints || 'None.'}

HARD RULES (violations are discarded):
1. DENSITY: For EVERY class, fill EVERY slot (${timeSlots.length} per day) on EVERY day 1–5. That is exactly ${timeSlots.length * 5} entries per class and ${timeSlots.length * 5 * classes.length} entries total.
2. WORKLOAD: Allocate subject counts per class to match the workload. If the workload sums to fewer periods than available, add extra periods of the core subjects; if more, scale proportionally.
3. INSTRUCTOR: Each entry's teacher_id MUST be a teacher whose subjects_taught includes that subject. If nobody lists the subject, use the class's homeroom_teacher_id.
4. NO TEACHER CONFLICTS: A teacher_id may appear at most ONCE per (day_of_week, start_time) across ALL classes.
5. NO CLASS CONFLICTS: A class_id may appear at most ONCE per (day_of_week, start_time).
6. Spread each subject across the week; avoid the same subject more than twice per day for one class.
7. room_number: a short realistic label ("Room 101", "Lab 1", "Gym").`

  // 4. Structured output schema (enums lock IDs and times to known values)
  const { generateObject, jsonSchema } = await import('ai')
  const { google } = await import('@ai-sdk/google')

  const schema = jsonSchema<{ entries: AiSlot[] }>({
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            class_id: { type: 'string', enum: classes.map((c) => c.id) },
            teacher_id: { type: 'string', enum: Array.from(teachers.keys()) },
            subject: { type: 'string' },
            day_of_week: { type: 'integer', minimum: 1, maximum: 5 },
            start_time: { type: 'string', enum: timeSlots.map((s) => s.start_time) },
            room_number: { type: 'string' },
          },
          required: ['class_id', 'teacher_id', 'subject', 'day_of_week', 'start_time', 'room_number'],
          additionalProperties: false,
        },
      },
    },
    required: ['entries'],
    additionalProperties: false,
  })

  let entries: AiSlot[]
  try {
    const { object } = await generateObject({
      model: google('gemini-3.8-flash'),
      schema,
      prompt,
      temperature: 0.1,
    })
    entries = object.entries ?? []
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gemini failed to produce a valid timetable. Please try again.',
    }
  }

  if (entries.length === 0) {
    return { success: false, error: 'AI did not return any timetable slots. Please try again.' }
  }

  // 5. Seed conflict sets with existing rows we are keeping
  const { data: existing } = await adminClient
    .from('class_schedules')
    .select('id, class_id, teacher_id, day_of_week, start_time, end_time')
    .eq('school_id', schoolId)

  const existingRows = existing ?? []
  const keptRows = replaceExisting ? [] : existingRows

  const overlapsKept = (classId: string, teacherId: string, day: number, start: string, end: string) =>
    keptRows.some(
      (r) =>
        r.day_of_week === day &&
        (r.class_id === classId || r.teacher_id === teacherId) &&
        rangesOverlap(start, end, r.start_time, r.end_time)
    )

  const teacherBusy = new Set<string>()
  const classBusy = new Set<string>()
  const recordsToInsert: {
    school_id: string
    class_id: string
    teacher_id: string
    subject: string
    day_of_week: number
    start_time: string
    end_time: string
    room_number: string | null
  }[] = []
  let skipped = 0

  for (const e of entries) {
    const cls = classById.get(e.class_id)
    const day = Number(e.day_of_week)
    const start = typeof e.start_time === 'string' ? hhmm(e.start_time) : ''
    const end = slotEndByStart.get(start)
    const subject = String(e.subject ?? '').trim().slice(0, 80)

    if (!cls || !end || !subject || !Number.isInteger(day) || day < 1 || day > 5) {
      skipped++
      continue
    }

    // Unknown teacher → fall back to the class owner (always a valid teacher)
    const teacherId = teachers.has(e.teacher_id) ? e.teacher_id : cls.teacher_id
    if (!teachers.has(teacherId)) {
      skipped++
      continue
    }

    const tKey = `${teacherId}|${day}|${start}`
    const cKey = `${cls.id}|${day}|${start}`
    if (teacherBusy.has(tKey) || classBusy.has(cKey) || overlapsKept(cls.id, teacherId, day, start, end)) {
      skipped++
      continue
    }

    teacherBusy.add(tKey)
    classBusy.add(cKey)
    recordsToInsert.push({
      school_id: schoolId,
      class_id: cls.id,
      teacher_id: teacherId,
      subject,
      day_of_week: day,
      start_time: start,
      end_time: end,
      room_number: e.room_number ? String(e.room_number).trim().slice(0, 40) : null,
    })
  }

  if (recordsToInsert.length === 0) {
    return { success: false, error: 'No conflict-free timetable entries could be produced. Try again.' }
  }

  // 6. Insert new timetable first, then remove the old one (no data loss if insert fails)
  const { error: insertErr } = await adminClient.from('class_schedules').insert(recordsToInsert)
  if (insertErr) {
    return { success: false, error: insertErr.message }
  }

  if (replaceExisting && existingRows.length > 0) {
    const oldIds = existingRows.map((r) => r.id)
    for (let i = 0; i < oldIds.length; i += 500) {
      await adminClient
        .from('class_schedules')
        .delete()
        .eq('school_id', schoolId)
        .in('id', oldIds.slice(i, i + 500))
    }
  }

  revalidateSchedulePaths()

  return { success: true, count: recordsToInsert.length, skipped }
}
