'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Users, BookOpen, Cpu, Award, ChevronRight, LifeBuoy, BookPlus, Megaphone, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/admin',                  label: 'Analytics',       icon: BarChart2  },
  { href: '/admin/users',            label: 'Users',           icon: Users      },
  { href: '/admin/courses',          label: 'Courses',         icon: BookOpen   },
  { href: '/admin/course-requests',  label: 'Course Requests', icon: BookPlus   },
  { href: '/admin/providers',        label: 'AI Providers',    icon: Cpu        },
  { href: '/admin/certificates',     label: 'Certificates',    icon: Award      },
  { href: '/admin/tickets',          label: 'Tickets',         icon: LifeBuoy   },
  { href: '/admin/feedback',         label: 'Feedback',        icon: MessageSquare },
  { href: '/admin/marketing',        label: 'Marketing',       icon: Megaphone  },
]

const BADGE_ROUTES = ['/admin/tickets', '/admin/course-requests', '/admin/feedback']

export default function AdminSidebar() {
  const pathname = usePathname()
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/tickets/pending-count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/admin/course-requests/pending-count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/admin/feedback/pending-count').then(r => r.json()).catch(() => ({ count: 0 })),
    ]).then(([tickets, courseReqs, feedback]) => {
      setBadges({
        '/admin/tickets':         tickets.count ?? 0,
        '/admin/course-requests': courseReqs.count ?? 0,
        '/admin/feedback':        feedback.count ?? 0,
      })
    })
  }, [pathname])

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col py-6 px-3 gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Admin</p>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        const badgeCount = BADGE_ROUTES.includes(href) ? (badges[href] ?? 0) : 0
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-amber-50 text-amber-700'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
            {badgeCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            {active && badgeCount === 0 && <ChevronRight className="w-3 h-3 ml-auto text-amber-500" />}
          </Link>
        )
      })}
    </aside>
  )
}
