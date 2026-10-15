export interface ScheduleTeacher {
  id: string
  full_name: string
  avatar_url?: string | null
}

export interface ScheduleEntry {
  id: string
  school_id: string | null
  class_id: string
  /** Instructor for this specific period (may differ from the class owner). */
  teacher_id?: string | null
  teacher?: ScheduleTeacher | null
  subject: string
  day_of_week: number // 1: Monday, ..., 6: Saturday
  start_time: string  // "HH:MM:SS" or "HH:MM"
  end_time: string
  room_number: string | null
  classes?: {
    id: string
    name: string
    teacher?: ScheduleTeacher | null
  } | null
}

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr

  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12

  return `${hours}:${minutes} ${ampm}`
}
