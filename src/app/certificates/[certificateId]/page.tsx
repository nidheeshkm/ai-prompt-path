import { supabaseAdmin } from '@/lib/supabase-server'
import { getCourse } from '@/data/curriculum'
import { notFound } from 'next/navigation'
import { Award, CheckCircle, ExternalLink } from 'lucide-react'

export default async function CertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params

  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select('*, profiles(display_name)')
    .eq('certificate_id', certificateId)
    .single()

  if (!cert) notFound()

  const course = getCourse(cert.course_id)
  if (!course) notFound()

  const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/certificates/${certificateId}`

  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8 bg-gray-950">
      <div className="w-full max-w-2xl">
        {/* Certificate card */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-600/40 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
          {/* Logo + badge */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center">
              <Award className="w-10 h-10 text-amber-400" />
            </div>
          </div>

          <p className="text-amber-400 font-semibold text-sm tracking-widest uppercase mb-2">Certificate of Completion</p>
          <p className="text-gray-400 text-sm mb-8">This certifies that</p>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {(cert as any).profiles?.display_name || 'Learner'}
          </h1>

          <p className="text-gray-300 text-base mb-2">has successfully completed</p>

          <div className="inline-flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 mb-8">
            <span className="text-3xl">{course.icon}</span>
            <div className="text-left">
              <p className="text-white font-bold text-lg">{course.title}</p>
              <p className="text-gray-400 text-sm">{course.tagline}</p>
            </div>
          </div>

          <p className="text-gray-500 text-sm mb-8">Issued on {issuedDate}</p>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Verified Certificate</span>
            </div>
            <p className="text-xs text-gray-600 break-all">ID: {certificateId}</p>
            <p className="text-xs text-gray-500 mt-1">Verify at: {verifyUrl}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <a
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
          >
            🦜 PromptPath
          </a>
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Save / Print
          </button>
        </div>
      </div>
    </main>
  )
}
