import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, review, and track tasks created for your classes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            Total: {assignments?.length ?? 0}
          </span>
          <Link
            href="/teacher/dashboard"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
          >
            + Create New
          </Link>
        </div>
      </div>

      <AssignmentList assignments={(assignments as unknown as ExtendedAssignment[]) ?? []} />
    </div>
  )
}
