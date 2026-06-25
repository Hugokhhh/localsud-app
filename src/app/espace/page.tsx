import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS } from '@/lib/utils'
import Link from 'next/link'

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
        take: 1,
      },
    },
  })

  const project = client?.projects[0]
  if (!project) {
    return (
      <div>
        <h1 style={pageTitle}>Bonjour, <em>{client?.company || 'cher client'}</em></h1>
        <p style={pageSub}>Votre projet n'est pas encore configuré. Sofiane vous contactera prochainement.</p>
      </div>
    )
  }

  const billing = computeBilling(project.payments as any[])
  const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]

  return (
    <div>
      <h1 style={pageTitle}>Bonjour, <em>{client?.company}</em></h1>
      <p style={pageSub}>Suivez l'avancement de votre projet <b>{project.name}</b></p>

      {/* 3 cards de ressources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Link href={project.mockupUrl || '#'} target="_blank" rel="noopener noreferrer" style={resourceCard}>
          <div style={resourceIcon('#E8EDFA', 'var(--ink)')}><i className="fa-brands fa-figma"></i></div>
          <div style={{ flex: 1 }}>
            <div style={resourceLbl}>Visualiser</div>
            <div style={resourceTitle}>Maquette Figma</div>
            <div style={resourceMeta}>{project.mockupUrl ? 'Cliquez pour ouvrir →' : 'Bientôt disponible'}</div>
          </div>
        </Link>

        <Link href="/espace/projets" style={resourceCard}>
          <div style={resourceIcon('var(--red-soft)', 'var(--red)')}><i className="fa-regular fa-comments"></i></div>
          <div style={{ flex: 1 }}>
            <div style={resourceLbl}>Échanger</div>
            <div style={resourceTitle}>Commentaires & retours</div>
            <div style={resourceMeta}>{project.comments.length > 0 ? `${project.comments.length} retour${project.comments.length > 1 ? 's' : ''} en cours` : 'Tout est à jour'}</div>
          </div>
        </Link>

        <Link href={project.documentsUrl || '#'} target="_blank" rel="noopener noreferrer" style={resourceCard}>
          <div style={resourceIcon('var(--green-soft)', 'var(--green)')}><i className="fa-solid fa-folder-open"></i></div>
          <div style={{ flex: 1 }}>
            <div style={resourceLbl}>Consulter</div>
            <div style={resourceTitle}>Vos documents</div>
            <div style={resourceMeta}>{project.documentsUrl ? 'Cliquez pour ouvrir →' : 'Bientôt disponible'}</div>
          </div>
        </Link>
      </div>

      {/* 4 stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Stat label="Statut" value={statusMeta?.label || project.status} />
        <Stat label="Livraison estimée" value={formatDate(project.estimatedDelivery)} />
        <Stat label="Montant total" value={formatPrice(billing.total)} />
        <Stat label="Progression" value={`${billing.progress}%`} highlight="green" />
      </div>

      {/* Étapes projet */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
          Avancement
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 18 }}>Les étapes de votre projet</div>
        {project.steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < project.steps.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: s.completed ? 'var(--green)' : 'var(--bg)',
              color: s.completed ? 'white' : 'var(--ink-mute)',
              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
              border: s.completed ? 'none' : '1px solid var(--line)',
            }}>
              {s.completed ? <i className="fa-solid fa-check"></i> : i + 1}
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: s.completed ? 'var(--ink-soft)' : 'var(--ink)', textDecoration: s.completed ? 'line-through' : 'none' }}>
              {s.title}
            </div>
            {s.completedAt && (
              <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{formatDate(s.completedAt)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'yellow' }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
        color: highlight === 'green' ? 'var(--green)' : highlight === 'yellow' ? 'var(--yellow-deep)' : 'var(--ink)',
      }}>{value}</div>
    </div>
  )
}

const pageTitle: React.CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }
const pageSub: React.CSSProperties = { color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }
const resourceCard: React.CSSProperties = {
  background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 18,
  display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink)',
}
const resourceIcon = (bg: string, color: string): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: 12, background: bg, color,
  display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0,
})
const resourceLbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 2 }
const resourceTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 4 }
const resourceMeta: React.CSSProperties = { fontSize: 12, color: 'var(--ink-mute)' }
