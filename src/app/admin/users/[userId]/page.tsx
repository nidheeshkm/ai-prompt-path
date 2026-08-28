import { requireAdmin } from '@/server/admin-guard'
import { courses } from '@/data/curriculum'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ShieldCheck, Ban, Zap, Flame, BookOpen,
  Award, Star, CalendarDays, Mail,
} from 'lucide-react'

const courseMap = Object.fromEntries(courses.map(c => [c.id, { title: c.title, icon: c.icon }]))

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const { admin } = await requireAdmin()

  const [
    { data: profile },
    { data: enrollments },
    { data: progressRows },
    { data: milestoneRows },
    { data: certificates },
    { data: badges },
  ] = await Promise.all([
    admin.from('profiles')
      .select('id, display_name, avatar_url, xp, level, current_streak, longest_streak, last_activity_date, created_at, is_admin, is_blocked')
      .eq('id', userId)
      .single(),
    admin.from('enrollments')
      .select('course_id, enrolled_at, completed_at')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false }),
    admin.from('progress')
      .select('course_id, status')
      .eq('user_id', userId),
    admin.from('milestone_progress')
      .select('course_id, status')
      .eq('user_id', userId),
    admin.from('certificates')
      .select('id, course_id, issued_at')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false }),
    admin.from('badges')
      .select('badge_type, earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false }),
  ])

  if (!profile) notFound()

  // Get email from auth
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const email = authUser?.user?.email ?? '—'

  // Build per-course progress counts
  const topicsCompleted: Record<string, number> = {}
  for (const r of progressRows ?? []) {
    if (r.status === 'completed') topicsCompleted[r.course_id] = (topicsCompleted[r.course_id] ?? 0) + 1
  }
  const milestonesCompleted: Record<string, number> = {}
  for (const r of milestoneRows ?? []) {
    if (r.status === 'completed') milestonesCompleted[r.course_id] = (milestonesCompleted[r.course_id] ?? 0) + 1
  }

  const completedCourses = (enrollments ?? []).filter(e => e.completed_at).length

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xl font-bold text-amber-700">
              {(profile.display_name ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{profile.display_name || 'Unnamed'}</h1>
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
              {profile.is_blocked && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                  <Ban className="w-3 h-3" /> Blocked
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
              <Mail className="w-3.5 h-3.5" /> {email}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <CalendarDays className="w-3 h-3" />
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {profile.last_activity_date && (
                <> · Last active {new Date(profile.last_activity_date).toLocaleDateString()}</>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <StatChip icon={<Zap className="w-4 h-4 text-amber-500" />} label="XP" value={profile.xp.toLocaleString()} />
          <StatChip icon={<Star className="w-4 h-4 text-blue-500" />} label="Level" value={String(profile.level)} />
          <StatChip icon={<Flame className="w-4 h-4 text-orange-500" />} label="Current streak" value={`${profile.current_streak}d`} />
          <StatChip icon={<Flame className="w-4 h-4 text-slate-400" />} label="Longest streak" value={`${profile.longest_streak}d`} />
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Enrollments" value={enrollments?.length ?? 0} color="blue" />
        <SummaryCard label="Completed" value={completedCourses} color="emerald" />
        <SummaryCard label="Certificates" value={certificates?.length ?? 0} color="amber" />
        <SummaryCard label="Badges" value={badges?.length ?? 0} color="purple" />
      </div>

      {/* Enrolled courses */}
      <Section title="Enrolled Courses" icon={<BookOpen className="w-4 h-4" />}>
        {(enrollments ?? []).length === 0 ? (
          <Empty text="No course enrollments yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {(enrollments ?? []).map(e => {
              const meta = courseMap[e.course_id]
              return (
                <div key={e.course_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{meta?.icon ?? '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{meta?.title ?? e.course_id}</p>
                    <p className="text-xs text-slate-400">
                      Enrolled {new Date(e.enrolled_at).toLocaleDateString()}
                      {e.completed_at && (
                        <> · <span className="text-emerald-600 font-medium">Completed {new Date(e.completed_at).toLocaleDateString()}</span></>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{topicsCompleted[e.course_id] ?? 0}</span> topics done
                    </p>
                    {(milestonesCompleted[e.course_id] ?? 0) > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">
                        {milestonesCompleted[e.course_id]} milestone{milestonesCompleted[e.course_id] !== 1 ? 's' : ''} completed
                      </p>
                    )}
                  </div>
                  {e.completed_at && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Completed" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Certificates */}
      <Section title="Certificates" icon={<Award className="w-4 h-4" />}>
        {(certificates ?? []).length === 0 ? (
          <Empty text="No certificates issued" />
        ) : (
          <div className="divide-y divide-slate-100">
            {(certificates ?? []).map(c => {
              const meta = courseMap[c.course_id]
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{meta?.icon ?? '🎓'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{meta?.title ?? c.course_id}</p>
                    <p className="text-xs text-slate-400">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={`/certificates/${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:underline shrink-0"
                  >
                    View →
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Badges */}
      {(badges ?? []).length > 0 && (
        <Section title="Badges" icon={<Star className="w-4 h-4" />}>
          <div className="flex flex-wrap gap-2 p-4">
            {(badges ?? []).map(b => (
              <span
                key={`${b.badge_type}-${b.earned_at}`}
                className="text-xs px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-medium capitalize"
              >
                {b.badge_type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'emerald' | 'amber' | 'purple' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  }
  return (
    <div className={`border rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-400">{text}</p>
}
