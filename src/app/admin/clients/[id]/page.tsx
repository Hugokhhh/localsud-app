import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectEditor } from './ProjectEditor'
import { ProjectTabs } from './ProjectTabs'
import { ClientActions } from './ClientActions'

export const dynamic = 'force-dynamic'

export default async function AdminClientDetailPage({
  params, searchParams,
}: {
  params: { id: string }
  searchParams: { projectId?: string }
}) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

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

  if (!client) notFound()
  if (client.projects.length === 0) {
    return (
      <div>
        <h1>Aucun projet associé à ce client.</h1>
      </div>
    )
  }

  // Projet actif : depuis ?projectId=xxx, sinon le plus récent
  const activeProjectId = searchParams.projectId && client.projects.some(p => p.id === searchParams.projectId)
    ? searchParams.projectId
    : client.projects[0].id

  // Chargement détaillé du projet actif uniquement
  const project = await prisma.project.findUnique({
    where: { id: activeProjectId },
    include: {
      payments: { orderBy: { order: 'asc' } },
      comments: {
        include: { attachments: true },
        orderBy: { createdAt: 'desc' },
      },
    },
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
      <ClientActions
        client={{
          id: client.id,
          company: client.company,
          email: client.user.email,
          trade: client.trade,
          city: client.city,
          phone: client.phone,
        }}
      />

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
        }}
        payments={project.payments.map(p => ({
          id: p.id, label: p.label, amount: Number(p.amount),
          dueDate: p.dueDate?.toISOString().slice(0, 10) || '',
          status: p.status, order: p.order, paidAt: p.paidAt?.toISOString() || null,
          invoiceUrl: p.invoiceUrl || null,
        }))}
        comments={commentsWithAuthor}
      />
    </div>
  )
}
