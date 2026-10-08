import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ChevronLeft, Users, BookOpen, Key } from 'lucide-react'
import StudentTokenManager from '@/components/teacher/StudentTokenManager'

interface ClassDetailPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Class Details — Teacher Portal',
}

export default async function TeacherClassDetailPage({ params }: ClassDetailPageProps) {
  const { id: classId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch class details ensuring the current teacher owns it
  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .maybeSingle()

  if (!cls) {
    notFound()
  }

  // 2. Fetch enrolled students
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select(`
      id,
      enrolled_at,
      student_id,
      student:profiles!student_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .order('enrolled_at', { ascending: true })

  const studentIds = (enrollments ?? []).map((e: any) => e.student_id).filter(Boolean)

  // 3. Fetch token balances for these students
  let balancesMap: Record<string, number> = {}
  if (studentIds.length > 0) {
    const { data: balances } = await supabase
      .from('token_balances')
      .select('student_id, balance')
      .in('student_id', studentIds)

    if (balances) {
      balances.forEach((b: any) => {
        balancesMap[b.student_id] = b.balance ?? 0
      })
    }
  }

  // Format list for StudentTokenManager
  const studentsList = (enrollments ?? []).map((e: any) => ({
    id: e.student_id,
    full_name: e.student?.full_name ?? 'Unknown Student',
    avatar_url: e.student?.avatar_url ?? null,
    token_balance: balancesMap[e.student_id] ?? 0,
    enrolled_at: e.enrolled_at,
  }))

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
      >
        <ChevronLeft size={16} />
        Back to all classes
      </Link>

      {/* Class Overview Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {cls.subject || 'General Subject'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users size={13} /> {studentsList.length} student{studentsList.length !== 1 ? 's' : ''} enrolled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {cls.name}
            </h1>
            {cls.description && (
              <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                {cls.description}
              </p>
            )}
          </div>

          {/* Join Code Card */}
          <div className="flex-shrink-0 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Key size={12} /> Student Join Code
            </span>
            <code className="text-xl font-mono font-bold text-indigo-700 tracking-widest px-3 py-1 bg-white rounded-xl border border-indigo-100 shadow-xs inline-block">
              {cls.join_code}
            </code>
          </div>
        </div>
      </div>

      {/* Enrolled Students & Token Management Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Enrolled Students
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Award or deduct tokens based on classroom participation, homework, and behavior.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
            Total: {studentsList.length}
          </span>
        </div>

        <StudentTokenManager students={studentsList} />
      </div>
    </div>
  )
}
