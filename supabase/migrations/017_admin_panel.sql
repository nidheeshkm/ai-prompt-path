-- Migration 017: Admin panel foundation

-- ── 1. Admin role on profiles ─────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ── 2. Course settings (active/inactive gate) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS course_settings (
  course_id  text PRIMARY KEY,
  is_active  boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (needed by courses listing + enrollment check)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='course_settings' AND policyname='Authenticated users can read course settings'
  ) THEN
    CREATE POLICY "Authenticated users can read course settings"
      ON course_settings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── 3. Global settings (key/value store) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read global settings (review route needs allowed_providers)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='global_settings' AND policyname='Authenticated users can read global settings'
  ) THEN
    CREATE POLICY "Authenticated users can read global settings"
      ON global_settings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Seed default global settings
INSERT INTO global_settings (key, value) VALUES
  ('allowed_providers', '["openrouter","openai","anthropic","groq","xai"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
