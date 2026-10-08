'use client'

import { useState, useTransition } from 'react'
import { Coins, Loader2, X, PlusCircle, MinusCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { manageStudentTokens } from '@/app/actions/teacher'
import { useRouter } from 'next/navigation'

interface StudentItem {
  id: string
  full_name: string
  avatar_url: string | null
  token_balance: number
  enrolled_at: string
}

interface StudentTokenManagerProps {
  students: StudentItem[]
}

export default function StudentTokenManager({ students }: StudentTokenManagerProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null)
  const [mode, setMode] = useState<'reward' | 'deduct'>('reward')
  const [amount, setAmount] = useState<number>(10)
  const [reason, setReason] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleOpenModal(student: StudentItem, defaultMode: 'reward' | 'deduct' = 'reward') {
    setSelectedStudent(student)
    setMode(defaultMode)
    setAmount(10)
    setReason('')
  }

  function handleCloseModal() {
    setSelectedStudent(null)
    setReason('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      toast.error('Please provide a reason for this token adjustment.')
      return
    }

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid positive token amount.')
      return
    }

    const calculatedAmount = mode === 'reward' ? amount : -amount

    startTransition(async () => {
      const res = await manageStudentTokens({
        studentId: selectedStudent.id,
        amount: calculatedAmount,
        reason: trimmedReason,
      })

      if (res.success) {
        toast.success(
          mode === 'reward'
            ? `Awarded ${amount} tokens to ${selectedStudent.full_name}! 🪙`
            : `Deducted ${amount} tokens from ${selectedStudent.full_name}.`
        )
        handleCloseModal()
        router.refresh()
      } else {
        toast.error(res.error || 'Failed to adjust student tokens.')
      }
    })
  }

  return (
    <div>
      {/* ── Table of Students ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Token Balance</th>
              <th className="py-3 px-4">Enrolled On</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No students enrolled in this class yet. Share the join code with your class!
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Avatar & Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.full_name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              student.full_name
                            )}`
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {student.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 text-sm leading-tight">
                          {student.full_name}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Token Balance */}
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 font-bold text-xs tabular-nums">
                      <Coins size={13} className="text-amber-500" />
                      {student.token_balance}
                    </div>
                  </td>

                  {/* Enrolled Date */}
                  <td className="py-3.5 px-4 text-xs text-slate-400">
                    {new Date(student.enrolled_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenModal(student)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                    >
                      <Coins size={14} className="text-indigo-600" />
                      Manage Tokens
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Manage Tokens Modal ── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Manage Tokens
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adjust balance for <span className="font-semibold text-slate-700">{selectedStudent.full_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Current Balance:</span>
              <span className="font-bold text-amber-600 text-sm flex items-center gap-1 tabular-nums">
                <Coins size={14} />
                {selectedStudent.token_balance} Tokens
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Reward vs Deduct Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('reward')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                    mode === 'reward'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle size={14} />
                  Reward (+)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('deduct')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                    mode === 'deduct'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MinusCircle size={14} />
                  Deduct (-)
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Token Amount
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Reason / Description
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder={
                    mode === 'reward'
                      ? 'e.g. Active participation in class discussion'
                      : 'e.g. Missed classroom duty / disruption'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                />
                <p className="text-[11px] text-slate-400">
                  This note will be recorded in the student&apos;s token ledger history.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !reason.trim() || amount <= 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 ${
                    mode === 'reward'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  }`}
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : mode === 'reward' ? (
                    `Award +${amount}`
                  ) : (
                    `Deduct -${amount}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
