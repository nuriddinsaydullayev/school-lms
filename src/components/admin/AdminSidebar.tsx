'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  ShieldAlert,
  Building2,
  X,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface AdminSidebarProps {
  mobile?: boolean
  onClose?: () => void
  schoolName?: string
}

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Classes', href: '/admin/classes', icon: BookOpen },
  { name: 'Users & Roles', href: '/admin/users', icon: Users },
]

export default function AdminSidebar({ mobile, onClose, schoolName }: AdminSidebarProps) {
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
          <div className="flex items-center justify-center w-8 h-8 bg-amber-500 rounded-lg flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold tracking-tight text-sm text-white truncate">
              {schoolName ?? 'EduSpark'}
            </span>
            <span className="block text-[10px] font-medium text-amber-400 uppercase tracking-wider leading-tight">
              Admin Portal
            </span>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* School Badge & Sign out */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/60 text-xs text-slate-400">
          <Building2 size={14} className="text-amber-400 shrink-0" />
          <span className="truncate">{schoolName ?? 'School Admin'}</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl font-medium text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
