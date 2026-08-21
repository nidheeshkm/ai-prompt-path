'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Key, Eye, EyeOff, CheckCircle, XCircle, Loader2,
  ExternalLink, AlertTriangle, Save, Trash2,
} from 'lucide-react'

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

// OpenRouter keys are "sk-or-v1-..." — reject obviously invalid input
function isValidKeyFormat(key: string): boolean {
  return key.startsWith('sk-or-') && key.length > 20
}

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  // The input only ever holds a NEW key the user is typing — never the stored one
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [formatError, setFormatError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  const handleKeyChange = (val: string) => {
    setKeyInput(val)
    setSaveMsg(null)
    setTestState('idle')
    setFormatError(val && !isValidKeyFormat(val) ? 'Key should start with sk-or- (get yours at openrouter.ai/keys)' : '')
  }

  const handleSave = async () => {
    if (!user) return
    const trimmed = keyInput.trim()

    if (trimmed && !isValidKeyFormat(trimmed)) {
      setFormatError('Invalid key format. OpenRouter keys start with sk-or-')
      return
    }

    setSaving(true)
    setSaveMsg(null)

    const { error } = await supabase
      .from('profiles')
      .update({ openrouter_api_key: trimmed || null })
      .eq('id', user.id)

    if (error) {
      setSaveMsg({ type: 'err', text: 'Failed to save. Please try again.' })
    } else {
      setKeyInput('') // Clear input — never persist the key in component state
      await refreshProfile()
      setSaveMsg({ type: 'ok', text: 'Key saved successfully.' })
    }
    setSaving(false)
  }

  const handleClear = async () => {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)

    const { error } = await supabase
      .from('profiles')
      .update({ openrouter_api_key: null })
      .eq('id', user.id)

    if (error) {
      setSaveMsg({ type: 'err', text: 'Failed to remove key.' })
    } else {
      setKeyInput('')
      await refreshProfile()
      setSaveMsg({ type: 'ok', text: 'Key removed.' })
    }
    setSaving(false)
  }

  // Test fires against OpenRouter directly — only tests the value currently in the input
  const handleTest = async () => {
    const key = keyInput.trim()
    if (!key || !isValidKeyFormat(key)) {
      setFormatError('Enter a valid key (sk-or-...) before testing.')
      return
    }
    setTestState('testing')
    setTestMsg('')

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PromptPath',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
          max_tokens: 5,
        }),
      })

      if (res.ok) {
        setTestState('ok')
        setTestMsg('Connection successful — key is valid.')
      } else {
        const data = await res.json().catch(() => ({}))
        setTestState('fail')
        setTestMsg(data?.error?.message || `Error ${res.status} — check your key and try again.`)
      }
    } catch {
      setTestState('fail')
      setTestMsg('Could not reach OpenRouter. Check your internet connection.')
    }
  }

  if (loading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading…</div>
      </main>
    )
  }

  const hasKey = profile?.has_openrouter_key ?? false

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 text-sm mb-8">Manage your account preferences.</p>

        {/* Key requirement notice */}
        {!hasKey && (
          <div className="mb-6 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold text-amber-800 mb-1">OpenRouter key required to start learning</p>
              <p>
                All assessments are AI-powered using your own free key.
                It is stored securely and only used for your assessments — never shared or exposed.
              </p>
            </div>
          </div>
        )}

        {/* OpenRouter API key card */}
        <div className="glass rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-semibold text-slate-900">OpenRouter API Key</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stored encrypted server-side — never sent to your browser after saving.
              </p>
            </div>
            <span className={`ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
              hasKey
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-slate-500 bg-slate-100 border-slate-200'
            }`}>
              {hasKey ? <><CheckCircle className="w-3.5 h-3.5" /> Configured</> : 'Not set'}
            </span>
          </div>

          {/* Current key status — never show the raw value */}
          {hasKey && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500 flex items-center justify-between">
              <span className="font-mono tracking-widest">sk-or-••••••••••••••••••••••••</span>
              <button
                onClick={handleClear}
                disabled={saving}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs transition-colors ml-4"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}

          {/* Input for a new key */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 font-medium">
              {hasKey ? 'Replace with a new key' : 'Enter your API key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={e => handleKeyChange(e.target.value)}
                placeholder="sk-or-v1-..."
                spellCheck={false}
                autoComplete="off"
                className={`w-full bg-white border rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-300 focus:outline-none transition-colors font-mono ${
                  formatError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-emerald-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formatError && <p className="text-xs text-red-500">{formatError}</p>}
            <p className="text-xs text-gray-600">
              Free tier at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                openrouter.ai/keys <ExternalLink className="w-3 h-3" />
              </a>
              {' '}is sufficient for all assessments.
            </p>
          </div>

          {/* Test result */}
          {testState !== 'idle' && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-lg border ${
              testState === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : testState === 'fail'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              {testState === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
              {testState === 'ok' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {testState === 'fail' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testState === 'testing' ? 'Testing connection…' : testMsg}</span>
            </div>
          )}

          {/* Save feedback */}
          {saveMsg && (
            <div className={`text-sm flex items-center gap-2 ${
              saveMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {saveMsg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {saveMsg.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim() || Boolean(formatError)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Key
            </button>

            <button
              onClick={handleTest}
              disabled={testState === 'testing' || !keyInput.trim() || Boolean(formatError)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors border border-slate-200"
            >
              {testState === 'testing'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              Test Connection
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="mt-6 glass rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Account</h2>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Display name</span>
            <span className="text-slate-700">{profile?.display_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Email</span>
            <span className="text-slate-700">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">XP earned</span>
            <span className="text-slate-700">{profile?.xp ?? 0}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
