import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CollaboratorsManager } from './CollaboratorsManager'

export const dynamic = 'force-dynamic'

export default async function CollaboratorsPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'ADMIN') redirect('/')

  const collaborators = await prisma.user.findMany({
    where: { role: 'COLLABORATOR' },
    include: { _count: { select: { assignedClients: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 6 }}>Administration</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Collaborateurs</h1>
        <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 6 }}>
          Invitez des collaborateurs pour qu'ils gèrent les projets de certains clients (sans accès aux factures).
        </p>
      </div>
      <CollaboratorsManager
        initial={collaborators.map(c => ({
          id: c.id, name: c.name, email: c.email,
          clientCount: c._count.assignedClients,
        }))}
      />
    </div>
  )
}
