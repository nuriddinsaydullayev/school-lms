import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { Trophy, Medal, Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Leaderboard' }
export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // Fetch top 50 students by XP
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, xp_points, level')
    .eq('role', 'student')
    .order('xp_points', { ascending: false })
    .limit(50)

  // Fetch current user so we can highlight them
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-2 shadow-sm border border-amber-200">
          <Trophy className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Leaderboard</h1>
        <p className="text-slate-500">Top students ranked by total XP earned.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Rank & Student</span>
          <div className="flex gap-8 text-right">
            <span className="w-12">Level</span>
            <span className="w-16">Total XP</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {!students || students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No students found.</div>
          ) : (
            students.map((student, index) => {
              const rank = index + 1
              const isCurrentUser = user && student.id === user.id
              
              let RankIcon = null
              let rankColor = 'text-slate-400 bg-slate-100'
              
              if (rank === 1) {
                RankIcon = Medal
                rankColor = 'text-amber-500 bg-amber-50 border border-amber-200'
              } else if (rank === 2) {
                RankIcon = Medal
                rankColor = 'text-slate-400 bg-slate-50 border border-slate-200'
              } else if (rank === 3) {
                RankIcon = Medal
                rankColor = 'text-orange-600 bg-orange-50 border border-orange-200'
              }

              return (
                <div 
                  key={student.id} 
                  className={`flex items-center justify-between px-6 py-4 transition-colors ${
                    isCurrentUser ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${rankColor}`}>
                      {RankIcon ? <RankIcon size={16} /> : rank}
                    </div>
                    <div>
                      <p className={`font-semibold ${isCurrentUser ? 'text-indigo-900' : 'text-slate-800'} flex items-center gap-2`}>
                        {student.full_name}
                        {isCurrentUser && <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">You</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 text-right">
                    <div className="w-12 flex items-center justify-end gap-1 font-medium text-slate-700">
                      <Sparkles size={12} className="text-amber-400" /> {student.level}
                    </div>
                    <div className="w-16 font-bold text-slate-900 tabular-nums">
                      {student.xp_points}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
