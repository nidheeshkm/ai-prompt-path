import 'server-only'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from './supabase-admin'

/**
 * Decode user ID from the Supabase session cookie.
 * @supabase/ssr v0.5+ format: "base64-<base64(sessionJSON)>"
 * Legacy format: raw JWT "header.payload.signature"
 */
function getUserIdFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('-auth-token')) continue
    try {
      const { value } = cookie

      if (value.startsWith('base64-')) {
        const json = JSON.parse(atob(value.slice('base64-'.length)))
        const id = json?.user?.id
        if (id) return id as string
        continue
      }

      const parts = value.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        if (payload?.sub) return payload.sub as string
      }
    } catch {
      // malformed cookie
    }
  }
  return null
}

export async function requireAdmin() {
  const cookieStore = await cookies()

  const userId = getUserIdFromCookies(cookieStore)
  if (!userId) redirect('/')

  const admin = createAdminClient()

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('is_admin').eq('id', userId).single(),
  ])

  if (!authUser?.user) redirect('/')
  if (!profile?.is_admin) redirect('/')

  // Must have arrived via Settings → Admin Panel (not a direct URL).
  const adminAccess = cookieStore.get('admin_access')
  if (adminAccess?.value !== userId) redirect('/settings')

  return { user: authUser.user, admin }
}
