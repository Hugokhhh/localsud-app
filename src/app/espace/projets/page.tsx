import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjetsClientPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          comments: { where: { status: 'OPEN', parentId: null } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const projects = client?.projects || []
  if (projects.length === 0) {
    return <div>Aucun projet en cours.</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>projets</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Cliquez sur un projet pour voir ses détails et échanges.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {projects.map(project => {
          const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]
          const openComments = project.comments.length
          return (
            <Link key={project.id} href={`/espace/projets/${project.id}`} style={{
              background: 'var(--white)', border: '1px solid var(--line)',
              borderRadius: 16, padding: 20, textDecoration: 'none', display: 'block',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>
                  {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]}
                </span>
                {openComments > 0 && (
                  <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {openComments} retour{openComments > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{project.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                <i className="fa-solid fa-circle" style={{ fontSize: 6, color: statusMeta?.color || 'var(--ink-mute)', marginRight: 6, verticalAlign: 'middle' }}></i>
                {statusMeta?.label}
                {project.estimatedDelivery && <> · Livraison {formatDate(project.estimatedDelivery)}</>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
