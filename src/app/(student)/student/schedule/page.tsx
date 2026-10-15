import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TimetableGrid from '@/components/schedule/TimetableGrid'
import { ScheduleEntry } from '@/types/schedule'

export const metadata: Metadata = { title: 'My Timetable | Student' }
export const revalidate = 60

export default async function StudentSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Fetch student's enrolled class IDs
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', user.id)

  const enrolledClassIds = (enrollments ?? []).map((e) => e.class_id)

  let schedules: ScheduleEntry[] = []

  if (enrolledClassIds.length > 0) {
    // 2. Fetch schedules for enrolled classes
    const { data: schedulesData } = await supabase
      .from('class_schedules')
      .select(`
        *,
        teacher:profiles!class_schedules_teacher_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        classes (
          id,
          name,
          teacher:profiles!classes_teacher_id_fkey (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .in('class_id', enrolledClassIds)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    const one = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null

    schedules = (schedulesData ?? []).map((s: any) => ({
      ...s,
      teacher: one(s.teacher),
      classes: s.classes
        ? {
            id: s.classes.id,
            name: s.classes.name,
            teacher: one(s.classes.teacher),
          }
        : null,
    })) as ScheduleEntry[]
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Class Timetable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your weekly schedule of lectures, lab sessions, and classroom assignments.
        </p>
      </div>

      <TimetableGrid
        schedules={schedules}
        role="student"
        emptyMessage="You don't have any classes scheduled for this day, or you haven't joined any classes yet."
      />
    </div>
  )
}
