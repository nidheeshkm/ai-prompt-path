import { requireAdmin } from '@/server/admin-guard'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsersPage() {
  const { admin } = await requireAdmin()

  // Fetch profiles + join email from auth.users via admin API
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, xp, current_streak, is_admin, is_blocked, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Get enrollment counts per user
  const { data: enrollmentCounts } = await admin
    .from('enrollments')
    .select('user_id')

  const countMap: Record<string, number> = {}
  for (const r of enrollmentCounts ?? []) {
    countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1
  }

  // Fetch emails from auth.users (service role only)
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? ''

  const users = (profiles ?? []).map(p => ({
    ...p,
    email: emailMap[p.id] ?? '',
    enrollments: countMap[p.id] ?? 0,
  }))

  return <AdminUsersClient users={users} />
}
