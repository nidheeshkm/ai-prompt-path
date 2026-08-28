import { requireAdmin } from '@/server/admin-guard'
import AdminMarketingClient from './AdminMarketingClient'

export default async function AdminMarketingPage() {
  await requireAdmin()
  return <AdminMarketingClient />
}
