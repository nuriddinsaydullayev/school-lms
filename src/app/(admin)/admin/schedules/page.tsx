import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import AdminScheduleManager from '@/components/admin/AdminScheduleManager'
import { ScheduleEntry } from '@/types/schedule'

export const metadata: Metadata = { title: 'Manage Schedules | Admin' }
export const revalidate = 10

export default async function AdminSchedulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.school_id) {
    redirect('/login')
  }

  const schoolId = adminProfile.school_id
  const adminClient = createAdminClient()

  // 1. Fetch all classes in this school
  const { data: classesData } = await adminClient
    .from('classes')
    .select(`
      id,
      name,
      subject,
      teacher:profiles!classes_teacher_id_fkey(full_name)
    `)
    .eq('school_id', schoolId)
    .order('name', { ascending: true })

  // 2. Fetch all schedules in this school with associated class information
  const { data: schedulesData } = await adminClient
    .from('class_schedules')
    .select(`
      *,
      classes (
        id,
        name
      )
    `)
    .eq('school_id', schoolId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const classes = (classesData ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    teacher: Array.isArray(c.teacher) ? c.teacher[0] : c.teacher,
  }))

  const schedules: ScheduleEntry[] = (schedulesData ?? []) as unknown as ScheduleEntry[]

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          School Schedules & Timetable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Organize daily class periods, room numbers, and timings across your school.
        </p>
      </div>

      <AdminScheduleManager
        classes={classes}
        initialSchedules={schedules}
      />
    </div>
  )
}
