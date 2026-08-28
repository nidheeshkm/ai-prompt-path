import { requireAdmin } from '@/server/admin-guard'
import { courses } from '@/data/curriculum'
import AdminCoursesClient from './AdminCoursesClient'

export default async function AdminCoursesPage() {
  const { admin } = await requireAdmin()

  // Enrollment + completion counts per course
  const [{ data: enrollments }, { data: completions }, { data: settings }] = await Promise.all([
    admin.from('enrollments').select('course_id'),
    admin.from('enrollments').select('course_id').not('completed_at', 'is', null),
    admin.from('course_settings').select('course_id, is_active'),
  ])

  const enrollMap: Record<string, number> = {}
  const completeMap: Record<string, number> = {}
  const activeMap: Record<string, boolean> = {}

  for (const r of enrollments ?? []) enrollMap[r.course_id] = (enrollMap[r.course_id] ?? 0) + 1
  for (const r of completions ?? []) completeMap[r.course_id] = (completeMap[r.course_id] ?? 0) + 1
  for (const r of settings ?? []) activeMap[r.course_id] = r.is_active

  const rows = courses.map(c => ({
    id: c.id,
    title: c.title,
    icon: c.icon,
    tagline: c.tagline,
    enrollments: enrollMap[c.id] ?? 0,
    completions: completeMap[c.id] ?? 0,
    // default true if no row in course_settings yet
    is_active: activeMap[c.id] ?? true,
  }))

  return <AdminCoursesClient courses={rows} />
}
