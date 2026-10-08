'use client'

import { useState, useTransition } from 'react'
import {
  Users,
  Search,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2,
  UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { updateUserRole } from '@/app/actions/admin'
import type { UserRole } from '@/types/database.types'

export interface UserRowItem {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  xp_points: number
  level: number
}

interface UserRoleManagerProps {
  initialUsers: UserRowItem[]
  currentAdminId: string
}

export default function UserRoleManager({ initialUsers, currentAdminId }: UserRoleManagerProps) {
  const [users, setUsers] = useState<UserRowItem[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  function handleRoleChange(userId: string, newRole: UserRole) {
    if (userId === currentAdminId && newRole !== 'admin') {
      toast.error('You cannot change your own admin role.')
      return
    }

    setUpdatingId(userId)

    startTransition(async () => {
      const res = await updateUserRole({ userId, newRole })
      if (res.success) {
        toast.success(`Role updated to ${newRole}!`)
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
      } else {
        toast.error(res.error || 'Failed to update role')
      }
      setUpdatingId(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterRole === r
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Level / XP</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === currentAdminId
                  const isUpdating = updatingId === u.id

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              u.full_name?.charAt(0)?.toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {u.full_name}
                              {isCurrentAdmin && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              ID: {u.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'teacher'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {u.role === 'admin' && <ShieldAlert size={12} />}
                          {u.role === 'teacher' && <UserCheck size={12} />}
                          {u.role === 'student' && <GraduationCap size={12} />}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="font-medium">Lvl {u.level}</div>
                        <div className="text-slate-400">{u.xp_points} XP</div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isUpdating ? (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Loader2 size={14} className="animate-spin text-amber-600" />
                              Updating...
                            </div>
                          ) : (
                            <select
                              value={u.role}
                              disabled={isCurrentAdmin || isPending}
                              onChange={(e) =>
                                handleRoleChange(u.id, e.target.value as UserRole)
                              }
                              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
