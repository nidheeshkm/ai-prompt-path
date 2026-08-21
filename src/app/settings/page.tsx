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
        <div className="animate-pulse text-gray-500">Loading…</div>
      </main>
    )
  }

  const hasKey = profile?.has_openrouter_key ?? false

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-400 text-sm mb-8">Manage your account preferences.</p>

        {/* Key requirement notice */}
        {!hasKey && (
          <div className="mb-6 flex gap-3 bg-amber-900/15 border border-amber-700/40 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/80">
              <p className="font-semibold text-amber-300 mb-1">OpenRouter key required to start learning</p>
              <p>
                All assessments are AI-powered using your own free key.
                It is stored securely and only used for your assessments — never shared or exposed.
              </p>
            </div>
          </div>
        )}

        {/* OpenRouter API key card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-semibold text-white">OpenRouter API Key</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Stored encrypted server-side — never sent to your browser after saving.
              </p>
            </div>
            <span className={`ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
              hasKey
                ? 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30'
                : 'text-gray-500 bg-gray-800 border-gray-700'
            }`}>
              {hasKey ? <><CheckCircle className="w-3.5 h-3.5" /> Configured</> : 'Not set'}
            </span>
          </div>

          {/* Current key status — never show the raw value */}
          {hasKey && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400 flex items-center justify-between">
              <span className="font-mono tracking-widest">sk-or-••••••••••••••••••••••••</span>
              <button
                onClick={handleClear}
                disabled={saving}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors ml-4"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}

          {/* Input for a new key */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">
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
                className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors font-mono ${
                  formatError ? 'border-red-600 focus:border-red-500' : 'border-gray-700 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formatError && <p className="text-xs text-red-400">{formatError}</p>}
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
            <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
              testState === 'ok'
                ? 'bg-emerald-900/15 border border-emerald-700/30 text-emerald-300'
                : testState === 'fail'
                ? 'bg-red-900/15 border border-red-700/30 text-red-300'
                : 'bg-gray-800 text-gray-400'
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
              saveMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
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
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Key
            </button>

            <button
              onClick={handleTest}
              disabled={testState === 'testing' || !keyInput.trim() || Boolean(formatError)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors border border-gray-700"
            >
              {testState === 'testing'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              Test Connection
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-white">Account</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Display name</span>
            <span className="text-gray-300">{profile?.display_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-300">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">XP earned</span>
            <span className="text-gray-300">{profile?.xp ?? 0}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
