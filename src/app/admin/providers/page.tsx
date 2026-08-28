import { requireAdmin } from '@/server/admin-guard'
import { PROVIDER_CONFIG, PROVIDERS } from '@/lib/providers'
import AdminProvidersClient from './AdminProvidersClient'

export default async function AdminProvidersPage() {
  const { admin } = await requireAdmin()

  const [{ data: setting }, { data: keyCounts }] = await Promise.all([
    admin.from('global_settings').select('value').eq('key', 'allowed_providers').single(),
    admin.from('provider_keys').select('provider'),
  ])

  const allowed: string[] = setting?.value ?? PROVIDERS

  const userCountMap: Record<string, number> = {}
  for (const r of keyCounts ?? []) {
    userCountMap[r.provider] = (userCountMap[r.provider] ?? 0) + 1
  }

  const providers = PROVIDERS.map(id => ({
    id,
    ...PROVIDER_CONFIG[id],
    enabled: allowed.includes(id),
    userCount: userCountMap[id] ?? 0,
  }))

  return <AdminProvidersClient providers={providers} />
}
