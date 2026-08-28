import { requireAdmin } from '@/server/admin-guard'
import AdminFeedbackClient from './AdminFeedbackClient'

export default async function AdminFeedbackPage() {
  const { admin } = await requireAdmin()

  const { data: rows } = await admin
    .from('support_tickets')
    .select('id, user_id, type, category, message, status, priority, admin_note, screenshot_url, course_id, topic_id, created_at')
    .in('type', ['feedback', 'bug'])
    .order('created_at', { ascending: false })
    .limit(300)

  const userIds = [...new Set((rows ?? []).map(r => r.user_id))]

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    admin.from('profiles').select('id, display_name').in('id', userIds),
    userIds.length > 0
      ? admin.auth.admin.listUsers({ perPage: 1000 })
      : Promise.resolve({ data: { users: [] } }),
  ])

  const nameMap:  Record<string, string> = {}
  const emailMap: Record<string, string> = {}
  for (const p of profiles ?? []) nameMap[p.id]  = p.display_name ?? 'Unnamed'
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? ''

  // Generate 1-hour signed URLs for any screenshots
  const signedUrls: Record<string, string> = {}
  for (const row of rows ?? []) {
    if (row.screenshot_url) {
      const { data } = await admin.storage
        .from('feedback-screenshots')
        .createSignedUrl(row.screenshot_url, 3600)
      if (data?.signedUrl) signedUrls[row.id] = data.signedUrl
    }
  }

  const tickets = (rows ?? []).map(r => ({
    ...r,
    userName:     nameMap[r.user_id]  ?? 'Unknown',
    userEmail:    emailMap[r.user_id] ?? '',
    screenshotSignedUrl: signedUrls[r.id] ?? null,
  }))

  const pendingCount = tickets.filter(t => t.status === 'pending').length

  return <AdminFeedbackClient tickets={tickets} pendingCount={pendingCount} />
}
