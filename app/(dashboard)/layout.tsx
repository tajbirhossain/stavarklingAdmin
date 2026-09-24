import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getCurrentSession } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">{children}</main>
    </div>
  )
}
