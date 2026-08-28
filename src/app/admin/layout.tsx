import { requireAdmin } from '@/server/admin-guard'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: 'Admin — PromptPath' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
