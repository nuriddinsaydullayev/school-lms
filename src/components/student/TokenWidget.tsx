import { Coins, TrendingUp, Crown, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react'
import type { Database } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────
type TokenRow    = Database['public']['Tables']['tokens']['Row']
type TokenBalance = Database['public']['Views']['token_balances']['Row']

export interface TokenWidgetProps {
  balance: TokenBalance
  recentTransactions: TokenRow[]
  rank: number
  totalStudents: number
}

// ── Sub-components ─────────────────────────────────────────────
function TransactionRow({ tx }: { tx: TokenRow }) {
  const isCredit = tx.type === 'earned' || tx.type === 'bonus'

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
        tx.type === 'bonus' ? 'bg-yellow-50' :
        isCredit            ? 'bg-emerald-50' :
                              'bg-rose-50'
      }`}>
        {tx.type === 'bonus'  ? <Zap            className="w-3.5 h-3.5 text-yellow-500"  /> :
         isCredit             ? <ArrowUpRight   className="w-3.5 h-3.5 text-emerald-500" /> :
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500"    />}
      </div>

      <p className="flex-1 text-xs text-slate-600 leading-tight truncate">
        {tx.reason}
      </p>

      <span className={`text-xs font-bold flex-shrink-0 ${
        tx.type === 'bonus' ? 'text-yellow-600'  :
        isCredit            ? 'text-emerald-600' :
                              'text-rose-500'
      }`}>
        {isCredit ? '+' : '−'}{tx.amount}
      </span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function TokenWidget({
  balance,
  recentTransactions,
  rank,
  totalStudents,
}: TokenWidgetProps) {
  const currentBalance = balance.balance ?? 0
  const totalEarned    = balance.total_earned ?? 0
  const totalSpent     = balance.total_spent  ?? 0
  const rankPct        = totalStudents > 1
    ? Math.round(((totalStudents - rank) / (totalStudents - 1)) * 100)
    : 100

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-50">
          <Coins className="w-4 h-4 text-yellow-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Token Wallet</h2>
          <p className="text-xs text-slate-400">Gamification currency</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Balance + Rank */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-yellow-100 mb-1">Balance</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold leading-none">{currentBalance}</span>
              <span className="text-sm font-medium text-yellow-200 mb-0.5">tkn</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-indigo-200 mb-1">Class Rank</p>
            <div className="flex items-end gap-1">
              <Crown className="w-4 h-4 text-yellow-300 mb-1" />
              <span className="text-3xl font-bold leading-none">#{rank}</span>
            </div>
            <p className="text-xs text-indigo-200 mt-1">of {totalStudents} students</p>
          </div>
        </div>

        {/* Rank progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Top {100 - rankPct}% of class</span>
            </div>
            <span className="text-slate-400">Rank {rank}/{totalStudents}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              style={{ width: `${rankPct}%` }}
            />
          </div>
        </div>

        {/* Earned / Spent */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-emerald-50 rounded-xl py-3 px-4">
            <p className="text-lg font-bold text-emerald-700">+{totalEarned}</p>
            <p className="text-xs text-emerald-600">Total Earned</p>
          </div>
          <div className="bg-rose-50 rounded-xl py-3 px-4">
            <p className="text-lg font-bold text-rose-600">−{totalSpent}</p>
            <p className="text-xs text-rose-500">Total Spent</p>
          </div>
        </div>

        {/* Recent activity */}
        {recentTransactions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Recent Activity
            </p>
            <div className="divide-y divide-slate-50">
              {recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </div>
        )}

        {recentTransactions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">
            No transactions yet. Submit an assignment to earn tokens!
          </p>
        )}
      </div>
    </div>
  )
}
