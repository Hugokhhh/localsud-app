import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/CommentThread'
import { formatDate, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'

export default async function ProjetsClientPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          comments: {
            include: {
              attachments: true,
              parent: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const project = client?.projects[0]
  if (!project) {
    return <div>Aucun projet en cours.</div>
  }

  // Récupérer les auteurs des commentaires en bulk
  const authorIds = [...new Set(project.comments.map(c => c.authorId))]
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, role: true },
  })
  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]))

  const commentsWithAuthor = project.comments.map(c => ({
    ...c,
    author: authorMap[c.authorId] || { name: 'Utilisateur', role: 'CLIENT' },
    createdAt: c.createdAt.toISOString(),
  })) as any

  const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>projets</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Votre projet en cours et vos échanges
      </p>

      {/* Bandeau projet */}
      <div style={{
        background: 'var(--ink)', color: 'white', borderRadius: 16,
        padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, background: 'var(--yellow)',
          color: 'var(--ink)', display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: 22,
        }}>
          <i className="fa-solid fa-globe"></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{project.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]} · Statut : {statusMeta?.label} · Livraison {formatDate(project.estimatedDelivery)}
          </div>
        </div>
        {project.mockupUrl && (
          <a href={project.mockupUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: '10px 18px', background: 'var(--yellow)', color: 'var(--ink)',
            borderRadius: 100, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fa-brands fa-figma"></i> Voir la maquette
          </a>
        )}
      </div>

      {/* Section retours */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
          Échanges
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Retours & commentaires</h2>
      </div>

      <CommentThread
        projectId={project.id}
        comments={commentsWithAuthor}
        currentUser={user}
        isAdmin={false}
      />
    </div>
  )
}
