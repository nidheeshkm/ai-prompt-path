import { requireAdmin } from '@/server/admin-guard'
import AdminTicketsClient from './AdminTicketsClient'

export default async function AdminTicketsPage() {
  const { admin } = await requireAdmin()

  const { data: tickets } = await admin
    .from('support_tickets')
    .select('id, user_id, type, message, status, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  // Get display names + emails for the user_ids
  const userIds = [...new Set((tickets ?? []).map(t => t.user_id))]

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    admin.from('profiles').select('id, display_name').in('id', userIds),
    userIds.length > 0
      ? admin.auth.admin.listUsers({ perPage: 1000 })
      : Promise.resolve({ data: { users: [] } }),
  ])

  const nameMap: Record<string, string> = {}
  const emailMap: Record<string, string> = {}
  for (const p of profiles ?? []) nameMap[p.id] = p.display_name ?? 'Unnamed'
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? ''

  const rows = (tickets ?? []).map(t => ({
    ...t,
    userName: nameMap[t.user_id] ?? 'Unknown',
    userEmail: emailMap[t.user_id] ?? '',
  }))

  const pendingCount = rows.filter(r => r.status === 'pending').length

  return <AdminTicketsClient tickets={rows} pendingCount={pendingCount} />
}
