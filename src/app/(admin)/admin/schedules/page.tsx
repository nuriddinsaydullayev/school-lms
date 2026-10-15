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
      teacher_id,
      teacher:profiles!classes_teacher_id_fkey(full_name)
    `)
    .eq('school_id', schoolId)
    .order('name', { ascending: true })

  // 2. Fetch all staff who can teach a period
  const { data: teachersData } = await adminClient
    .from('profiles')
    .select('id, full_name, subjects_taught')
    .eq('school_id', schoolId)
    .in('role', ['teacher', 'admin'])
    .order('full_name', { ascending: true })

  // 3. Fetch all schedules in this school with class + per-slot instructor
  const { data: schedulesData } = await adminClient
    .from('class_schedules')
    .select(`
      *,
      teacher:profiles!class_schedules_teacher_id_fkey(id, full_name),
      classes (
        id,
        name
      )
    `)
    .eq('school_id', schoolId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null

  const classes = (classesData ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    teacher_id: c.teacher_id as string,
    teacher: one(c.teacher) as { full_name: string } | null,
  }))

  const teachers = (teachersData ?? []).map((t: any) => ({
    id: t.id as string,
    full_name: t.full_name as string,
    subjects_taught: (Array.isArray(t.subjects_taught) ? t.subjects_taught : []) as string[],
  }))

  const schedules: ScheduleEntry[] = (schedulesData ?? []).map((s: any) => ({
    ...s,
    teacher: one(s.teacher),
    classes: one(s.classes),
  }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          School Schedules & Timetable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Organize daily class periods, instructors, room numbers, and timings across your school.
        </p>
      </div>

      <AdminScheduleManager
        classes={classes}
        teachers={teachers}
        initialSchedules={schedules}
      />
    </div>
  )
}
