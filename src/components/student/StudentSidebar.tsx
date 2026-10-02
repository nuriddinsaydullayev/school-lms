'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Brain,
  Trophy,
  Gift,
  LogOut,
  X,
  Building2,
  CalendarDays,
  Medal,
  MessageCircle,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/student/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/student/classes',     label: 'My Classes',  icon: BookOpen        },
  { href: '/student/assignments', label: 'Assignments', icon: ClipboardList   },
  { href: '/student/planner',     label: 'Planner',     icon: CalendarDays    },
  { href: '/student/forum',       label: 'Forum',       icon: MessageCircle   },
  { href: '/student/ai-tutor',    label: 'AI Tutor',    icon: Brain           },
  { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy          },
  { href: '/student/badges',      label: 'Badges',      icon: Medal           },
  { href: '/student/rewards',     label: 'Rewards',     icon: Gift            },
]

interface StudentSidebarProps {
  schoolName?: string
  mobile?: boolean
  onClose?: () => void
}

export default function StudentSidebar({ schoolName, mobile, onClose }: StudentSidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={`flex flex-col h-full bg-white border-r border-slate-100 ${
        mobile ? 'w-72' : 'w-64'
      }`}
    >
      {/* ── School Branding ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
        <Link href="/student/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-sm text-slate-800 tracking-tight truncate leading-tight">
              {schoolName ?? 'EduSpark'}
            </span>
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
              Student Portal
            </span>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition ml-2 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                size={18}
              />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Sign-out ── */}
      <div className="px-3 pb-5 pt-2 border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
