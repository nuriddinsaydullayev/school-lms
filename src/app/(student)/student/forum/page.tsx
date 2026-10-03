'use client'

import { useState, useTransition, useCallback } from 'react'
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
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────
type Subject =
  | 'All'
  | 'Math'
  | 'Physics'
  | 'Chemistry'
  | 'Literature'
  | 'History'
  | 'English'
  | 'Other'

/**
 * Subjects that trigger the AI quality-evaluation step.
 * Must match the set defined in /api/forum/accept-answer/route.ts.
 */
const AI_VERIFIED_SUBJECTS = new Set<Subject>([
  'History',
  'Literature',
  'English',
  'Chemistry',
  'Physics',
])

type QualityTier = 'excellent' | 'good' | 'partial' | 'poor'

interface Answer {
  id:         string
  authorId:   string   // UUID of the answer author (needed to reward correct user)
  authorName: string
  body:       string
  likes:      number
  isAccepted: boolean
  createdAt:  Date
}

interface Question {
  id:         string
  authorId:   string   // UUID of the question poster (determines who can Accept)
  authorName: string
  title:      string
  body:       string
  subject:    Subject
  bounty:     number
  answers:    Answer[]
  views:      number
  createdAt:  Date
  solved:     boolean
}

/** Payload returned by POST /api/forum/accept-answer */
interface AcceptResult {
  success:       boolean
  tokensAwarded: number
  qualityTier:   QualityTier
  aiRationale:   string | null
  aiVerified:    boolean
  warning?:      string
  error?:        string
}

// ── Mock data ─────────────────────────────────────────────────────────────────
// authorId = 'me' is used to decide whether the current viewer is the question author
// and therefore can show the Accept button. In production, compare against auth.user.id.
const MOCK_MY_ID = 'me'

const INITIAL_QUESTIONS: Question[] = [
  {
    id:         '1',
    authorId:   MOCK_MY_ID,   // "I" asked this — can Accept answers
    authorName: 'You',
    title:      'How do I solve quadratic equations by factoring?',
    body:       "I understand the formula method but I'm struggling with factoring. Can someone walk me through an example like x² + 5x + 6 = 0 step by step?",
    subject:    'Math',
    bounty:     20,
    views:      47,
    solved:     false,
    createdAt:  new Date(Date.now() - 2 * 3600_000),
    answers: [
      {
        id:         'a1',
        authorId:   'user-sara',
        authorName: 'Sara M.',
        body:       "To factor x² + 5x + 6, find two numbers that multiply to 6 and add to 5. Those are 2 and 3! So it becomes (x+2)(x+3) = 0, giving x = -2 or x = -3. 🎯",
        likes:      8,
        isAccepted: false,
        createdAt:  new Date(Date.now() - 1 * 3600_000),
      },
    ],
  },
  {
    id:         '2',
    authorId:   'user-nilufar',
    authorName: 'Nilufar K.',
    title:      "What is Newton's Third Law in simple words?",
    body:       "Our teacher explained it but I still can't picture it in real life. Any simple analogy would help!",
    subject:    'Physics',
    bounty:     15,
    views:      32,
    solved:     true,
    createdAt:  new Date(Date.now() - 5 * 3600_000),
    answers: [
      {
        id:         'a2',
        authorId:   'user-bobur',
        authorName: 'Bobur A.',
        body:       "Think of it this way: when you push against a wall, the wall pushes back on you with the same force. That's why you don't fall through it! Action = Reaction, always equal and opposite. 🧱",
        likes:      14,
        isAccepted: true,
        createdAt:  new Date(Date.now() - 4 * 3600_000),
      },
    ],
  },
  {
    id:         '3',
    authorId:   MOCK_MY_ID,   // "I" asked this — AI-verified subject (History)
    authorName: 'You',
    title:      'Key causes of World War I — summary?',
    body:       "I have an exam tomorrow and I need a quick, memorable summary of the main causes. MAIN acronym?",
    subject:    'History',
    bounty:     25,
    views:      61,
    solved:     false,
    createdAt:  new Date(Date.now() - 30 * 60_000),
    answers: [],
  },
  {
    id:         '4',
    authorId:   'user-malika',
    authorName: 'Malika U.',
    title:      'Difference between ionic and covalent bonds?',
    body:       "I keep mixing them up in tests. Is there a trick to remember which is which?",
    subject:    'Chemistry',
    bounty:     20,
    views:      29,
    solved:     false,
    createdAt:  new Date(Date.now() - 7 * 3600_000),
    answers: [
      {
        id:         'a3',
        authorId:   'user-timur',
        authorName: 'Timur S.',
        body:       "Memory trick: Ionic = metals + non-metals (like NaCl — salt). Covalent = non-metals only (like H₂O — water). If you see a metal in the formula → ionic! ⚡",
        likes:      5,
        isAccepted: false,
        createdAt:  new Date(Date.now() - 6 * 3600_000),
      },
    ],
  },
  {
    id:         '5',
    authorId:   'user-dilnoza',
    authorName: 'Dilnoza P.',
    title:      "What are the main themes in Shakespeare's Hamlet?",
    body:       "Writing an essay on Hamlet. What are the 3-4 biggest themes I should focus on?",
    subject:    'Literature',
    bounty:     10,
    views:      18,
    solved:     false,
    createdAt:  new Date(Date.now() - 12 * 3600_000),
    answers: [],
  },
]

const SUBJECTS: Subject[] = [
  'All', 'Math', 'Physics', 'Chemistry', 'Literature', 'History', 'English', 'Other',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

const SUBJECT_COLORS: Record<Subject, string> = {
  All:        'bg-slate-100 text-slate-600',
  Math:       'bg-indigo-100 text-indigo-700',
  Physics:    'bg-sky-100 text-sky-700',
  Chemistry:  'bg-emerald-100 text-emerald-700',
  Literature: 'bg-violet-100 text-violet-700',
  History:    'bg-amber-100 text-amber-700',
  English:    'bg-rose-100 text-rose-700',
  Other:      'bg-slate-100 text-slate-600',
}

const TIER_BADGES: Record<QualityTier, { label: string; cls: string }> = {
  excellent: { label: '✨ Excellent',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  good:      { label: '👍 Good',       cls: 'bg-sky-100 text-sky-700 border-sky-300' },
  partial:   { label: '⚠️ Partial',    cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  poor:      { label: '❌ Incorrect',  cls: 'bg-rose-100 text-rose-700 border-rose-300' },
}

// ── Accept Result Toast ────────────────────────────────────────────────────────
function showAcceptToast(result: AcceptResult, bounty: number) {
  if (!result.success) {
    toast.error(result.error ?? 'Something went wrong.')
    return
  }
  if (result.warning) {
    toast(result.warning, { icon: '⚠️' })
    return
  }

  if (result.aiVerified) {
    const tier   = TIER_BADGES[result.qualityTier]
    const pct    = Math.round((result.tokensAwarded / bounty) * 100)
    toast.success(
      `AI graded: ${tier.label} — ${result.tokensAwarded} / ${bounty} tokens awarded (${pct}%)${
        result.aiRationale ? `\n"${result.aiRationale}"` : ''
      }`,
      { duration: 6000, icon: '🤖' }
    )
  } else {
    toast.success(`Answer accepted! +${result.tokensAwarded} tokens sent to author. 🪙`, {
      duration: 4000,
    })
  }
}

// ── Ask Question Modal ────────────────────────────────────────────────────────
function AskModal({
  onClose,
  onSubmit,
}: {
  onClose:  () => void
  onSubmit: (q: Omit<Question, 'id' | 'answers' | 'views' | 'createdAt'>) => void
}) {
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [subject, setSubject] = useState<Subject>('Math')
  const [bounty,  setBounty]  = useState(10)
  const [isPending, start]    = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(() => {
      onSubmit({
        title,
        body,
        subject,
        bounty,
        solved:     false,
        authorId:   MOCK_MY_ID,
        authorName: 'You',
      })
      toast.success(`Question posted! You offered ${bounty} token bounty 🎯`)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Ask a Question</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Your Question
            </label>
            <input
              required
              placeholder="e.g. How do I solve quadratic equations?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Details (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add any extra context or what you've already tried..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Subject
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8"
                >
                  {SUBJECTS.filter((s) => s !== 'All').map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              {AI_VERIFIED_SUBJECTS.has(subject) && (
                <p className="text-[10px] text-violet-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI will grade answers for this subject
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Token Bounty 🪙
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={bounty}
                onChange={(e) => setBounty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-[10px] text-slate-400">Rewarded to the best answer</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !title.trim()}
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

// ── Answer Input ───────────────────────────────────────────────────────────────
function AnswerInput({ onAnswer }: { onAnswer: (body: string) => void }) {
  const [text, setText]    = useState('')
  const [isPending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    start(() => {
      onAnswer(text.trim())
      setText('')
      toast.success('Answer posted! Tokens will be rewarded if accepted. 🪙')
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

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({
  q,
  currentUserId,
  onAnswer,
  onAccept,
}: {
  q:             Question
  currentUserId: string
  onAnswer:      (id: string, body: string) => void
  onAccept:      (questionId: string, answer: Answer) => Promise<void>
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)   // answerId being accepted

  const isMyQuestion = q.authorId === currentUserId

  async function handleAccept(answer: Answer) {
    if (accepting) return   // already processing another accept

    setAccepting(answer.id)
    try {
      await onAccept(q.id, answer)
    } finally {
      setAccepting(null)
    }
  }

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition-all ${
        q.solved ? 'border-emerald-200' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* ── Collapsed header ── */}
      <div
        className="px-5 pt-4 pb-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          {/* Bounty badge */}
          <div
            className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${
              q.solved
                ? 'border-emerald-300 bg-emerald-50'
                : q.answers.length === 0
                ? 'border-rose-200 bg-rose-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <Coins
              className={`w-4 h-4 ${
                q.solved
                  ? 'text-emerald-500'
                  : q.answers.length === 0
                  ? 'text-rose-400'
                  : 'text-amber-500'
              }`}
            />
            <span
              className={`text-xs font-bold tabular-nums mt-0.5 ${
                q.solved
                  ? 'text-emerald-600'
                  : q.answers.length === 0
                  ? 'text-rose-500'
                  : 'text-amber-600'
              }`}
            >
              {q.bounty}
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-wider">tokens</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${SUBJECT_COLORS[q.subject]}`}
              >
                {q.subject}
              </span>
              {AI_VERIFIED_SUBJECTS.has(q.subject) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI graded
                </span>
              )}
              {q.solved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Solved
                </span>
              )}
              {!q.solved && q.answers.length === 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" />
                  Needs answer
                </span>
              )}
            </div>

            <h3 className="font-semibold text-slate-800 text-sm leading-snug">{q.title}</h3>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {q.authorName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(q.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {q.answers.length} answer{q.answers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* ── Expanded body + answers ── */}
      {expanded && (
        <div className="px-5 pb-5">
          {q.body && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-4 leading-relaxed border border-slate-100">
              {q.body}
            </p>
          )}

          {/* AI-graded notice for question author */}
          {isMyQuestion && !q.solved && AI_VERIFIED_SUBJECTS.has(q.subject) && q.answers.length > 0 && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>AI Evaluation:</strong> When you accept an answer for this{' '}
                <strong>{q.subject}</strong> question, our AI will grade it for accuracy and
                award tokens dynamically (up to {q.bounty} tokens for an excellent answer).
              </span>
            </div>
          )}

          {q.answers.length > 0 && (
            <div className="space-y-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Answers
              </p>
              {q.answers.map((ans) => (
                <div
                  key={ans.id}
                  className={`rounded-xl px-4 py-3 border ${
                    ans.isAccepted
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  {/* Accepted badge */}
                  {ans.isAccepted && (
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accepted Answer — bounty awarded
                    </div>
                  )}

                  <p className="text-sm text-slate-700 leading-relaxed">{ans.body}</p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ans.authorName}
                    </span>
                    <span>{timeAgo(ans.createdAt)}</span>

                    <button className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition">
                      <ThumbsUp className="w-3 h-3" />
                      {ans.likes}
                    </button>

                    {/* ── Accept Button — only shown to question author on non-solved, non-accepted ── */}
                    {isMyQuestion && !q.solved && !ans.isAccepted && (
                      <button
                        onClick={() => handleAccept(ans)}
                        disabled={accepting === ans.id}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {accepting === ans.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {AI_VERIFIED_SUBJECTS.has(q.subject) ? 'AI grading…' : 'Accepting…'}
                          </>
                        ) : (
                          <>
                            {AI_VERIFIED_SUBJECTS.has(q.subject) ? (
                              <Sparkles className="w-3 h-3" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            Accept
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!q.solved && <AnswerInput onAnswer={(body) => onAnswer(q.id, body)} />}
        </div>
      )}
    </div>
  )
}

// ── Main Forum Page ────────────────────────────────────────────────────────────
export default function ForumPage() {
  const [questions,    setQuestions]  = useState<Question[]>(INITIAL_QUESTIONS)
  const [activeSubject, setSubject]   = useState<Subject>('All')
  const [search,       setSearch]     = useState('')
  const [sortBy,       setSortBy]     = useState<'newest' | 'bounty' | 'unanswered'>('newest')
  const [showAskModal, setShowModal]  = useState(false)

  // ── Derived list ─────────────────────────────────────────────
  const filtered = questions
    .filter((q) => activeSubject === 'All' || q.subject === activeSubject)
    .filter(
      (q) =>
        !search.trim() ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.subject.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'bounty')      return b.bounty - a.bounty
      if (sortBy === 'unanswered') return a.answers.length - b.answers.length
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

  const unansweredCount = questions.filter((q) => q.answers.length === 0 && !q.solved).length
  const totalBounty     = questions.filter((q) => !q.solved).reduce((s, q) => s + q.bounty, 0)

  // ── Handlers ─────────────────────────────────────────────────
  function addQuestion(q: Omit<Question, 'id' | 'answers' | 'views' | 'createdAt'>) {
    setQuestions((prev) => [
      {
        ...q,
        id:        Date.now().toString(),
        answers:   [],
        views:     0,
        createdAt: new Date(),
      },
      ...prev,
    ])
  }

  function addAnswer(questionId: string, body: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              answers: [
                ...q.answers,
                {
                  id:         Date.now().toString(),
                  authorId:   MOCK_MY_ID,
                  authorName: 'You',
                  body,
                  likes:      0,
                  isAccepted: false,
                  createdAt:  new Date(),
                },
              ],
            }
      )
    )
  }

  /**
   * handleAccept — called when the question author clicks Accept on an answer.
   *
   * Flow:
   *  1. POST to /api/forum/accept-answer (secure backend)
   *  2. Backend: verifies auth, prevents double-accept, runs AI eval if needed,
   *     rewards tokens to the ANSWER AUTHOR, marks answer + question as solved.
   *  3. On success: update local UI state optimistically.
   *  4. Show a rich toast with AI evaluation result (if applicable).
   */
  const handleAccept = useCallback(
    async (questionId: string, answer: Answer) => {
      const question = questions.find((q) => q.id === questionId)
      if (!question) return

      // Optimistic UI update immediately (will rollback on error)
      setQuestions((prev) =>
        prev.map((q) =>
          q.id !== questionId
            ? q
            : {
                ...q,
                solved: true,
                answers: q.answers.map((a) =>
                  a.id === answer.id ? { ...a, isAccepted: true } : a
                ),
              }
        )
      )

      try {
        const res = await fetch('/api/forum/accept-answer', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            answerId:       answer.id,
            answerAuthorId: answer.authorId,   // ← reward goes HERE, not to caller
            questionTitle:  question.title,
            questionBody:   question.body,
            answerBody:     answer.body,
            subject:        question.subject,
            bounty:         question.bounty,
          }),
        })

        const result: AcceptResult = await res.json()

        if (!res.ok || !result.success) {
          // Rollback optimistic update
          setQuestions((prev) =>
            prev.map((q) =>
              q.id !== questionId
                ? q
                : {
                    ...q,
                    solved: false,
                    answers: q.answers.map((a) =>
                      a.id === answer.id ? { ...a, isAccepted: false } : a
                    ),
                  }
            )
          )
          toast.error(result.error ?? `Server error (${res.status})`)
          return
        }

        showAcceptToast(result, question.bounty)
      } catch (err) {
        // Network error — rollback
        setQuestions((prev) =>
          prev.map((q) =>
            q.id !== questionId
              ? q
              : {
                  ...q,
                  solved: false,
                  answers: q.answers.map((a) =>
                    a.id === answer.id ? { ...a, isAccepted: false } : a
                  ),
                }
          )
        )
        toast.error('Network error. Please check your connection and try again.')
        console.error('[Forum] handleAccept network error:', err)
      }
    },
    [questions]
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {showAskModal && (
        <AskModal onClose={() => setShowModal(false)} onSubmit={addQuestion} />
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Forum</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Answer questions, earn token bounties
            </p>
          </div>
        </div>

        {/* AI grading notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          AI grades answers for History, Literature, Physics & more
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ask a Question
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total questions',  value: questions.length,    color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Need answers',     value: unansweredCount,     color: 'text-rose-600 bg-rose-50'     },
          { label: 'Tokens available', value: `${totalBounty}🪙`,  color: 'text-amber-600 bg-amber-50'  },
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

      {/* ── Subject filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const count =
            s === 'All'
              ? questions.length
              : questions.filter((q) => q.subject === s).length
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
              {AI_VERIFIED_SUBJECTS.has(s as Subject) && s !== 'All' && (
                <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              )}
              <span className={`tabular-nums ${activeSubject === s ? 'opacity-70' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Question list ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">No questions found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Try a different search term.' : 'Be the first to ask one!'}
            </p>
          </div>
        ) : (
          filtered.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              currentUserId={MOCK_MY_ID}
              onAnswer={addAnswer}
              onAccept={handleAccept}
            />
          ))
        )}
      </div>
    </div>
  )
}
