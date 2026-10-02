'use client'

import { useState } from 'react'
import {
  Trophy,
  Medal,
  Sparkles,
  Users,
  User,
  Flame,
  Coins,
  TrendingUp,
  Award,
} from 'lucide-react'

interface StudentRecord {
  id: string
  full_name: string
  xp_points: number
  level: number
}

interface LeaderboardViewProps {
  students: StudentRecord[]
  currentUserId?: string
}

// Mock Inter-Class Data
interface ClassRank {
  id: string
  name: string
  grade: string
  totalTokens: number
  studentCount: number
  avgTokens: number
  completionRate: number
  color: string
}

const MOCK_CLASS_RANKS: ClassRank[] = [
  {
    id: 'c1',
    name: '10-A',
    grade: 'Grade 10',
    totalTokens: 1420,
    studentCount: 28,
    avgTokens: 50.7,
    completionRate: 94,
    color: 'from-amber-400 to-amber-600',
  },
  {
    id: 'c2',
    name: '10-B',
    grade: 'Grade 10',
    totalTokens: 1070,
    studentCount: 26,
    avgTokens: 41.1,
    completionRate: 88,
    color: 'from-slate-300 to-slate-500',
  },
  {
    id: 'c3',
    name: '11-A',
    grade: 'Grade 11',
    totalTokens: 980,
    studentCount: 24,
    avgTokens: 40.8,
    completionRate: 82,
    color: 'from-amber-600 to-orange-700',
  },
  {
    id: 'c4',
    name: '9-A',
    grade: 'Grade 9',
    totalTokens: 820,
    studentCount: 30,
    avgTokens: 27.3,
    completionRate: 76,
    color: 'from-indigo-400 to-indigo-600',
  },
  {
    id: 'c5',
    name: '9-B',
    grade: 'Grade 9',
    totalTokens: 690,
    studentCount: 29,
    avgTokens: 23.8,
    completionRate: 70,
    color: 'from-sky-400 to-sky-600',
  },
]

export default function LeaderboardView({
  students,
  currentUserId,
}: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'class'>('individual')

  const topClass = MOCK_CLASS_RANKS[0]
  const secondClass = MOCK_CLASS_RANKS[1]
  const tokenLead = topClass.totalTokens - secondClass.totalTokens

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 mb-2 shadow-sm border border-amber-300/60">
          <Trophy className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leaderboard</h1>
        <p className="text-slate-500 text-sm">
          Climb the ranks, earn bragging rights, and lead your class to victory.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'individual'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User size={16} />
            Individual Rank
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'class'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            Class vs Class
          </button>
        </div>
      </div>

      {/* ── Tab 1: Individual Rank ── */}
      {activeTab === 'individual' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Rank &amp; Student</span>
            <div className="flex gap-8 text-right">
              <span className="w-12">Level</span>
              <span className="w-20">Total XP</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {!students || students.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No students found.</div>
            ) : (
              students.map((student, index) => {
                const rank = index + 1
                const isCurrentUser = currentUserId && student.id === currentUserId

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
                          {isCurrentUser && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-right">
                      <div className="w-12 flex items-center justify-end gap-1 font-medium text-slate-700">
                        <Sparkles size={12} className="text-amber-400" /> {student.level}
                      </div>
                      <div className="w-20 font-bold text-slate-900 tabular-nums">
                        {student.xp_points} XP
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Class vs Class ── */}
      {activeTab === 'class' && (
        <div className="space-y-6">
          {/* Rivalry Highlight Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-yellow-200 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-100 bg-white/15 px-2 py-0.5 rounded-full inline-block mb-1">
                  Grade 10 Rivalry
                </span>
                <h3 className="text-xl font-bold">
                  {topClass.name} is leading {secondClass.name} by {tokenLead} tokens! 🏆
                </h3>
                <p className="text-amber-100 text-xs mt-0.5">
                  Complete your homework and forum bounties to push your class to #1!
                </p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5 text-center flex-shrink-0 border border-white/20">
              <p className="text-[10px] font-semibold text-amber-100 uppercase tracking-wide">Season Ends</p>
              <p className="text-base font-bold">Friday, 5:00 PM</p>
            </div>
          </div>

          {/* Class Leaderboard Cards */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Class Rank</span>
              <div className="flex gap-8 text-right">
                <span className="w-20 hidden sm:inline">Students</span>
                <span className="w-20 hidden sm:inline">Avg / Student</span>
                <span className="w-24">Total Tokens</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {MOCK_CLASS_RANKS.map((cls, index) => {
                const rank = index + 1
                const maxTokens = MOCK_CLASS_RANKS[0].totalTokens
                const barWidth = Math.round((cls.totalTokens / maxTokens) * 100)

                return (
                  <div key={cls.id} className="px-6 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            rank === 1
                              ? 'text-amber-600 bg-amber-50 border border-amber-200'
                              : rank === 2
                              ? 'text-slate-500 bg-slate-100 border border-slate-200'
                              : rank === 3
                              ? 'text-orange-700 bg-orange-50 border border-orange-200'
                              : 'text-slate-400 bg-slate-50'
                          }`}
                        >
                          {rank === 1 ? <Award size={16} /> : rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-base">{cls.name}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              {cls.grade}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 text-right">
                        <span className="w-20 text-xs text-slate-500 hidden sm:inline">
                          {cls.studentCount} students
                        </span>
                        <span className="w-20 text-xs font-medium text-slate-700 hidden sm:inline">
                          {cls.avgTokens} 🪙
                        </span>
                        <div className="w-24 font-bold text-slate-900 flex items-center justify-end gap-1 tabular-nums">
                          <Coins size={14} className="text-amber-500" />
                          {cls.totalTokens}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden ml-11 max-w-[calc(100%-2.75rem)]">
                      <div
                        className={`h-full bg-gradient-to-r ${cls.color} rounded-full transition-all duration-700`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
