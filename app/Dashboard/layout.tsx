import { getOrCreateTenant } from '@/Backend/get-tenant'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getOrCreateTenant()
  return <>{children}</>
}
