import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/CommentThread'
import { formatDate, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjetClientDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      comments: {
        include: { attachments: true, parent: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) notFound()
  // Sécurité : le projet doit appartenir au client connecté
  if (project.client.userId !== user.id) redirect('/espace/projets')

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
      <Link href="/espace/projets" style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <i className="fa-solid fa-arrow-left"></i> Retour
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{project.name}</h1>
          <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 4 }}>
            {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]} · Statut : {statusMeta?.label}
            {project.estimatedDelivery && <> · Livraison {formatDate(project.estimatedDelivery)}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {project.mockupUrl && (
            <a href={project.mockupUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: '10px 18px', background: 'var(--yellow)', color: 'var(--ink)',
              borderRadius: 100, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            }}>
              <i className="fa-solid fa-image"></i> Voir la maquette
            </a>
          )}
          {project.documentsUrl && (
            <a href={project.documentsUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: '10px 18px', background: 'var(--ink)', color: 'var(--white)',
              borderRadius: 100, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            }}>
              <i className="fa-solid fa-folder-open"></i> Accéder au Drive
            </a>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
          Échanges
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Retours & commentaires</h2>
      </div>

      <CommentThread
        projectId={project.id}
        comments={commentsWithAuthor}
        currentUser={{ id: user.id, name: user.name, role: 'CLIENT' }}
        isAdmin={false}
      />
    </div>
  )
}
