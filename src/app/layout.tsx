import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ProgressProvider } from '@/lib/progress-context'
import { EnrollmentProvider } from '@/lib/enrollment-context'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'PromptPath — Zero to Hero',
  description: 'Master LangChain, LangGraph, and LangSmith through hands-on lessons, quizzes, and coding challenges.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100 antialiased font-sans">
        <AuthProvider>
          <ProgressProvider>
            <EnrollmentProvider>
              <Header />
              <div className="flex flex-1 overflow-hidden">
                {children}
              </div>
            </EnrollmentProvider>
          </ProgressProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
