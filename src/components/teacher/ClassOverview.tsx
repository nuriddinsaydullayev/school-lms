import { Users, BookOpen } from 'lucide-react'
import type { ClassRow } from '@/types/database.types'

interface ClassOverviewProps {
  classes: (ClassRow & { _count?: { enrollments: number } })[]
}

export default function ClassOverview({ classes }: ClassOverviewProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
          <BookOpen className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">My Classes</h2>
          <p className="text-xs text-slate-400">Active sections you manage</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {classes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500">No active classes yet.</p>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{cls.name}</h3>
                  {cls.subject && (
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {cls.subject}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Users size={14} />
                    <span className="text-xs font-semibold">{cls._count?.enrollments ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100/50">
                <p className="text-xs text-slate-500">
                  Join code: <span className="font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">{cls.join_code}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
