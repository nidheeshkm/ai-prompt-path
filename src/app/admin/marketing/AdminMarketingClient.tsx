'use client'

import { useState } from 'react'
import { Users, Send, Eye, Loader2, CheckCircle, Mail, Sparkles } from 'lucide-react'
import type { AudienceGroup } from '@/app/api/admin/marketing/audience/route'

const GROUPS: { id: AudienceGroup; label: string; description: string; icon: string }[] = [
  {
    id: 'not_enrolled',
    label: 'Signed up, not enrolled',
    description: 'Registered users who haven\'t joined any course yet.',
    icon: '👋',
  },
  {
    id: 'enrolled_not_started',
    label: 'Enrolled but not started',
    description: 'Users who enrolled in a course but haven\'t begun any topic.',
    icon: '📚',
  },
  {
    id: 'inactive_signup',
    label: 'No return login (3+ days)',
    description: 'Signed up over 3 days ago but never came back after the initial session.',
    icon: '😴',
  },
  {
    id: 'missing_streak',
    label: 'Missing streak (3+ days)',
    description: 'Active learners who haven\'t made progress in 3 or more days.',
    icon: '🔥',
  },
  {
    id: 'all_active',
    label: 'New course announcement',
    description: 'All active non-blocked users — for platform-wide announcements.',
    icon: '📣',
  },
]

type AudiencePreview = { count: number; preview: { name: string; email: string }[] }
type SendResult = { sent: number; failed: number; total: number }

export default function AdminMarketingClient() {
  const [group, setGroup]       = useState<AudienceGroup | null>(null)
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')

  const [previewing, setPreviewing] = useState(false)
  const [audience, setAudience]     = useState<AudiencePreview | null>(null)

  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError]       = useState('')

  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<SendResult | null>(null)
  const [error, setError]       = useState('')

  async function generateContent() {
    if (!group) return
    setGenerating(true)
    setAiError('')
    try {
      const res = await fetch('/api/admin/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.message ?? 'AI generation failed. Try again.')
        return
      }
      setSubject(data.subject ?? '')
      setBody(data.body ?? '')
    } catch {
      setAiError('Could not reach the generation endpoint.')
    } finally {
      setGenerating(false)
    }
  }

  async function previewAudience() {
    if (!group) return
    setPreviewing(true)
    setAudience(null)
    try {
      const res = await fetch(`/api/admin/marketing/audience?group=${group}`)
      const data = await res.json()
      setAudience(data)
    } catch {
      setError('Could not fetch audience.')
    } finally {
      setPreviewing(false)
    }
  }

  async function sendCampaign() {
    if (!group || !subject.trim() || !body.trim()) return
    if (!audience) { setError('Preview audience first.'); return }
    if (!confirm(`Send to ${audience.count} recipients? This cannot be undone.`)) return

    setSending(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  const canSend = group && subject.trim() && body.trim() && !sending

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900">Marketing Emails</h1>
        </div>

        {/* Step 1: Choose group */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">1 — Choose target audience</p>
          <div className="space-y-2">
            {GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => { setGroup(g.id); setAudience(null); setResult(null) }}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                  group === g.id
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl leading-none mt-0.5">{g.icon}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${group === g.id ? 'text-amber-800' : 'text-slate-800'}`}>
                    {g.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>
                </div>
                <div className={`ml-auto mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  group === g.id ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                }`}>
                  {group === g.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          {group && (
            <button
              onClick={previewAudience}
              disabled={previewing}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview audience
            </button>
          )}

          {audience && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">{audience.count} recipients</span>
              </div>
              {audience.preview.length > 0 && (
                <div className="space-y-1">
                  {audience.preview.map((u, i) => (
                    <p key={i} className="text-xs text-slate-500">{u.name} · {u.email}</p>
                  ))}
                  {audience.count > 5 && (
                    <p className="text-xs text-slate-400 italic">…and {audience.count - 5} more</p>
                  )}
                </div>
              )}
              {audience.count === 0 && (
                <p className="text-xs text-slate-400">No users match this group right now.</p>
              )}
            </div>
          )}
        </section>

        {/* Step 2: Compose */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">2 — Compose your message</p>
            {group && (
              <button
                onClick={generateContent}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {generating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Generating…' : 'Generate with AI'}
              </button>
            )}
          </div>

          {aiError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{aiError}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject line</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. We miss you on PromptPath 👋"
              className="w-full border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Message body <span className="text-slate-400 font-normal">(plain text, line breaks are preserved)</span>
            </label>
            <textarea
              rows={8}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`Hi there,\n\nWe noticed you haven't started your learning journey yet…`}
              className="w-full border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none resize-none font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              A "Go to PromptPath" button will be automatically appended.
            </p>
          </div>
        </section>

        {/* Step 3: Send */}
        <section className="space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {result && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Campaign sent — <strong>{result.sent}</strong> delivered
                {result.failed > 0 && `, ${result.failed} failed`}
                {' '}out of {result.total} recipients.
              </span>
            </div>
          )}

          <button
            onClick={sendCampaign}
            disabled={!canSend}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send Campaign'}
          </button>
          <p className="text-xs text-slate-400">
            Emails are sent one-by-one to avoid SMTP rate limits. Large audiences may take a minute.
          </p>
        </section>

      </div>
    </div>
  )
}
