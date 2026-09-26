import AiTutorChat from '@/components/student/AiTutorChat'

export const metadata = {
  title: 'AI Tutor',
}

export default function AiTutorPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Tutor</h1>
        <p className="text-gray-500 mt-2">Savollaringizni bering va sun'iy intellektdan yordam oling.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[600px] p-4 relative overflow-hidden flex flex-col">
        <AiTutorChat variant="panel" />
      </div>
    </div>
  )
}