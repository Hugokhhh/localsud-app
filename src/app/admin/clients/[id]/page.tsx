import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectEditor } from './ProjectEditor'

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, name: true } },
      projects: {
        include: {
          payments: { orderBy: { order: 'asc' } },
          comments: {
            include: { attachments: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!client) notFound()
  const project = client.projects[0]
  if (!project) {
    return (
      <div>
        <h1>Aucun projet associé à ce client.</h1>
      </div>
    )
  }

  // Auteurs des commentaires
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
  }))

  return (
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
        estimatedDelivery: project.estimatedDelivery?.toISOString() || null,
        payments: project.payments.map(p => ({
          id: p.id,
          label: p.label,
          amount: Number(p.amount),
          status: p.status,
          dueDate: p.dueDate?.toISOString() || null,
          paidAt: p.paidAt?.toISOString() || null,
          invoiceRef: p.invoiceRef,
          pdfUrl: p.pdfUrl,
          pdfName: p.pdfName,
          pdfSize: p.pdfSize,
        })),
      }}
      comments={commentsWithAuthor as any}
      currentUser={user}
    />
  )
}
