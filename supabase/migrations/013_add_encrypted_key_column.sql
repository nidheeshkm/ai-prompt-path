-- Migration 013: Add app-level AES-256-GCM encrypted_key column
--
-- Transitional step — keeps vault_id so the migration script can read
-- existing secrets from vault and re-encrypt them with the app key.
-- Run scripts/migrate-vault-to-aes.ts AFTER this, then apply 014.

ALTER TABLE provider_keys
  ADD COLUMN IF NOT EXISTS encrypted_key text;
