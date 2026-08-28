'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2 } from 'lucide-react'

type CertRow = {
  id: string
  courseId: string
  courseTitle: string
  userName: string
  issuedAt: string
}

export default function AdminCertificatesClient({ certificates }: { certificates: CertRow[] }) {
  const [revoking, setRevoking] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke certificate for ${name}? This cannot be undone.`)) return
    setRevoking(id)
    const res = await fetch('/api/admin/certificates/revoke', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setRevoking(null)
    if (res.ok) {
      setToast('Certificate revoked')
      setTimeout(() => setToast(''), 3000)
      router.refresh()
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Certificates <span className="text-slate-400 text-lg font-normal">({certificates.length})</span>
        </h1>
        {toast && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{toast}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Learner</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Course</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Issued</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{c.userName}</td>
                <td className="px-4 py-3 text-slate-600">{c.courseTitle}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a
                      href={`/certificates/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                    <button
                      onClick={() => revoke(c.id, c.userName)}
                      disabled={revoking === c.id}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {revoking === c.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!certificates.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No certificates issued yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
