import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DailySchedule from '@/components/student/DailySchedule'
import SmartPlanner  from '@/components/student/SmartPlanner'
import { CalendarDays } from 'lucide-react'
import { getStudentAssignments } from '@/app/actions/homework'

export const metadata: Metadata = { title: 'Schedule & Planner' }
export const revalidate = 60

export default async function StudentPlannerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'student') redirect('/login')

  const assignments = await getStudentAssignments()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Schedule &amp; Planner
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Today's timetable and your AI-suggested study plan
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <DailySchedule assignments={assignments} />
        <SmartPlanner  assignments={assignments} xpPoints={profile.xp_points} />
      </div>
    </div>
  )
}
