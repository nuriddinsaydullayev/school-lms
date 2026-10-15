import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TimetableGrid from '@/components/schedule/TimetableGrid'
import { ScheduleEntry } from '@/types/schedule'

export const metadata: Metadata = { title: 'Teaching Schedule | Teacher' }
export const dynamic = 'force-dynamic'

export default async function TeacherSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only the periods this teacher personally instructs — never the whole
  // class timetable. RLS additionally restricts rows to the teacher's school.
  const { data: schedulesData } = await supabase
    .from('class_schedules')
    .select(`
      *,
      classes (
        id,
        name
      )
    `)
    .eq('teacher_id', user.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const schedules = (schedulesData ?? []) as unknown as ScheduleEntry[]

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Teaching Schedule
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          The periods you personally teach this week ({schedules.length} total).
        </p>
      </div>

      <TimetableGrid
        schedules={schedules}
        role="teacher"
        emptyMessage="You have no teaching periods scheduled for this day."
      />
    </div>
  )
}
