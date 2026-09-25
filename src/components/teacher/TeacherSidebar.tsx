'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface TeacherSidebarProps {
  mobile?: boolean
  onClose?: () => void
}

const navItems = [
  { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'My Classes', href: '/teacher/classes', icon: Users },
  { name: 'Assignments', href: '/teacher/assignments', icon: BookOpen },
  { name: 'Settings', href: '/teacher/settings', icon: Settings },
]

export default function TeacherSidebar({ mobile, onClose }: TeacherSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-6 bg-slate-950 flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <div className="flex items-center justify-center w-8 h-8 bg-violet-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight">EduSpark</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full ml-2">Teacher</span>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                active
                  ? 'bg-violet-600/10 text-violet-400 font-medium'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 bg-slate-950 flex-shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
