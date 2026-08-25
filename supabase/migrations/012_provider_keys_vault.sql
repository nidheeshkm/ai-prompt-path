-- Migration 012: Encrypt API keys with Supabase Vault
--
-- Moves provider API keys out of the plaintext profiles columns into
-- vault.secrets (encrypted at rest via pgsodium). A new provider_keys
-- table holds (user_id, provider, vault_id) — the decrypted value is
-- never readable by any client regardless of role.
--
-- Step order matters:
--   1. Create provider_keys table
--   2. Migrate existing plaintext keys into vault
--   3. Drop plaintext columns from profiles
--   4. Create SECURITY DEFINER helper functions

-- ── 1. provider_keys table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_keys (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   text        NOT NULL CHECK (provider IN ('openrouter','openai','anthropic','groq','xai')),
  vault_id   uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE provider_keys ENABLE ROW LEVEL SECURITY;

-- Users can see which providers they've configured; vault_id alone is harmless.
-- The decrypted key is only accessible via service_role or SECURITY DEFINER functions.
CREATE POLICY "provider_keys_own" ON provider_keys
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. Migrate existing plaintext keys → vault ─────────────────────────────
--
-- Runs only if the old columns still exist. Safe to rerun — ON CONFLICT skips dupes.

DO $$
DECLARE
  r          RECORD;
  v_vault_id uuid;
BEGIN
  -- Guard: skip if the plaintext columns are already gone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'openrouter_api_key'
  ) THEN
    RAISE NOTICE 'Plaintext key columns already removed — skipping migration.';
    RETURN;
  END IF;

  FOR r IN
    SELECT id,
           openrouter_api_key, openai_api_key, anthropic_api_key,
           groq_api_key,       xai_api_key
    FROM profiles
    WHERE openrouter_api_key IS NOT NULL
       OR openai_api_key     IS NOT NULL
       OR anthropic_api_key  IS NOT NULL
       OR groq_api_key       IS NOT NULL
       OR xai_api_key        IS NOT NULL
  LOOP
    IF r.openrouter_api_key IS NOT NULL THEN
      v_vault_id := vault.create_secret(r.openrouter_api_key, 'pk:' || r.id || ':openrouter');
      INSERT INTO provider_keys (user_id, provider, vault_id)
        VALUES (r.id, 'openrouter', v_vault_id)
        ON CONFLICT (user_id, provider) DO NOTHING;
    END IF;

    IF r.openai_api_key IS NOT NULL THEN
      v_vault_id := vault.create_secret(r.openai_api_key, 'pk:' || r.id || ':openai');
      INSERT INTO provider_keys (user_id, provider, vault_id)
        VALUES (r.id, 'openai', v_vault_id)
        ON CONFLICT (user_id, provider) DO NOTHING;
    END IF;

    IF r.anthropic_api_key IS NOT NULL THEN
      v_vault_id := vault.create_secret(r.anthropic_api_key, 'pk:' || r.id || ':anthropic');
      INSERT INTO provider_keys (user_id, provider, vault_id)
        VALUES (r.id, 'anthropic', v_vault_id)
        ON CONFLICT (user_id, provider) DO NOTHING;
    END IF;

    IF r.groq_api_key IS NOT NULL THEN
      v_vault_id := vault.create_secret(r.groq_api_key, 'pk:' || r.id || ':groq');
      INSERT INTO provider_keys (user_id, provider, vault_id)
        VALUES (r.id, 'groq', v_vault_id)
        ON CONFLICT (user_id, provider) DO NOTHING;
    END IF;

    IF r.xai_api_key IS NOT NULL THEN
      v_vault_id := vault.create_secret(r.xai_api_key, 'pk:' || r.id || ':xai');
      INSERT INTO provider_keys (user_id, provider, vault_id)
        VALUES (r.id, 'xai', v_vault_id)
        ON CONFLICT (user_id, provider) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ── 3. Drop plaintext columns from profiles ────────────────────────────────

ALTER TABLE profiles
  DROP COLUMN IF EXISTS openrouter_api_key,
  DROP COLUMN IF EXISTS openai_api_key,
  DROP COLUMN IF EXISTS anthropic_api_key,
  DROP COLUMN IF EXISTS groq_api_key,
  DROP COLUMN IF EXISTS xai_api_key;

-- ── 4. SECURITY DEFINER helper functions ───────────────────────────────────
--
-- These run as the postgres superuser role (SECURITY DEFINER) so they can
-- read vault.decrypted_secrets and write vault.secrets without granting
-- those permissions to service_role directly.
-- REVOKE from PUBLIC ensures no client can call them directly.

-- get_provider_key: decrypt and return one key (used by /api/review)
CREATE OR REPLACE FUNCTION get_provider_key(p_user_id uuid, p_provider text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT ds.decrypted_secret
  FROM   provider_keys pk
  JOIN   vault.decrypted_secrets ds ON ds.id = pk.vault_id
  WHERE  pk.user_id  = p_user_id
    AND  pk.provider = p_provider
  LIMIT  1
$$;

REVOKE ALL ON FUNCTION get_provider_key(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_provider_key(uuid, text) TO service_role;

-- upsert_provider_key: encrypt and store/replace a key (used by /api/keys POST)
CREATE OR REPLACE FUNCTION upsert_provider_key(
  p_user_id  uuid,
  p_provider text,
  p_key      text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing uuid;
  v_name     text := 'pk:' || p_user_id::text || ':' || p_provider;
BEGIN
  SELECT vault_id INTO v_existing
  FROM   provider_keys
  WHERE  user_id = p_user_id AND provider = p_provider;

  IF v_existing IS NOT NULL THEN
    -- Update the existing vault secret in place
    PERFORM vault.update_secret(v_existing, p_key, v_name);
    UPDATE  provider_keys SET updated_at = now()
    WHERE   user_id = p_user_id AND provider = p_provider;
  ELSE
    -- Create a new vault secret and link it
    INSERT INTO provider_keys (user_id, provider, vault_id)
    VALUES (p_user_id, p_provider, vault.create_secret(p_key, v_name));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION upsert_provider_key(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION upsert_provider_key(uuid, text, text) TO service_role;

-- delete_provider_key: remove key row + vault secret (used by /api/keys DELETE)
CREATE OR REPLACE FUNCTION delete_provider_key(p_user_id uuid, p_provider text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id uuid;
BEGIN
  SELECT vault_id INTO v_vault_id
  FROM   provider_keys
  WHERE  user_id = p_user_id AND provider = p_provider;

  IF v_vault_id IS NOT NULL THEN
    DELETE FROM provider_keys
    WHERE  user_id = p_user_id AND provider = p_provider;
    -- Remove the encrypted secret to avoid orphaned vault entries
    DELETE FROM vault.secrets WHERE id = v_vault_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION delete_provider_key(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION delete_provider_key(uuid, text) TO service_role;
