'use client'

import { useChat } from '@ai-sdk/react'            // ✅ AI SDK v7: hooks live here
import { type UIMessage, DefaultChatTransport } from 'ai'
import { useRef, useEffect, useState } from 'react'
import {
  Brain,
  Send,
  Loader2,
  X,
  ChevronDown,
  Sparkles,
  User,
  RotateCcw,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface AiTutorChatProps {
  /** If the student opened the tutor from an assignment page */
  assignmentId?: string
  assignmentTitle?: string
  assignmentDescription?: string
  /** 'bubble' = floating FAB (default). 'panel' = embedded full-height. */
  variant?: 'bubble' | 'panel'
}

// ── Helpers: extract plain text from a UIMessage ──────────────
function getMessageText(message: UIMessage): string {
  // AI SDK v7: content is an array of parts
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')
  }
  return ''
}

// ── Message bubble ─────────────────────────────────────────────
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text   = getMessageText(message)
  if (!text) return null

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white ${
          isUser
            ? 'bg-indigo-500'
            : 'bg-gradient-to-br from-violet-500 to-purple-600'
        }`}
      >
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

// ── Typing indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Welcome message factory ────────────────────────────────────
function makeWelcomeMessage(assignmentTitle?: string): UIMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: assignmentTitle
          ? `Hi! I'm your AI Tutor 👋 I can see you're working on **"${assignmentTitle}"**. What would you like help understanding? Remember, I'll guide you — not just give you the answer! 💡`
          : "Hi! I'm your AI Tutor 👋 Ask me anything about your lessons or assignments. I'm here to help you understand, not just give answers! 💡",
      },
    ],
  }
}

// ── Main Component ─────────────────────────────────────────────
export default function AiTutorChat({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
  variant = 'bubble',
}: AiTutorChatProps) {
  const [isOpen, setIsOpen] = useState(variant === 'panel')
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  // ── AI SDK v7 useChat ─────────────────────────────────────
  // Key API changes from v3/v4:
  //  - No `input` / `handleInputChange` / `handleSubmit` props
  //  - Use `sendMessage({ text })` instead
  //  - `status` replaces `isLoading` ('ready' | 'submitted' | 'streaming' | 'error')
  const { messages, sendMessage, status, setMessages } = useChat({
    // Extra fields merged into every POST body alongside `messages`
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        assignmentId,
        assignmentTitle,
        assignmentDescription,
      }
    }),
    messages: [makeWelcomeMessage(assignmentTitle)],
    onError: (error) => {
      console.error('[AiTutorChat]', error)
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  // ── Send handler ─────────────────────────────────────────
  function handleSend() {
    const text = inputText.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleReset() {
    setMessages([makeWelcomeMessage(assignmentTitle)])
  }

  // ── Chat panel (shared between bubble and panel variants) ──
  const chatPanel = (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">AI Tutor</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`} />
              {isLoading ? 'Thinking…' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          title="Clear conversation"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition disabled:opacity-50 max-h-32"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send    size={16} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          AI may make mistakes. Always verify with your teacher.
        </p>
      </div>
    </div>
  )

  // ── Panel variant ─────────────────────────────────────────
  if (variant === 'panel') return chatPanel

  // ── Bubble variant: floating button + popup ───────────────
  const messageCount = messages.filter((m) => m.role === 'user').length

  return (
    <>
      {/* Floating chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] shadow-2xl shadow-indigo-200/50 rounded-2xl flex flex-col">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/80 backdrop-blur-sm text-slate-500 hover:text-slate-800 transition"
            aria-label="Close AI Tutor"
          >
            <X size={14} />
          </button>
          {chatPanel}
        </div>
      )}

      {/* Floating action button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 text-white shadow-slate-300'
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-300 hover:shadow-xl hover:scale-105'
        }`}
      >
        {isOpen ? (
          <>
            <ChevronDown size={18} />
            <span className="text-sm font-medium">Minimise</span>
          </>
        ) : (
          <>
            <Brain size={18} />
            <span className="text-sm font-medium">AI Tutor</span>
            {messageCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
                {messageCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  )
}
