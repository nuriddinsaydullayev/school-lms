'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import TeacherSidebar from '@/components/teacher/TeacherSidebar'

interface TeacherLayoutClientProps {
  children: React.ReactNode
  schoolName: string
}

export default function TeacherLayoutClient({ children, schoolName }: TeacherLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <TeacherSidebar schoolName={schoolName} />
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 animate-in slide-in-from-left duration-200">
            <TeacherSidebar schoolName={schoolName} mobile onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Top Bar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center h-16 px-4 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-slate-300 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-bold text-white tracking-tight truncate max-w-[200px]">
            {schoolName}
          </span>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
