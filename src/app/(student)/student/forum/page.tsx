'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  Search,
  Coins,
  MessageCircle,
  ThumbsUp,
  CheckCircle2,
  Clock,
  Plus,
  X,
  ChevronDown,
  Loader2,
  BookOpen,
  Send,
  User,
  Flame,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Lock,
  Trophy,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getForumData, askQuestion, postAnswer } from '@/app/actions/forum'
import {
  FORUM_SUBJECTS,
  FORUM_GRADES,
  CLOSE_AFTER_HOURS,
  hardQuestionBonus,
  type ForumQuestionDTO,
  type ForumAnswerDTO,
  type AcceptResult,
  type CloseResult,
  type QualityTier,
} from '@/types/forum'

// ── Types & constants ─────────────────────────────────────────────────────────
type SubjectFilter = 'All' | (typeof FORUM_SUBJECTS)[number]
type GradeFilter   = 'all' | number
const SUBJECT_FILTERS: SubjectFilter[] = ['All', ...FORUM_SUBJECTS]

const SUBJECT_COLORS: Record<string, string> = {
  All:        'bg-slate-100 text-slate-600',
  Math:       'bg-indigo-100 text-indigo-700',
  Physics:    'bg-sky-100 text-sky-700',
  Chemistry:  'bg-emerald-100 text-emerald-700',
  Literature: 'bg-violet-100 text-violet-700',
  History:    'bg-amber-100 text-amber-700',
  English:    'bg-rose-100 text-rose-700',
  Other:      'bg-slate-100 text-slate-600',
}

const TIER_LABELS: Record<QualityTier, string> = {
  excellent: '✨ Excellent',
  good:      '👍 Good',
  partial:   '⚠️ Partial',
  poor:      '❌ Incorrect',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

// ── Ask Question Modal ────────────────────────────────────────────────────────
function AskModal({
  balance,
  onClose,
  onPosted,
}: {
  balance:  number
  onClose:  () => void
  onPosted: () => void
}) {
  const [title,       setTitle]       = useState('')
  const [body,        setBody]        = useState('')
  const [subject,     setSubject]     = useState<string>('Math')
  const [targetGrade, setTargetGrade] = useState<string>('')        // '' = all grades
  const [bounty,      setBounty]      = useState(10)
  const [isAiGraded,  setIsAiGraded]  = useState(false)
  const [isPending,   start]          = useTransition()

  const insufficient = bounty > balance

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await askQuestion({
        title,
        body,
        subject,
        bounty,
        targetGrade: targetGrade === '' ? null : Number(targetGrade),
        isAiGraded,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to post question')
        return
      }
      toast.success(`Question posted! ${bounty} tokens reserved as bounty 🎯`)
      onPosted()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Ask a Question</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Your Question</label>
            <input
              required
              minLength={5}
              maxLength={200}
              placeholder="e.g. How do I solve quadratic equations?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Details (optional)</label>
            <textarea
              rows={3}
              placeholder="Add any extra context or what you've already tried..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-7"
                >
                  {FORUM_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Grade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</label>
              <div className="relative">
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-7"
                >
                  <option value="">All grades</option>
                  {FORUM_GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Bounty */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bounty 🪙</label>
              <input
                type="number"
                min={5}
                max={100}
                value={bounty}
                onChange={(e) => setBounty(Number(e.target.value))}
                className={`w-full px-3 py-2.5 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  insufficient ? 'border-rose-300' : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          <p className={`text-[11px] ${insufficient ? 'text-rose-500' : 'text-slate-400'}`}>
            {insufficient
              ? `Not enough tokens — your balance is ${balance}.`
              : `The bounty is reserved from your balance (${balance} 🪙) and paid to the answer you accept. Unresolved after ${CLOSE_AFTER_HOURS}h? Close it to get it back.`}
          </p>

          {/* AI grading toggle */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-violet-200 bg-violet-50/60 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={isAiGraded}
              onClick={() => setIsAiGraded((v) => !v)}
              className={`relative flex-shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors ${
                isAiGraded ? 'bg-violet-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isAiGraded ? 'translate-x-4' : ''
                }`}
              />
            </button>
            <span className="text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-violet-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Enable AI Grading for answers
              </span>
              When you accept an answer, AI checks its accuracy and pays 100 / 75 / 40 / 0 % of the bounty.
              The unpaid part comes back to you.
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending || title.trim().length < 5 || insufficient}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post Question
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Answer Input ──────────────────────────────────────────────────────────────
function AnswerInput({ questionId, onPosted }: { questionId: string; onPosted: () => void }) {
  const [text, setText]    = useState('')
  const [isPending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    start(async () => {
      const res = await postAnswer(questionId, text)
      if (!res.success) {
        toast.error(res.error ?? 'Failed to post answer')
        return
      }
      setText('')
      toast.success('Answer posted! Tokens are paid if it gets accepted. 🪙')
      onPosted()
    })
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer here…"
        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="self-end flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Answer
      </button>
    </form>
  )
}

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({
  q,
  currentUserId,
  onAccept,
  onClose,
  onChanged,
}: {
  q:             ForumQuestionDTO
  currentUserId: string | null
  onAccept:      (q: ForumQuestionDTO, a: ForumAnswerDTO) => Promise<void>
  onClose:       (q: ForumQuestionDTO) => Promise<void>
  onChanged:     () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy,     setBusy]     = useState<string | null>(null)   // answerId | 'close'

  const isMine      = !!currentUserId && q.authorId === currentUserId
  const isOpen      = q.status === 'open'
  const hasAccepted = q.answers.some((a) => a.isAccepted)
  const ageHrs      = hoursSince(q.createdAt)
  const canClose    = isMine && isOpen && !hasAccepted && ageHrs >= CLOSE_AFTER_HOURS
  const othersAnswered = q.answers.some((a) => a.authorId !== q.authorId)

  async function run(key: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(key)
    try { await fn() } finally { setBusy(null) }
  }

  const badgeTone =
    q.status === 'solved' ? 'emerald' : q.status === 'closed' ? 'slate' : q.answers.length === 0 ? 'rose' : 'amber'
  const toneCls: Record<string, string> = {
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-600',
    slate:   'border-slate-200 bg-slate-50 text-slate-500',
    rose:    'border-rose-200 bg-rose-50 text-rose-500',
    amber:   'border-amber-200 bg-amber-50 text-amber-600',
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all ${
      q.status === 'solved' ? 'border-emerald-200' : 'border-slate-100 hover:border-slate-200'
    }`}>
      <div className="px-5 pt-4 pb-3 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start gap-3">
          {/* Bounty badge */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${toneCls[badgeTone]}`}>
            <Coins className="w-4 h-4" />
            <span className="text-xs font-bold tabular-nums mt-0.5">{q.bounty}</span>
            <span className="text-[8px] text-slate-400 uppercase tracking-wider">tokens</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${SUBJECT_COLORS[q.subject] ?? SUBJECT_COLORS.Other}`}>
                {q.subject}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                <GraduationCap className="w-3 h-3" />
                {q.targetGrade ? `Grade ${q.targetGrade}` : 'All grades'}
              </span>
              {q.isAiGraded && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> AI graded
                </span>
              )}
              {q.status === 'solved' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </span>
              )}
              {q.status === 'closed' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Closed
                </span>
              )}
              {isOpen && q.answers.length === 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" /> Needs answer
                </span>
              )}
            </div>

            <h3 className="font-semibold text-slate-800 text-sm leading-snug">{q.title}</h3>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{q.authorName}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(q.createdAt)}</span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {q.answers.length} answer{q.answers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5">
          {q.body && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-4 leading-relaxed border border-slate-100 whitespace-pre-wrap">
              {q.body}
            </p>
          )}

          {/* Author tools: Close & Claim Reward */}
          {isMine && isOpen && !hasAccepted && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2 flex-1 text-xs text-amber-800">
                <Trophy className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {canClose
                    ? othersAnswered
                      ? `No answer good enough? Close it to get your ${q.bounty} tokens back.`
                      : `Nobody could answer this one! Close it to get ${q.bounty} tokens back + a ${hardQuestionBonus(q.bounty)}-token hard-question bonus.`
                    : `If no answer is accepted within ${CLOSE_AFTER_HOURS}h, you can close this and reclaim your bounty (available in ${Math.ceil(CLOSE_AFTER_HOURS - ageHrs)}h).`}
                </span>
              </div>
              <button
                onClick={() => run('close', () => onClose(q))}
                disabled={!canClose || !!busy}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'close' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Close &amp; Claim Reward
              </button>
            </div>
          )}

          {q.answers.length > 0 && (
            <div className="space-y-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Answers</p>
              {q.answers.map((ans) => {
                // Accept is hidden for self-authored answers (exploit guard; API also enforces)
                const canAccept = isMine && isOpen && ans.authorId !== q.authorId
                return (
                  <div
                    key={ans.id}
                    className={`rounded-xl px-4 py-3 border ${ans.isAccepted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}
                  >
                    {ans.isAccepted && (
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accepted Answer — bounty awarded
                      </div>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ans.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{ans.authorName}</span>
                      <span>{timeAgo(ans.createdAt)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{ans.likes}</span>

                      {canAccept && (
                        <button
                          onClick={() => run(ans.id, () => onAccept(q, ans))}
                          disabled={!!busy}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {busy === ans.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" />{q.isAiGraded ? 'AI grading…' : 'Accepting…'}</>
                          ) : (
                            <>{q.isAiGraded ? <Sparkles className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}Accept</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {isOpen && <AnswerInput questionId={q.id} onPosted={onChanged} />}
        </div>
      )}
    </div>
  )
}

// ── Main Forum Page ───────────────────────────────────────────────────────────
export default function ForumPage() {
  const [questions,     setQuestions]   = useState<ForumQuestionDTO[]>([])
  const [currentUserId, setUserId]      = useState<string | null>(null)
  const [balance,       setBalance]     = useState(0)
  const [loadError,     setLoadError]   = useState<string | null>(null)
  const [loading,       setLoading]     = useState(true)

  const [activeSubject, setSubject]     = useState<SubjectFilter>('All')
  const [activeGrade,   setGrade]       = useState<GradeFilter>('all')
  const [search,        setSearch]      = useState('')
  const [sortBy,        setSortBy]      = useState<'newest' | 'bounty' | 'unanswered'>('newest')
  const [showAskModal,  setShowModal]   = useState(false)

  const refresh = useCallback(async () => {
    const data = await getForumData()
    setQuestions(data.questions)
    setUserId(data.currentUserId)
    setBalance(data.balance)
    setLoadError(data.error ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // ── Derived list ────────────────────────────────────────────
  const filtered = questions
    .filter((q) => activeSubject === 'All' || q.subject === activeSubject)
    .filter((q) => activeGrade === 'all' || q.targetGrade === activeGrade || q.targetGrade === null)
    .filter((q) =>
      !search.trim() ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'bounty')     return b.bounty - a.bounty
      if (sortBy === 'unanswered') return a.answers.length - b.answers.length
      return b.createdAt.localeCompare(a.createdAt)
    })

  const openQs          = questions.filter((q) => q.status === 'open')
  const unansweredCount = openQs.filter((q) => q.answers.length === 0).length
  const totalBounty     = openQs.reduce((s, q) => s + q.bounty, 0)

  // ── Accept an answer (server decides payout) ────────────────
  const handleAccept = useCallback(async (q: ForumQuestionDTO, a: ForumAnswerDTO) => {
    if (a.authorId === q.authorId) {
      toast.error('You cannot accept your own answer.')
      return
    }
    try {
      const res = await fetch('/api/forum/accept-answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ questionId: q.id, answerId: a.id }),
      })
      const result: AcceptResult = await res.json()

      if (!res.ok && res.status !== 207) {
        toast.error(result.error ?? `Server error (${res.status})`)
      } else if (result.warning) {
        toast(result.warning, { icon: '⚠️', duration: 6000 })
      } else if (result.aiVerified && result.qualityTier) {
        toast.success(
          `AI graded: ${TIER_LABELS[result.qualityTier]} — ${result.tokensAwarded}/${q.bounty} tokens to ${a.authorName}` +
            (result.refunded ? `, ${result.refunded} refunded to you` : '') +
            (result.aiRationale ? `\n"${result.aiRationale}"` : ''),
          { icon: '🤖', duration: 7000 }
        )
      } else {
        toast.success(`Answer accepted! +${result.tokensAwarded} tokens sent to ${a.authorName}. 🪙`)
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      await refresh()
    }
  }, [refresh])

  // ── Close & claim reward ────────────────────────────────────
  const handleClose = useCallback(async (q: ForumQuestionDTO) => {
    if (!window.confirm('Close this question? No one will be able to answer it afterwards.')) return
    try {
      const res = await fetch('/api/forum/close-question', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ questionId: q.id }),
      })
      const result: CloseResult = await res.json()

      if (!res.ok && res.status !== 207) {
        toast.error(result.error ?? `Server error (${res.status})`)
      } else if (result.warning) {
        toast(result.warning, { icon: '⚠️', duration: 6000 })
      } else {
        toast.success(
          `Question closed. +${result.refunded ?? 0} refunded` +
            (result.bonus ? ` +${result.bonus} hard-question bonus 🏆` : '') +
            (result.bonusSkippedReason ? `\n${result.bonusSkippedReason}` : ''),
          { duration: 6000 }
        )
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      await refresh()
    }
  }, [refresh])

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {showAskModal && (
        <AskModal balance={balance} onClose={() => setShowModal(false)} onPosted={refresh} />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Forum</h1>
            <p className="text-sm text-slate-500 mt-0.5">Answer questions, earn token bounties</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700 tabular-nums">
            <Coins className="w-4 h-4" /> {balance}
          </span>
          <button
            onClick={() => setShowModal(true)}
            disabled={!!loadError}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ask a Question
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {loadError}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open questions',   value: openQs.length,      color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Need answers',     value: unansweredCount,    color: 'text-rose-600 bg-rose-50' },
          { label: 'Tokens available', value: `${totalBounty}🪙`, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border border-slate-100 p-4 text-center ${color.split(' ')[1]}`}>
            <p className={`text-xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Grade filter */}
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={activeGrade}
            onChange={(e) => setGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All grades</option>
            {FORUM_GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="newest">Newest first</option>
            <option value="bounty">Highest bounty</option>
            <option value="unanswered">Unanswered first</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Subject pills ── */}
      <div className="flex flex-wrap gap-2">
        {SUBJECT_FILTERS.map((s) => {
          const count = s === 'All' ? questions.length : questions.filter((q) => q.subject === s).length
          return (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                activeSubject === s
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              {s}
              <span className={`tabular-nums ${activeSubject === s ? 'opacity-70' : 'text-slate-400'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Question list ── */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">No questions found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search || activeGrade !== 'all' || activeSubject !== 'All'
                ? 'Try changing your filters.'
                : 'Be the first to ask one!'}
            </p>
          </div>
        ) : (
          filtered.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              currentUserId={currentUserId}
              onAccept={handleAccept}
              onClose={handleClose}
              onChanged={refresh}
            />
          ))
        )}
      </div>
    </div>
  )
}
