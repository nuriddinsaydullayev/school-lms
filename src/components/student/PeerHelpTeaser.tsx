import Link from 'next/link'
import { Users, Coins, ChevronRight, MessageCircleQuestion, Sparkles } from 'lucide-react'

const SAMPLE_QUESTIONS = [
  { subject: 'Math', question: 'How do I solve quadratic equations?', tokens: 15, answers: 2 },
  { subject: 'Physics', question: 'What is Newton\'s 3rd Law in simple words?', tokens: 10, answers: 0 },
  { subject: 'History', question: 'Key events of World War II?', tokens: 20, answers: 5 },
]

export default function PeerHelpTeaser() {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm leading-tight">Help a Friend</h2>
            <p className="text-xs text-slate-500">Answer questions, earn tokens!</p>
          </div>
        </div>
        {/* Token reward callout */}
        <div className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          <Coins className="w-3 h-3" />
          Earn tokens
        </div>
      </div>

      {/* Value prop strip */}
      <div className="mx-4 mb-3 flex items-center gap-2 bg-white/70 border border-emerald-100 rounded-xl px-3 py-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          For every question you answer, you earn <span className="font-bold text-emerald-600">10–20 tokens</span> instantly. Teaching others is the best way to learn!
        </p>
      </div>

      {/* Sample questions */}
      <div className="px-4 space-y-2 pb-4">
        {SAMPLE_QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white rounded-xl border border-emerald-100 px-3.5 py-2.5 hover:border-emerald-300 hover:shadow-sm transition group cursor-pointer"
          >
            <div className="flex-shrink-0">
              <MessageCircleQuestion className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {q.subject}
                </span>
                {q.answers === 0 && (
                  <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                    Unanswered
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">{q.question}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 flex-shrink-0">
              <Coins className="w-3.5 h-3.5" />
              +{q.tokens}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="border-t border-emerald-100 bg-white/50 px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-emerald-600">3 questions</span> waiting for your help
        </p>
        <Link
          href="/student/forum"
          className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
        >
          Open Forum
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
