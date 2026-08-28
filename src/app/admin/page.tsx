import { requireAdmin } from '@/server/admin-guard'
import { courses } from '@/data/curriculum'

export default async function AdminAnalyticsPage() {
  const { admin } = await requireAdmin()

  const [
    { count: totalUsers },
    { count: totalEnrollments },
    { count: completedEnrollments },
    { count: totalCertificates },
    { data: recentSignups },
    { data: enrollmentRows },
    { count: activeToday },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('enrollments').select('*', { count: 'exact', head: true }),
    admin.from('enrollments').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    admin.from('certificates').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('display_name, created_at').order('created_at', { ascending: false }).limit(8),
    admin.from('enrollments').select('course_id'),
    admin.from('progress').select('*', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const completionRate = totalEnrollments
    ? Math.round(((completedEnrollments ?? 0) / totalEnrollments) * 100)
    : 0

  const countMap: Record<string, number> = {}
  for (const r of enrollmentRows ?? []) countMap[r.course_id] = (countMap[r.course_id] ?? 0) + 1
  const topCourses = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const stats = [
    { label: 'Total Users',     value: totalUsers ?? 0,        color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Enrollments',     value: totalEnrollments ?? 0,  color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Completion Rate', value: `${completionRate}%`,   color: 'text-emerald-600',bg: 'bg-emerald-50'},
    { label: 'Active Today',    value: activeToday ?? 0,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'Certificates',    value: totalCertificates ?? 0, color: 'text-rose-600',   bg: 'bg-rose-50'   },
  ]

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Courses by Enrollment</h2>
          <div className="space-y-3">
            {topCourses.map(([courseId, count]) => {
              const course = courses.find(c => c.id === courseId)
              return (
                <div key={courseId} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{course?.title ?? courseId}</span>
                  <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              )
            })}
            {!topCourses.length && <p className="text-sm text-slate-400">No enrollments yet</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Sign-ups</h2>
          <div className="space-y-2">
            {(recentSignups ?? []).map((u, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{u.display_name || 'Anonymous'}</span>
                <span className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {!recentSignups?.length && <p className="text-sm text-slate-400">No users yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
