'use client'

import { useTransition } from 'react'
import { Coins, Loader2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { purchaseReward } from '@/app/actions/rewards'
import { REWARD_ITEMS, type RewardItem } from '@/lib/rewards/catalog'

export default function RewardStore({ currentBalance }: { currentBalance: number }) {
  const [isPending, startTransition] = useTransition()

  function handlePurchase(item: RewardItem) {
    if (currentBalance < item.cost) {
      toast.error("You don't have enough tokens!")
      return
    }

    startTransition(async () => {
      const res = await purchaseReward(item.id)
      if (res.success) {
        toast.success(`Successfully purchased: ${item.name}! Voucher: ${res.voucherCode ?? ''}`)
      } else {
        toast.error(res.error || 'Failed to purchase item.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Coins className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Your Balance</p>
            <p className="text-xs text-slate-500">Spend your tokens on cool rewards!</p>
          </div>
        </div>
        <div className="text-2xl font-bold text-violet-600 tabular-nums">
          {currentBalance} <span className="text-sm font-medium text-slate-400">Tokens</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REWARD_ITEMS.map((item) => {
          const canAfford = currentBalance >= item.cost

          return (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 flex-1 flex flex-col items-center text-center space-y-3">
                <div className="text-5xl mb-2">{item.icon}</div>
                <h3 className="font-bold text-slate-800 text-lg">{item.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford || isPending}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                    canAfford
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Coins size={18} className={canAfford ? 'text-violet-200' : 'text-slate-300'} />
                      {item.cost} Tokens
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
