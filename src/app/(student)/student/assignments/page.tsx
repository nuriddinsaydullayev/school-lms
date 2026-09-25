import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import HomeworkList from '@/components/student/HomeworkList'
import { getStudentAssignments } from '@/app/actions/homework'
import { CheckCircle, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'My Assignments' }
export const revalidate = 60

export default async function StudentAssignmentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel fetch: Pending assignments (Server Action) and Completed submissions
  const [pendingAssignments, { data: submissions }] = await Promise.all([
    getStudentAssignments(),
    supabase
      .from('submissions')
      .select(`
        *,
        assignments!inner(
          title, max_score, xp_reward, token_reward, classes(name)
        )
      `)
      .eq('student_id', user.id)
      .in('status', ['submitted', 'graded', 'returned'])
      .order('submitted_at', { ascending: false })
  ])

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assignments</h1>
        <p className="text-sm text-slate-500 mt-1">Track your pending work and review graded submissions.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" /> Pending Tasks
          </h2>
          {pendingAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
              You have no pending assignments right now. Enjoy your free time!
            </div>
          ) : (
            <HomeworkList assignments={pendingAssignments} />
          )}
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4 pt-4 border-t border-slate-200">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> Completed & Graded
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!submissions || submissions.length === 0 ? (
              <div className="col-span-full bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
                You haven't completed any assignments yet.
              </div>
            ) : (
              submissions.map((sub: any) => {
                const assign = sub.assignments
                const isGraded = sub.status === 'graded'

                return (
                  <div key={sub.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{assign.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{assign.classes?.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                        isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sub.status}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
                      <div className="text-slate-500 text-xs">
                        Submitted: <span className="font-medium text-slate-700">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                      </div>
                      {isGraded ? (
                        <div className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {sub.score} / {assign.max_score}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-xs">Waiting for grade...</div>
                      )}
                    </div>
                    {isGraded && sub.feedback && (
                      <div className="mt-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-sm text-slate-700">
                        <span className="font-semibold text-emerald-700 text-xs uppercase block mb-1">Teacher Feedback</span>
                        {sub.feedback}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
