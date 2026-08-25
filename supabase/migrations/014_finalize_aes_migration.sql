-- Migration 014: Finalize AES-256-GCM key storage
--
-- Run AFTER scripts/migrate-vault-to-aes.ts has completed successfully.
-- Drops vault_id, enforces NOT NULL on encrypted_key, removes vault functions.

-- Enforce NOT NULL now that all rows have been migrated
ALTER TABLE provider_keys
  ALTER COLUMN encrypted_key SET NOT NULL;

-- Remove the vault reference column
ALTER TABLE provider_keys
  DROP COLUMN IF EXISTS vault_id;

-- Drop the vault SECURITY DEFINER functions (no longer needed)
DROP FUNCTION IF EXISTS get_provider_key(uuid, text);
DROP FUNCTION IF EXISTS upsert_provider_key(uuid, text, text);
DROP FUNCTION IF EXISTS delete_provider_key(uuid, text);
