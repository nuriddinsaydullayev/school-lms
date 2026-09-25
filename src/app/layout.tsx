import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// ── Fonts ──────────────────────────────────────────────────────
const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

// ── Metadata ───────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'EduSpark — AI-Powered School LMS',
    template: '%s | EduSpark',
  },
  description:
    'A modern, AI-powered Learning Management System with gamification for students and teachers.',
  keywords: ['LMS', 'school', 'AI tutor', 'gamification', 'education'],
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
}

// ── Root Layout ────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        {children}

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '0.75rem',
              padding: '12px 16px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#f8fafc' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
            },
          }}
        />
      </body>
    </html>
  )
}
