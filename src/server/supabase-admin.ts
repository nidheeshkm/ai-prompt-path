import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client using the service-role key.
 * Bypasses RLS — use only in server-side API routes, never in client code.
 * The service-role key must be in SUPABASE_SERVICE_ROLE_KEY (not NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never commit it, never prefix with NEXT_PUBLIC_).'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
