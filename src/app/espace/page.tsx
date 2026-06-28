import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EspaceAccueilPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          payments: true,
          steps: { orderBy: { order: 'asc' } },
          comments: { where: { status: 'OPEN', parentId: null } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const projects = client?.projects || []
  if (projects.length === 0) {
    return (
      <div>
        <h1 style={pageTitle}>Bonjour, <em>{client?.company || 'cher client'}</em></h1>
        <p style={pageSub}>Votre projet n'est pas encore configuré. Hugo vous contactera prochainement.</p>
      </div>
    )
  }

  // Calcul agrégé sur tous les projets
  const totalBilling = projects.reduce((acc, p) => {
    const b = computeBilling(p.payments as any[])
    return { total: acc.total + b.total, paid: acc.paid + b.paid, remaining: acc.remaining + b.remaining }
  }, { total: 0, paid: 0, remaining: 0 })

  const totalOpenComments = projects.reduce((acc, p) => acc + p.comments.length, 0)

  return (
    <div>
      <h1 style={pageTitle}>Bonjour, <em>{client?.company}</em></h1>
      <p style={pageSub}>
        {projects.length === 1
          ? <>Suivez l'avancement de votre projet <b>{projects[0].name}</b></>
          : <>Vous avez <b>{projects.length} projets</b> en cours</>
        }
      </p>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Projets" value={String(projects.length)} icon="fa-folder-open" color="var(--ink)" />
        <StatCard label="Retours ouverts" value={String(totalOpenComments)} icon="fa-comments" color="var(--red)" />
        <StatCard label="Déjà payé" value={formatPrice(totalBilling.paid)} icon="fa-check" color="var(--green)" />
        <StatCard label="Reste à régler" value={formatPrice(totalBilling.remaining)} icon="fa-hourglass" color="var(--yellow-deep)" />
      </div>

      {/* Liste des projets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
          Mes projets
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {projects.length === 1 ? 'Votre projet' : 'Tous vos projets'}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {projects.map(project => {
          const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]
          const billing = computeBilling(project.payments as any[])
          const openComments = project.comments.length
          return (
            <Link key={project.id} href={`/espace/projets/${project.id}`} style={projectCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--ink-mute)', fontWeight: 700,
                }}>{PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]}</span>
                {openComments > 0 && (
                  <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {openComments} retour{openComments > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{project.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 16 }}>
                Statut : <b style={{ color: 'var(--ink)' }}>{statusMeta?.label}</b>
                {project.estimatedDelivery && <> · Livraison {formatDate(project.estimatedDelivery)}</>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{billing.progress}% payé</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{formatPrice(billing.total)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const pageTitle: React.CSSProperties = {
  fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)',
}
const pageSub: React.CSSProperties = {
  color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28, marginTop: 6,
}
const projectCardStyle: React.CSSProperties = {
  background: 'var(--white)', border: '1px solid var(--line)',
  borderRadius: 16, padding: 20, textDecoration: 'none',
  transition: 'all 0.15s ease', cursor: 'pointer',
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--line)',
      borderRadius: 16, padding: 18,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--line-soft)', color, display: 'grid', placeItems: 'center', fontSize: 16 }}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </div>
  )
}
