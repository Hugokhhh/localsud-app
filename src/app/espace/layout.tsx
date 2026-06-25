import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/Sidebar'
import { initials } from '@/lib/utils'

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role === 'ADMIN') redirect('/admin')

  // Récupérer le client + projets pour le compteur de retours
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          comments: { where: { status: 'OPEN', parentId: null } },
        },
      },
    },
  })

  const openComments = client?.projects.reduce((acc, p) => acc + p.comments.length, 0) || 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        variant="client"
        user={{
          name: user.name || 'Client',
          subtitle: client?.city || undefined,
          initials: initials(user.name || 'C'),
        }}
        items={[
          { href: '/espace', icon: 'fa-solid fa-house', label: 'Accueil' },
          { href: '/espace/projets', icon: 'fa-solid fa-folder-open', label: 'Mes projets', badge: openComments },
          { href: '/espace/factures', icon: 'fa-solid fa-file-invoice', label: 'Mes factures' },
        ]}
      />
      <main style={{ flex: 1, padding: '28px 36px', maxWidth: 1200 }}>
        {children}
      </main>
    </div>
  )
}
