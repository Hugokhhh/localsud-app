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
          payments: project.payments.map(p => ({
            id: p.id,
            label: p.label,
            amount: Number(p.amount),
            status: p.status,
            dueDate: p.dueDate?.toISOString().slice(0, 10) || null,
            paidAt: p.paidAt?.toISOString() || null,
            invoiceRef: p.invoiceRef || null,
            pdfUrl: p.pdfUrl || null,
            pdfName: p.pdfName || null,
            pdfSize: p.pdfSize || null,
          })),
        }}
        comments={commentsWithAuthor}
        currentUser={user}
      />
    </div>
  )
}