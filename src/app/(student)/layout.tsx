'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import StudentSidebar from '@/components/student/StudentSidebar'

/**
 * Layout wrapping all /student/** routes.
 * - Desktop: permanent left sidebar + scrollable main area
 * - Mobile:  top bar with hamburger → slide-in drawer overlay
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex flex-shrink-0">
        <StudentSidebar />
      </div>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex md:hidden">
            <StudentSidebar mobile onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">EduSpark</span>
          {/* Spacer to centre the title */}
          <div className="w-9" />
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
