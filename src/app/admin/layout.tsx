import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/Sidebar'
import { initials } from '@/lib/utils'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'ADMIN') redirect('/espace')

  // Compteur global de retours OUVERTS (admin)
  const openCount = await prisma.comment.count({
    where: { status: 'OPEN', parentId: null },
  })

  return (
    <div className="app-shell">
      <Sidebar
        variant="admin"
        user={{
          name: user.name || 'Admin',
          subtitle: 'Administrateur',
          initials: initials(user.name || 'A'),
        }}
        items={[
          { href: '/admin', icon: 'fa-solid fa-grid-2', label: 'Tableau de bord' },
          { href: '/admin/clients', icon: 'fa-solid fa-users', label: 'Clients', badge: openCount },
        ]}
      />
      <main className="app-main">
        {children}
      </main>
    </div>
  )
}
