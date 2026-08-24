-- Support multiple AI provider keys per user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_provider TEXT DEFAULT 'openrouter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS groq_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xai_api_key TEXT;
