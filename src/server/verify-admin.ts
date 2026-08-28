import 'server-only'
import type { NextRequest } from 'next/server'
import { createAdminClient } from './supabase-admin'

/**
 * Decode the Supabase user ID from the sb-*-auth-token cookie.
 * @supabase/ssr v0.5+ stores the session as `base64-<base64(sessionJSON)>` where
 * sessionJSON contains the full session object with a `user.id` field.
 * Falls back to raw JWT parsing for older storage formats.
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('-auth-token')) continue
    try {
      const { value } = cookie

      // New format: "base64-<base64encodedSessionJSON>"
      if (value.startsWith('base64-')) {
        const json = JSON.parse(atob(value.slice('base64-'.length)))
        const id = json?.user?.id
        if (id) return id as string
        continue
      }

      // Legacy format: raw JWT "header.payload.signature"
      const parts = value.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        if (payload?.sub) return payload.sub as string
      }
    } catch {
      // malformed — try next
    }
  }
  return null
}

/**
 * Verify the caller is an authenticated admin.
 * Returns { userId, admin } on success, null on failure.
 * Use in API routes — for server components use requireAdmin() instead.
 */
export async function verifyAdminRequest(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return null

  const admin = createAdminClient()

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('is_admin').eq('id', userId).single(),
  ])

  if (!authUser?.user || !profile?.is_admin) return null

  return { userId, admin }
}
