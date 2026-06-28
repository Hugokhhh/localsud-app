import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CollabHomePage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'COLLABORATOR') redirect('/')

  const clients = await prisma.client.findMany({
    where: { collaboratorId: user.id },
    include: {
      user: { select: { email: true } },
      projects: {
        include: { comments: { where: { status: 'OPEN', parentId: null } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Bonjour <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>{user.name}</em>
        </h1>
        <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 6 }}>
          {clients.length === 0
            ? "Aucun client ne t'est assigné pour le moment. Hugo te les attribuera depuis l'admin."
            : `${clients.length} client${clients.length > 1 ? 's' : ''} sous ta responsabilité.`}
        </p>
      </div>

      {clients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {clients.map(client => {
            const openComments = client.projects.reduce((acc, p) => acc + p.comments.length, 0)
            return (
              <Link key={client.id} href={`/collab/clients/${client.id}`} style={{
                background: 'var(--white)', border: '1px solid var(--line)',
                borderRadius: 16, padding: 20, textDecoration: 'none', display: 'block',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>{client.trade || 'Client'}</span>
                  {openComments > 0 && (
                    <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {openComments} retour{openComments > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{client.company}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                  {client.projects.length} projet{client.projects.length > 1 ? 's' : ''} · {client.city || 'Lieu non précisé'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
