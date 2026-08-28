'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'

type ProviderRow = {
  id: string
  name: string
  icon: string
  tagline: string
  free: boolean
  enabled: boolean
  userCount: number
}

export default function AdminProvidersClient({ providers }: { providers: ProviderRow[] }) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()

  async function toggle(id: string, current: boolean) {
    setToggling(id)
    const res = await fetch('/api/admin/providers/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: id, enabled: !current }),
    })
    setToggling(null)
    if (res.ok) {
      setToast(`${id} ${!current ? 'enabled' : 'disabled'}`)
      setTimeout(() => setToast(''), 3000)
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Providers</h1>
          <p className="text-sm text-slate-500 mt-1">Disabled providers are blocked globally — users cannot use them even if they have a key configured.</p>
        </div>
        {toast && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{toast}</p>}
      </div>

      <div className="space-y-3">
        {providers.map(p => (
          <div key={p.id} className={`bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-opacity ${!p.enabled ? 'opacity-60' : ''}`}>
            <span className="text-xl shrink-0 w-8 text-center">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                {p.free && <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded">Free</span>}
                {!p.enabled && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Disabled</span>}
              </div>
              <p className="text-xs text-slate-400">{p.tagline}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>{p.userCount} users</span>
            </div>
            <button
              onClick={() => toggle(p.id, p.enabled)}
              disabled={toggling === p.id}
              aria-label={p.enabled ? `Disable ${p.name}` : `Enable ${p.name}`}
              className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${p.enabled ? 'bg-amber-400' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
