import { requireAdmin } from '@/server/admin-guard'
import AdminCourseRequestsClient from './AdminCourseRequestsClient'

export default async function AdminCourseRequestsPage() {
  const { admin } = await requireAdmin()

  const { data: requests } = await admin
    .from('course_requests')
    .select('id, user_id, title, description, status, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = [...new Set((requests ?? []).map(r => r.user_id))]

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

  const rows = (requests ?? []).map(r => ({
    ...r,
    userName: nameMap[r.user_id] ?? 'Unknown',
    userEmail: emailMap[r.user_id] ?? '',
  }))

  return <AdminCourseRequestsClient requests={rows} />
}
