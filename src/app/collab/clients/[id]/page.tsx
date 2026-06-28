import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectEditor } from '@/app/admin/clients/[id]/ProjectEditor'
import { ProjectTabs } from '@/app/admin/clients/[id]/ProjectTabs'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CollabClientDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { projectId?: string } }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'COLLABORATOR') redirect('/')

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, name: true } },
      projects: {
        select: { id: true, name: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!client || client.collaboratorId !== user.id) {
    redirect('/collab')
  }
  if (client.projects.length === 0) {
    return <div>Aucun projet associé à ce client.</div>
  }

  const activeProjectId = searchParams.projectId && client.projects.some(p => p.id === searchParams.projectId)
    ? searchParams.projectId
    : client.projects[0].id

  const project = await prisma.project.findUnique({
    where: { id: activeProjectId },
    include: { comments: { include: { attachments: true }, orderBy: { createdAt: 'desc' } } },
  })
  if (!project) notFound()

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

  return (
    <div>
      <Link href="/collab" style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <i className="fa-solid fa-arrow-left"></i> Retour à mes clients
      </Link>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{client.company}</h1>
        <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 4 }}>
          {client.trade || 'Client'} · {client.city || 'Lieu non précisé'} · {client.user.email}
        </div>
      </div>

      <ProjectTabs
        clientId={client.id}
        projects={client.projects.map(p => ({ id: p.id, name: p.name, status: p.status }))}
        activeId={activeProjectId}
      />

      <ProjectEditor
        client={{
          id: client.id, company: client.company,
          trade: client.trade, city: client.city,
          email: client.user.email,
        }}
        project={{
          id: project.id,
          name: project.name,
          type: project.type,
          status: project.status,
          mockupUrl: project.mockupUrl,
          documentsUrl: project.documentsUrl,
          totalPrice: Number(project.totalPrice),
          estimatedDelivery: project.estimatedDelivery?.toISOString().slice(0, 10) || '',
          payments: [],
        }}
        comments={commentsWithAuthor}
        currentUser={user}
      />
    </div>
  )
}
