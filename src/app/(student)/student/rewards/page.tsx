'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Coins,
  Gift,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  School,
  X,
  History,
  Tag,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { purchaseReward, getStudentRewardsData } from '@/app/actions/rewards'
import { REWARD_ITEMS, type RewardItem } from '@/lib/rewards/catalog'

// ── Types ─────────────────────────────────────────────────────────────────────
type RewardCategory = 'all' | 'privilege' | 'gift'

interface Redemption {
  id: string
  itemName: string
  cost: number
  redeemedAt: string | Date
  code: string
  status?: string
}

// Store items live in @/lib/rewards/catalog — prices are enforced server-side.

export default function RewardsPage() {
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true)
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>('all')
  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null)
  const [isConfirming, setIsConfirming] = useState<boolean>(false)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()

  // ── Load Real Supabase Balance & Redemptions on Mount ───────
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getStudentRewardsData()
        setBalance(data.balance ?? 0)
        if (data.redemptions && data.redemptions.length > 0) {
          setRedemptions(data.redemptions)
        }
      } catch (err) {
        console.error('Failed to load rewards data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [])

  const privileges = REWARD_ITEMS.filter((item) => item.category === 'privilege')
  const gifts = REWARD_ITEMS.filter((item) => item.category === 'gift')

  function handleOpenRedeem(item: RewardItem) {
    if (balance < item.cost) {
      toast.error(`You need ${item.cost - balance} more tokens to redeem this reward!`)
      return
    }
    setSelectedItem(item)
    setIsConfirming(true)
  }

  function handleConfirmRedeem() {
    if (!selectedItem || balance < selectedItem.cost) return

    startTransition(async () => {
      // Only the item id is sent — the server looks up the price.
      const res = await purchaseReward(selectedItem.id)

      if (res.success && res.voucherCode) {
        const voucherCode = res.voucherCode

        if (res.remainingBalance !== undefined) {
          setBalance(res.remainingBalance)
        }

        setRedemptions((prev) => [
          {
            id: res.redemptionId ?? voucherCode,
            itemName: selectedItem.name,
            cost: selectedItem.cost,
            redeemedAt: new Date().toISOString(),
            code: voucherCode,
            status: 'active',
          },
          ...prev,
        ])

        toast.success(`🎉 Redeemed ${selectedItem.name}! Voucher code: ${voucherCode}`, {
          duration: 6000,
        })

        setIsConfirming(false)
        setSelectedItem(null)
      } else {
        toast.error(res.error || 'Failed to complete redemption.')
      }
    })
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* ── Redemption Confirmation Modal ── */}
      {isConfirming && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 mx-auto flex items-center justify-center text-3xl shadow-sm">
                {selectedItem.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Confirm Redemption</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to redeem{' '}
                  <span className="font-semibold text-slate-800">{selectedItem.name}</span>?
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Item Cost:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Coins size={15} className="text-amber-500" />
                    {selectedItem.cost} Tokens
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current Balance:</span>
                  <span className="font-medium text-slate-700">{balance} Tokens</span>
                </div>
                <div className="border-t border-slate-200/80 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-slate-700">Remaining Balance:</span>
                  <span className="text-indigo-600 font-bold">{balance - selectedItem.cost} Tokens</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsConfirming(false)
                    setSelectedItem(null)
                  }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleConfirmRedeem}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Redeeming…
                    </>
                  ) : (
                    'Confirm & Redeem'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Redemptions History Modal ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <History size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Redemption History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {redemptions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  No rewards redeemed yet. Spend your tokens below!
                </div>
              ) : (
                redemptions.map((red) => (
                  <div
                    key={red.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{red.itemName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Code: <span className="font-mono font-bold text-indigo-600">{red.code}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600 flex items-center justify-end gap-1">
                        <Coins size={12} />
                        -{red.cost}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {typeof red.redeemedAt === 'string'
                          ? new Date(red.redeemedAt).toLocaleDateString()
                          : red.redeemedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Hero Balance Card ── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-xl shadow-indigo-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200">
              <Sparkles size={14} className="text-amber-400" />
              Gamified Rewards Store
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Token Rewards Store</h1>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Exchange your earned learning tokens for real school perks, homework passes, and exclusive campus gifts!
            </p>
          </div>

          {/* Balance Widget */}
          <div className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[240px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 flex-shrink-0">
                <Coins size={24} className="text-amber-950" />
              </div>
              <div>
                <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider block">
                  Your Balance
                </span>
                <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                  {isLoadingData ? '…' : balance}
                </span>
                <span className="text-xs font-semibold text-amber-300 ml-1.5">Tokens</span>
              </div>
            </div>

            {redemptions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs flex flex-col items-center gap-1"
                title="View Redemption History"
              >
                <History size={16} />
                <span className="text-[10px]">History</span>
              </button>
            )}
          </div>
        </div>

        {/* Action strip to earn more tokens */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Tokens are earned automatically by completing homework &amp; answering forum questions.</span>
          </div>
          <Link
            href="/student/forum"
            className="font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition"
          >
            Earn more tokens in the Forum
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200 gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag size={14} />
            All Rewards ({REWARD_ITEMS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('privilege')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'privilege'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School size={14} />
            School Privileges ({privileges.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('gift')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'gift'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift size={14} />
            Brand Gifts ({gifts.length})
          </button>
        </div>

        {redemptions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            <History size={14} />
            My Vouchers ({redemptions.length})
          </button>
        )}
      </div>

      {/* ── Section 1: School Privileges ── */}
      {(selectedCategory === 'all' || selectedCategory === 'privilege') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-1 border-b border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <School size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">School Privileges</h2>
              <p className="text-xs text-slate-500">Class perks, late passes, and classroom privileges</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {privileges.map((item) => {
              const canAfford = balance >= item.cost
              const needed = item.cost - balance

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {item.stock && (
                      <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1 pt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {item.stock}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-base">
                      <Coins size={18} className="text-amber-500" />
                      <span>{item.cost}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Tokens</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRedeem(item)}
                      disabled={!canAfford || isPending}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <CheckCircle2 size={14} />
                          Redeem
                        </>
                      ) : (
                        <>
                          <Lock size={14} />
                          Need {needed} 🪙
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Section 2: Brand Gifts & Merch ── */}
      {(selectedCategory === 'all' || selectedCategory === 'gift') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 pb-1 border-b border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Brand Gifts &amp; Campus Merch</h2>
              <p className="text-xs text-slate-500">Vouchers, cafeteria treats, and physical school merchandise</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {gifts.map((item) => {
              const canAfford = balance >= item.cost
              const needed = item.cost - balance

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-violet-50/80 border border-violet-100/60 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {item.stock && (
                      <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1 pt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {item.stock}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-base">
                      <Coins size={18} className="text-amber-500" />
                      <span>{item.cost}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Tokens</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRedeem(item)}
                      disabled={!canAfford || isPending}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        canAfford
                          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <CheckCircle2 size={14} />
                          Redeem
                        </>
                      ) : (
                        <>
                          <Lock size={14} />
                          Need {needed} 🪙
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
