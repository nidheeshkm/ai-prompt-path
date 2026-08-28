import { requireAdmin } from '@/server/admin-guard'
import { courses } from '@/data/curriculum'
import AdminCertificatesClient from './AdminCertificatesClient'

export default async function AdminCertificatesPage() {
  const { admin } = await requireAdmin()

  const { data: certs } = await admin
    .from('certificates')
    .select('id, course_id, issued_at, profiles(display_name)')
    .order('issued_at', { ascending: false })
    .limit(200)

  const rows = (certs ?? []).map(c => ({
    id: c.id,
    courseId: c.course_id,
    courseTitle: courses.find(x => x.id === c.course_id)?.title ?? c.course_id,
    userName: (c.profiles as any)?.display_name ?? 'Unknown',
    issuedAt: c.issued_at,
  }))

  return <AdminCertificatesClient certificates={rows} />
}
