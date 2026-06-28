import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { initials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CollabLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'COLLABORATOR') {
    if (user.role === 'ADMIN') redirect('/admin')
    redirect('/espace')
  }

  return (
    <div className="app-shell">
      <Sidebar
        variant="collaborator"
        user={{
          name: user.name || 'Collaborateur',
          subtitle: 'Collaborateur',
          initials: initials(user.name || 'C'),
        }}
        items={[{ href: '/collab', icon: 'fa-solid fa-grid-2', label: 'Mes clients' }]}
      />
      <main className="app-main">{children}</main>
    </div>
  )
}
