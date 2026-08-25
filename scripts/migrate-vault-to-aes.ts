/**
 * Reads every vault-encrypted provider key from Supabase Vault,
 * re-encrypts it with AES-256-GCM using ENCRYPTION_KEY, and writes
 * the result back to provider_keys.encrypted_key.
 *
 * Run AFTER applying migration 013 and BEFORE applying migration 014.
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL    in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY   in .env.local
 *   - ENCRYPTION_KEY              in .env.local  (64 hex chars — see below)
 *
 * Generate ENCRYPTION_KEY:
 *   openssl rand -hex 32
 *
 * Usage:
 *   npx tsx scripts/migrate-vault-to-aes.ts [--dry-run]
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

// ── Inline AES-256-GCM (mirrors src/server/crypto.ts without 'server-only') ─

function getKeyMaterial(): ArrayBuffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string.\n' +
      'Generate one with:  openssl rand -hex 32\n' +
      'Then add it to .env.local as:  ENCRYPTION_KEY=<value>'
    )
  }
  return new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16))).buffer as ArrayBuffer
}

async function encryptApiKey(plaintext: string): Promise<string> {
  const ivBytes = new Uint8Array(12)
  crypto.getRandomValues(ivBytes)
  const iv     = ivBytes.buffer as ArrayBuffer
  const key    = await crypto.subtle.importKey('raw', getKeyMaterial(), { name: 'AES-GCM' }, false, ['encrypt'])
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return `${Buffer.from(iv).toString('base64')}:${Buffer.from(cipher).toString('base64')}`
}

// ─────────────────────────────────────────────────────────────────────────────

const url            = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

async function main() {
  console.log(`Re-encrypting vault keys with AES-256-GCM${DRY_RUN ? ' [DRY RUN]' : ''}...\n`)

  // Fetch all rows that still have a vault_id (not yet migrated)
  const { data: rows, error: fetchErr } = await admin
    .from('provider_keys')
    .select('user_id, provider, vault_id')

  if (fetchErr) {
    console.error('Failed to fetch provider_keys:', fetchErr.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('No provider_keys rows found — nothing to migrate.')
    return
  }

  let ok = 0, skipped = 0, failed = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.vault_id) {
      console.log(`  SKIP ${row.user_id}/${row.provider} — no vault_id`)
      skipped++
      continue
    }

    // Decrypt from vault using the SECURITY DEFINER function (service role can call it)
    const { data: plaintext, error: decryptErr } = await admin.rpc('get_provider_key', {
      p_user_id:  row.user_id,
      p_provider: row.provider,
    })

    if (decryptErr || !plaintext) {
      const msg = `  FAIL ${row.user_id}/${row.provider} — vault decrypt: ${decryptErr?.message ?? 'empty result'}`
      console.error(msg)
      errors.push(msg)
      failed++
      continue
    }

    // Re-encrypt with AES-256-GCM
    let encrypted: string
    try {
      encrypted = await encryptApiKey(plaintext as string)
    } catch (e) {
      const msg = `  FAIL ${row.user_id}/${row.provider} — AES encrypt: ${(e as Error).message}`
      console.error(msg)
      errors.push(msg)
      failed++
      continue
    }

    if (DRY_RUN) {
      console.log(`  DRY  ${row.user_id}/${row.provider} — would write ${encrypted.length} chars`)
      ok++
      continue
    }

    const { error: updateErr } = await admin
      .from('provider_keys')
      .update({ encrypted_key: encrypted })
      .eq('user_id', row.user_id)
      .eq('provider', row.provider)

    if (updateErr) {
      const msg = `  FAIL ${row.user_id}/${row.provider} — DB update: ${updateErr.message}`
      console.error(msg)
      errors.push(msg)
      failed++
    } else {
      console.log(`  OK   ${row.user_id}/${row.provider}`)
      ok++
    }
  }

  console.log(`\nDone: ${ok} migrated, ${skipped} skipped, ${failed} failed.`)

  if (failed > 0) {
    console.error('\nErrors:')
    errors.forEach(e => console.error(' ', e))
    console.error('\nFix the errors above before applying migration 014.')
    process.exit(1)
  }

  if (!DRY_RUN) {
    console.log('\nAll keys migrated. You can now apply migration 014 to finalize.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
