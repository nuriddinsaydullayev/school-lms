'use client'

import { useState, useTransition } from 'react'
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
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type Subject = 'All' | 'Math' | 'Physics' | 'Chemistry' | 'Literature' | 'History' | 'English' | 'Other'

interface Answer {
  id: string
  authorName: string
  body: string
  likes: number
  isAccepted: boolean
  createdAt: Date
}

interface Question {
  id: string
  authorName: string
  title: string
  body: string
  subject: Subject
  bounty: number
  answers: Answer[]
  views: number
  createdAt: Date
  solved: boolean
}

// ── Mock data (replace with DB calls once a forum table exists) ────────────────
const INITIAL_QUESTIONS: Question[] = [
  {
    id: '1',
    authorName: 'Zafar T.',
    title: 'How do I solve quadratic equations by factoring?',
    body: "I understand the formula method but I'm struggling with factoring. Can someone walk me through an example like x² + 5x + 6 = 0 step by step?",
    subject: 'Math',
    bounty: 20,
    views: 47,
    solved: false,
    createdAt: new Date(Date.now() - 2 * 3600_000),
    answers: [
      {
        id: 'a1',
        authorName: 'Sara M.',
        body: "To factor x² + 5x + 6, find two numbers that multiply to 6 and add to 5. Those are 2 and 3! So it becomes (x+2)(x+3) = 0, giving x = -2 or x = -3. 🎯",
        likes: 8,
        isAccepted: false,
        createdAt: new Date(Date.now() - 1 * 3600_000),
      },
    ],
  },
  {
    id: '2',
    authorName: 'Nilufar K.',
    title: "What is Newton's Third Law in simple words?",
    body: "Our teacher explained it but I still can't picture it in real life. Any simple analogy would help!",
    subject: 'Physics',
    bounty: 15,
    views: 32,
    solved: true,
    createdAt: new Date(Date.now() - 5 * 3600_000),
    answers: [
      {
        id: 'a2',
        authorName: 'Bobur A.',
        body: "Think of it this way: when you push against a wall, the wall pushes back on you with the same force. That's why you don't fall through it! Action = Reaction, always equal and opposite. 🧱",
        likes: 14,
        isAccepted: true,
        createdAt: new Date(Date.now() - 4 * 3600_000),
      },
    ],
  },
  {
    id: '3',
    authorName: 'Jasur R.',
    title: 'Key causes of World War I — summary?',
    body: "I have an exam tomorrow and I need a quick, memorable summary of the main causes. MAIN acronym?",
    subject: 'History',
    bounty: 25,
    views: 61,
    solved: false,
    createdAt: new Date(Date.now() - 30 * 60_000),
    answers: [],
  },
  {
    id: '4',
    authorName: 'Malika U.',
    title: 'Difference between ionic and covalent bonds?',
    body: "I keep mixing them up in tests. Is there a trick to remember which is which?",
    subject: 'Chemistry',
    bounty: 20,
    views: 29,
    solved: false,
    createdAt: new Date(Date.now() - 7 * 3600_000),
    answers: [
      {
        id: 'a3',
        authorName: 'Timur S.',
        body: "Memory trick: Ionic = metals + non-metals (like NaCl — salt). Covalent = non-metals only (like H₂O — water). If you see a metal in the formula → ionic! ⚡",
        likes: 5,
        isAccepted: false,
        createdAt: new Date(Date.now() - 6 * 3600_000),
      },
    ],
  },
  {
    id: '5',
    authorName: 'Dilnoza P.',
    title: "What are the main themes in Shakespeare's Hamlet?",
    body: "Writing an essay on Hamlet. What are the 3-4 biggest themes I should focus on?",
    subject: 'Literature',
    bounty: 10,
    views: 18,
    solved: false,
    createdAt: new Date(Date.now() - 12 * 3600_000),
    answers: [],
  },
]

const SUBJECTS: Subject[] = ['All', 'Math', 'Physics', 'Chemistry', 'Literature', 'History', 'English', 'Other']

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60)  return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
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

// ── Ask Question Modal ────────────────────────────────────────────────────────
function AskModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
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
      onSubmit({ title, body, subject, bounty, solved: false, authorName: 'You' })
      toast.success(`Question posted! You offered ${bounty} token bounty 🎯`)
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
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Your Question</label>
            <input
              required
              placeholder="e.g. How do I solve quadratic equations?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Body */}
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

          {/* Subject + Bounty row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</label>
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

// ── Answer Input ─────────────────────────────────────────────────────────────
function AnswerInput({ onAnswer }: { onAnswer: (body: string) => void }) {
  const [text, setText]       = useState('')
  const [isPending, start]    = useTransition()

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

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({ q, onAnswer }: { q: Question; onAnswer: (id: string, body: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all ${q.solved ? 'border-emerald-200' : 'border-slate-100 hover:border-slate-200'}`}>
      <div
        className="px-5 pt-4 pb-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          {/* Bounty badge */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${
            q.solved
              ? 'border-emerald-300 bg-emerald-50'
              : q.answers.length === 0
              ? 'border-rose-200 bg-rose-50'
              : 'border-amber-200 bg-amber-50'
          }`}>
            <Coins className={`w-4 h-4 ${q.solved ? 'text-emerald-500' : q.answers.length === 0 ? 'text-rose-400' : 'text-amber-500'}`} />
            <span className={`text-xs font-bold tabular-nums mt-0.5 ${q.solved ? 'text-emerald-600' : q.answers.length === 0 ? 'text-rose-500' : 'text-amber-600'}`}>
              {q.bounty}
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-wider">tokens</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${SUBJECT_COLORS[q.subject]}`}>
                {q.subject}
              </span>
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
                <User className="w-3 h-3" />{q.authorName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{timeAgo(q.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />{q.answers.length} answer{q.answers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded body + answers */}
      {expanded && (
        <div className="px-5 pb-5">
          {q.body && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-4 leading-relaxed border border-slate-100">
              {q.body}
            </p>
          )}

          {q.answers.length > 0 && (
            <div className="space-y-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Answers</p>
              {q.answers.map((ans) => (
                <div
                  key={ans.id}
                  className={`rounded-xl px-4 py-3 border ${
                    ans.isAccepted
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  {ans.isAccepted && (
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accepted Answer — bounty awarded
                    </div>
                  )}
                  <p className="text-sm text-slate-700 leading-relaxed">{ans.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />{ans.authorName}
                    </span>
                    <span>{timeAgo(ans.createdAt)}</span>
                    <button className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition ml-auto">
                      <ThumbsUp className="w-3 h-3" />
                      {ans.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!q.solved && (
            <AnswerInput onAnswer={(body) => onAnswer(q.id, body)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Forum Component ──────────────────────────────────────────────────────
export default function ForumPage() {
  const [questions, setQuestions]     = useState<Question[]>(INITIAL_QUESTIONS)
  const [activeSubject, setSubject]   = useState<Subject>('All')
  const [search, setSearch]           = useState('')
  const [sortBy, setSortBy]           = useState<'newest' | 'bounty' | 'unanswered'>('newest')
  const [showAskModal, setShowModal]  = useState(false)

  // ── Derived list ────────────────────────────────────────────
  const filtered = questions
    .filter((q) => activeSubject === 'All' || q.subject === activeSubject)
    .filter((q) =>
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

  function addQuestion(q: Omit<Question, 'id' | 'answers' | 'views' | 'createdAt'>) {
    setQuestions((prev) => [{
      ...q,
      id: Date.now().toString(),
      answers: [],
      views: 0,
      createdAt: new Date(),
    }, ...prev])
  }

  function addAnswer(questionId: string, body: string) {
    setQuestions((prev) => prev.map((q) =>
      q.id !== questionId ? q : {
        ...q,
        answers: [...q.answers, {
          id: Date.now().toString(),
          authorName: 'You',
          body,
          likes: 0,
          isAccepted: false,
          createdAt: new Date(),
        }],
      }
    ))
  }

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
            <p className="text-sm text-slate-500 mt-0.5">Answer questions, earn token bounties</p>
          </div>
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
          { label: 'Total questions', value: questions.length,   color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Need answers',    value: unansweredCount,    color: 'text-rose-600 bg-rose-50'     },
          { label: 'Tokens available', value: `${totalBounty}🪙`, color: 'text-amber-600 bg-amber-50'  },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border border-slate-100 p-4 text-center ${color.split(' ')[1]}`}>
            <p className={`text-xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
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

        {/* Sort */}
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
          const count = s === 'All'
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
            <QuestionCard key={q.id} q={q} onAnswer={addAnswer} />
          ))
        )}
      </div>
    </div>
  )
}
