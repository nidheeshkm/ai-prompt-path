export type Provider = 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'xai'

export type ProviderConfig = {
  name: string
  icon: string
  model: string
  keyPrefix: string
  keyHint: string
  helpUrl: string
  tagline: string
  free: boolean
  format: 'openai' | 'anthropic'
  url: string
  dbColumn: string
}

export const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  openrouter: {
    name: 'OpenRouter',
    icon: '🔀',
    model: 'openrouter/auto',
    keyPrefix: 'sk-or-',
    keyHint: 'sk-or-v1-...',
    helpUrl: 'https://openrouter.ai/keys',
    tagline: 'Free access to 300+ models',
    free: true,
    format: 'openai',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    dbColumn: 'openrouter_api_key',
  },
  openai: {
    name: 'OpenAI',
    icon: '✦',
    model: 'gpt-4o-mini',
    keyPrefix: 'sk-',
    keyHint: 'sk-proj-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    tagline: 'GPT-4o Mini',
    free: false,
    format: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    dbColumn: 'openai_api_key',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '◆',
    model: 'claude-haiku-4-5-20251001',
    keyPrefix: 'sk-ant-',
    keyHint: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    tagline: 'Claude Haiku',
    free: false,
    format: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    dbColumn: 'anthropic_api_key',
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    model: 'llama-3.1-8b-instant',
    keyPrefix: 'gsk_',
    keyHint: 'gsk_...',
    helpUrl: 'https://console.groq.com/keys',
    tagline: 'Llama 3.1 8B · Ultra-fast',
    free: true,
    format: 'openai',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    dbColumn: 'groq_api_key',
  },
  xai: {
    name: 'xAI',
    icon: '𝕏',
    model: 'grok-3-mini',
    keyPrefix: 'xai-',
    keyHint: 'xai-...',
    helpUrl: 'https://console.x.ai/',
    tagline: 'Grok 3 Mini',
    free: false,
    format: 'openai',
    url: 'https://api.x.ai/v1/chat/completions',
    dbColumn: 'xai_api_key',
  },
}

export const PROVIDERS = Object.keys(PROVIDER_CONFIG) as Provider[]

export function validateKeyFormat(provider: Provider, key: string): string {
  if (!key) return ''
  const cfg = PROVIDER_CONFIG[provider]
  if (!key.startsWith(cfg.keyPrefix)) {
    return `${cfg.name} keys start with "${cfg.keyPrefix}"`
  }
  if (key.length < 20) return 'Key looks too short'
  return ''
}
