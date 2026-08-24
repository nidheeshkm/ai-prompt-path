'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PROVIDER_CONFIG, PROVIDERS, validateKeyFormat } from '@/lib/providers'
import type { Provider } from '@/lib/providers'
import {
  Key, Eye, EyeOff, CheckCircle, XCircle, Loader2,
  ExternalLink, AlertTriangle, Save, Trash2, ChevronDown, ChevronUp, Zap,
  HelpCircle, ShieldCheck, Cpu, DollarSign,
} from 'lucide-react'
import Link from 'next/link'

// ── Per-provider setup guide ─────────────────────────────────────────────────
type ProviderGuide = {
  pitch: string          // one-line "why use this" for the header
  steps: string[]        // numbered how-to steps
  freeNote?: string      // extra note about free tier
}

const PROVIDER_GUIDES: Record<Provider, ProviderGuide> = {
  openrouter: {
    pitch: 'Recommended starting point — free tier, no credit card needed.',
    steps: [
      'Open openrouter.ai in a new tab',
      'Click "Sign in" and create a free account (or log in)',
      'Go to openrouter.ai/keys',
      'Click "Create Key", give it any name (e.g. "PromptPath")',
      'Copy the key — it starts with sk-or-v1-',
      'Paste it in the field below and click Save',
    ],
    freeNote: 'Free credits are enough for all course assessments. No billing info required.',
  },
  openai: {
    pitch: 'GPT-4o Mini — fast, reliable, and widely supported.',
    steps: [
      'Open platform.openai.com in a new tab',
      'Log in or create an OpenAI account',
      'Click your profile icon → "API keys"',
      'Click "Create new secret key" and name it (e.g. "PromptPath")',
      'Copy the key — it starts with sk-proj- or sk-',
      'Paste it in the field below and click Save',
    ],
    freeNote: 'Requires a small credit top-up. GPT-4o Mini costs a fraction of a cent per assessment.',
  },
  anthropic: {
    pitch: 'Claude Haiku — great structured reasoning for code reviews.',
    steps: [
      'Open console.anthropic.com in a new tab',
      'Log in or create an Anthropic account',
      'In the left sidebar click "API Keys"',
      'Click "Create Key" and give it a name',
      'Copy the key — it starts with sk-ant-',
      'Paste it in the field below and click Save',
    ],
    freeNote: 'Requires a funded account. Claude Haiku is competitively priced.',
  },
  groq: {
    pitch: 'Llama 3.1 on Groq hardware — free tier and extremely fast inference.',
    steps: [
      'Open console.groq.com in a new tab',
      'Sign up for a free account (no credit card required)',
      'In the left sidebar click "API Keys"',
      'Click "Create API Key" and name it',
      'Copy the key — it starts with gsk_',
      'Paste it in the field below and click Save',
    ],
    freeNote: 'Groq\'s free tier is generous — more than enough for all assessments.',
  },
  xai: {
    pitch: 'Grok 3 Mini — xAI\'s efficient reasoning model.',
    steps: [
      'Open console.x.ai in a new tab',
      'Sign in with your X (Twitter) account or create one',
      'Navigate to the "API Keys" section',
      'Click "Create API Key" and name it',
      'Copy the key — it starts with xai-',
      'Paste it in the field below and click Save',
    ],
    freeNote: 'Pay-per-use pricing. Check console.x.ai for current free credits.',
  },
}

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

type ProviderState = {
  input: string
  showKey: boolean
  saving: boolean
  settingActive: boolean
  removing: boolean
  testState: TestState
  testMsg: string
  formatError: string
  saveMsg: { type: 'ok' | 'err'; text: string } | null
}

function makeDefaultState(): ProviderState {
  return {
    input: '', showKey: false, saving: false, settingActive: false, removing: false,
    testState: 'idle', testMsg: '', formatError: '', saveMsg: null,
  }
}

// ── Why do I need this? accordion ───────────────────────────────────────────
function WhyCard() {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="font-semibold text-slate-900 text-sm flex-1">Why do I need to configure an API key?</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            PromptPath uses AI to power two core features: <strong className="text-slate-800">quiz evaluation</strong> and{' '}
            <strong className="text-slate-800">code review</strong>. When you answer a quiz or submit code, the response
            is sent to an AI model that grades your work, explains what you got right, and gives you actionable hints.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-emerald-800 mb-1">Your key, your privacy</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your code and answers go directly to your chosen provider — not stored by us beyond what the provider returns.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <Cpu className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-xs font-semibold text-blue-800 mb-1">You choose the model</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Pick any supported provider. OpenRouter and Groq both offer free tiers — no credit card required to get started.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <DollarSign className="w-5 h-5 text-amber-600 mb-2" />
              <p className="text-xs font-semibold text-amber-800 mb-1">Tiny cost per assessment</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                A full quiz or code review uses a fraction of a cent. Free tiers cover most learners entirely.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Your key is stored encrypted in your account and never shared with other users or third-party services beyond your chosen provider.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Per-provider setup guide ─────────────────────────────────────────────────
function ProviderGuidePanel({ provider, isConfigured }: { provider: Provider; isConfigured: boolean }) {
  const [open, setOpen] = useState(!isConfigured)
  const guide = PROVIDER_GUIDES[provider]
  const cfg = PROVIDER_CONFIG[provider]

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-xs hover:bg-slate-100/60 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-500 flex-1">
          {isConfigured ? 'How to get a replacement key' : 'How to get your API key'}
          {' '}
          <span className="text-slate-400">· {cfg.name}</span>
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-slate-500 italic">{guide.pitch}</p>

          <ol className="space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {guide.freeNote && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              💡 {guide.freeNote}
            </p>
          )}

          <a
            href={cfg.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Open {cfg.name} key page <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  const [expanded, setExpanded] = useState<Provider | null>('openrouter')
  const [states, setStates] = useState<Record<Provider, ProviderState>>(
    () => Object.fromEntries(PROVIDERS.map(p => [p, makeDefaultState()])) as Record<Provider, ProviderState>
  )

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  function update(provider: Provider, patch: Partial<ProviderState>) {
    setStates(prev => ({ ...prev, [provider]: { ...prev[provider], ...patch } }))
  }

  function handleKeyChange(provider: Provider, val: string) {
    update(provider, {
      input: val,
      formatError: val ? validateKeyFormat(provider, val) : '',
      testState: 'idle',
      saveMsg: null,
    })
  }

  async function handleSave(provider: Provider) {
    if (!user) return
    const s = states[provider]
    const trimmed = s.input.trim()
    if (trimmed && s.formatError) return

    update(provider, { saving: true, saveMsg: null })

    const col = PROVIDER_CONFIG[provider].dbColumn
    const isFirstKey = !profile?.configured_providers?.length
    const shouldSetActive = trimmed && (isFirstKey || !profile?.active_provider)

    const patch: Record<string, unknown> = { [col]: trimmed || null }
    if (shouldSetActive) patch.active_provider = provider
    if (!trimmed && profile?.active_provider === provider) {
      // Removing the active provider's key — clear active_provider
      patch.active_provider = profile.configured_providers.find(p => p !== provider) ?? null
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)

    if (error) {
      update(provider, { saving: false, saveMsg: { type: 'err', text: 'Failed to save. Please try again.' } })
    } else {
      update(provider, { saving: false, input: '', saveMsg: { type: 'ok', text: trimmed ? 'Key saved.' : 'Key removed.' } })
      await refreshProfile()
    }
  }

  async function handleRemove(provider: Provider) {
    if (!user) return
    update(provider, { removing: true, saveMsg: null })

    const col = PROVIDER_CONFIG[provider].dbColumn
    const patch: Record<string, unknown> = { [col]: null }
    if (profile?.active_provider === provider) {
      patch.active_provider = profile.configured_providers.find(p => p !== provider) ?? null
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) {
      update(provider, { removing: false, saveMsg: { type: 'err', text: 'Failed to remove key.' } })
    } else {
      update(provider, { removing: false, input: '', saveMsg: { type: 'ok', text: 'Key removed.' } })
      await refreshProfile()
    }
  }

  async function handleSetActive(provider: Provider) {
    if (!user) return
    update(provider, { settingActive: true })
    await supabase.from('profiles').update({ active_provider: provider }).eq('id', user.id)
    await refreshProfile()
    update(provider, { settingActive: false })
  }

  async function handleTest(provider: Provider) {
    const s = states[provider]
    const key = s.input.trim()
    if (!key || s.formatError) {
      update(provider, { formatError: 'Enter a valid key before testing.' })
      return
    }
    update(provider, { testState: 'testing', testMsg: '' })
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      })
      const data = await res.json()
      update(provider, { testState: data.ok ? 'ok' : 'fail', testMsg: data.message })
    } catch {
      update(provider, { testState: 'fail', testMsg: 'Could not reach server. Check your connection.' })
    }
  }

  if (loading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading…</div>
      </main>
    )
  }

  const configuredProviders = profile?.configured_providers ?? []
  const activeProvider = profile?.active_provider ?? null
  const hasAnyKey = profile?.has_api_key ?? false

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 text-sm mb-6">Manage your AI provider keys and account preferences.</p>

        {/* Why do I need this? */}
        <WhyCard />

        {/* No key warning */}
        {!hasAnyKey && (
          <div className="mt-4 mb-2 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-0.5">Add an AI provider key to start learning</p>
              <p className="text-amber-700">Pick any provider below — OpenRouter and Groq both have free tiers and no credit card required.</p>
            </div>
          </div>
        )}

        {/* Provider cards */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">AI Providers</h2>

          {PROVIDERS.map((provider) => {
            const cfg = PROVIDER_CONFIG[provider]
            const s = states[provider]
            const isConfigured = configuredProviders.includes(provider)
            const isActive = activeProvider === provider
            const isOpen = expanded === provider

            return (
              <div
                key={provider}
                className={`glass rounded-xl overflow-hidden transition-all ${isActive ? 'border-emerald-300 shadow-sm shadow-emerald-100' : ''}`}
              >
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : provider)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-xl w-7 text-center shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{cfg.name}</span>
                      <span className="text-xs text-slate-400">{cfg.tagline}</span>
                      {cfg.free && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Free</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{cfg.model}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                        <Zap className="w-3 h-3" /> Active
                      </span>
                    )}
                    {isConfigured && !isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">Configured</span>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">

                    {/* Setup guide */}
                    <ProviderGuidePanel provider={provider} isConfigured={isConfigured} />

                    {/* Configured key display */}
                    {isConfigured && (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                        <span className="font-mono text-sm text-slate-500 tracking-widest">
                          {cfg.keyPrefix}{'•'.repeat(20)}
                        </span>
                        <div className="flex items-center gap-3 ml-4">
                          {!isActive && (
                            <button
                              onClick={() => handleSetActive(provider)}
                              disabled={s.settingActive}
                              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50"
                            >
                              {s.settingActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              Set as active
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(provider)}
                            disabled={s.removing}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            {s.removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Key input */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600 font-medium">
                        {isConfigured ? 'Replace with a new key' : 'Enter your API key'}
                      </label>
                      <div className="relative">
                        <input
                          type={s.showKey ? 'text' : 'password'}
                          value={s.input}
                          onChange={e => handleKeyChange(provider, e.target.value)}
                          placeholder={cfg.keyHint}
                          spellCheck={false}
                          autoComplete="off"
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-300 focus:outline-none transition-colors font-mono ${
                            s.formatError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-emerald-400'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => update(provider, { showKey: !s.showKey })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {s.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {s.formatError && <p className="text-xs text-red-500">{s.formatError}</p>}
                      <p className="text-xs text-slate-400">
                        Get your key at{' '}
                        <a href={cfg.helpUrl} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">
                          {cfg.helpUrl.replace('https://', '')} <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>

                    {/* Test result */}
                    {s.testState !== 'idle' && (
                      <div className={`flex items-start gap-2 text-sm p-3 rounded-lg border ${
                        s.testState === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : s.testState === 'fail' ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {s.testState === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
                        {s.testState === 'ok' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        {s.testState === 'fail' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{s.testState === 'testing' ? 'Testing connection…' : s.testMsg}</span>
                      </div>
                    )}

                    {/* Save feedback */}
                    {s.saveMsg && (
                      <div className={`text-sm flex items-center gap-2 ${s.saveMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {s.saveMsg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {s.saveMsg.text}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => handleSave(provider)}
                        disabled={s.saving || !s.input.trim() || Boolean(s.formatError)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                      >
                        {s.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Key
                      </button>
                      <button
                        onClick={() => handleTest(provider)}
                        disabled={s.testState === 'testing' || !s.input.trim() || Boolean(s.formatError)}
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 transition-colors"
                      >
                        {s.testState === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        Test Connection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Active provider summary */}
        {hasAnyKey && (
          <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              Assessments are running on{' '}
              <span className="font-semibold">{activeProvider ? PROVIDER_CONFIG[activeProvider].name : '—'}</span>
              {' '}({activeProvider ? PROVIDER_CONFIG[activeProvider].model : ''}).
              {' '}<button onClick={() => setExpanded(activeProvider)} className="underline underline-offset-2 hover:no-underline">Change provider</button>
            </p>
          </div>
        )}

        {/* Account info */}
        <div className="glass rounded-xl p-6 space-y-3">
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
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Active provider</span>
            <span className="text-slate-700">{activeProvider ? PROVIDER_CONFIG[activeProvider].name : 'None'}</span>
          </div>
        </div>

        {/* Security notice */}
        <p className="mt-4 text-xs text-slate-400 text-center">
          Keys are stored encrypted in your account and never exposed to other users or sent to third parties beyond your chosen provider.
        </p>
      </div>
    </main>
  )
}
