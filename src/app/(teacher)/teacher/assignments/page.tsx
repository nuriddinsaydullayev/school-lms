import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AssignmentList, { ExtendedAssignment } from '@/components/teacher/AssignmentList'

export const metadata: Metadata = { title: 'Manage Assignments' }

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all assignments across all classes owned by this teacher
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, classes(name)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and review all assignments across your classes.</p>
        </div>
      </div>

      <AssignmentList assignments={(assignments as unknown as ExtendedAssignment[]) ?? []} />
    </div>
  )
}
