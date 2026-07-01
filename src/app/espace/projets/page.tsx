import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS, PROJECT_TYPE, externalUrl } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MesProjetsPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          payments: { orderBy: { order: 'asc' } },
          comments: { where: { parentId: null } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const projects = client?.projects || []

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: 'var(--ink)' }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>projets</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Votre site actuel et vos projets précédents
      </p>

      {projects.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px dashed var(--line)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 14 }}>
          Aucun projet pour le moment. Hugo configurera bientôt votre espace.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {projects.map(project => {
            const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]
            const billing = computeBilling(project.payments as any[])
            const openCount = project.comments.filter(c => c.status === 'OPEN').length
            const isDelivered = project.status === 'ONLINE'
            const initials = project.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <div key={project.id} style={{
                background: 'var(--white)', border: '1px solid var(--line)',
                borderRadius: 16, padding: 20,
              }}>
                {/* Header cliquable vers le détail */}
                <Link href={`/espace/projets/${project.id}`} style={{
                  display: 'flex', gap: 18, alignItems: 'center', textDecoration: 'none',
                  marginBottom: 16,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                    background: isDelivered ? 'var(--green-soft)' : 'var(--yellow)',
                    color: isDelivered ? 'var(--green)' : 'var(--ink)',
                    display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16,
                  }}>
                    {isDelivered ? <i className="fa-solid fa-check"></i> : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>
                        {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: statusColor(statusMeta?.color, 'bg'),
                        color: statusColor(statusMeta?.color, 'text'),
                      }}>
                        {statusMeta?.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                      Démarré le {formatDate(project.createdAt)}
                      {project.estimatedDelivery && !isDelivered && <> · Livraison estimée {formatDate(project.estimatedDelivery)}</>}
                      {' · '}{billing.progress}% payé
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right" style={{ color: 'var(--ink-mute)', flexShrink: 0 }}></i>
                </Link>

                {/* Actions directes : Maquette + Retours (+ Drive si dispo) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>

                  {/* MAQUETTE */}
                  {project.mockupUrl ? (
                    <a href={externalUrl(project.mockupUrl)} target="_blank" rel="noopener noreferrer" style={actionBtn('var(--blue-soft)', 'var(--ink)')}>
                      <div style={actionIcon('var(--blue-soft)', 'var(--ink)')}>
                        <i className="fa-solid fa-image"></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={actionTitle}>Maquette</div>
                        <div style={actionSub}>Voir le design</div>
                      </div>
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11, color: 'var(--ink-mute)' }}></i>
                    </a>
                  ) : (
                    <div style={{ ...actionBtn('var(--bg)', 'var(--ink-mute)'), cursor: 'default', opacity: 0.7 }}>
                      <div style={actionIcon('var(--bg)', 'var(--ink-mute)')}>
                        <i className="fa-solid fa-image"></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={actionTitle}>Maquette</div>
                        <div style={actionSub}>Bientôt</div>
                      </div>
                    </div>
                  )}

                  {/* RETOURS */}
                  <Link href={`/espace/projets/${project.id}?tab=retours`} style={actionBtn('var(--yellow-soft)', 'var(--ink)')}>
                    <div style={actionIcon('var(--yellow-soft)', 'var(--ink)')}>
                      <i className="fa-regular fa-comments"></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={actionTitle}>Retours</div>
                      <div style={actionSub}>
                        {openCount > 0 ? `${openCount} à traiter` : 'Écrire un retour'}
                      </div>
                    </div>
                    {openCount > 0 && (
                      <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                        {openCount}
                      </span>
                    )}
                  </Link>

                  {/* DRIVE (si dispo) */}
                  {project.documentsUrl && (
                    <a href={externalUrl(project.documentsUrl)} target="_blank" rel="noopener noreferrer" style={actionBtn('var(--bg)', 'var(--ink)')}>
                      <div style={actionIcon('var(--bg)', 'var(--ink)')}>
                        <i className="fa-solid fa-folder-open"></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={actionTitle}>Documents</div>
                        <div style={actionSub}>Drive partagé</div>
                      </div>
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11, color: 'var(--ink-mute)' }}></i>
                    </a>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusColor(color: string | undefined, mode: 'bg' | 'text') {
  const map: Record<string, { bg: string; text: string }> = {
    gray:   { bg: '#EEF0F6', text: '#4A5680' },
    yellow: { bg: '#FFF7D6', text: '#7A6300' },
    red:    { bg: '#FEE9E7', text: '#B12A1A' },
    blue:   { bg: '#E4EAFC', text: '#1E3A8A' },
    green:  { bg: '#DDF4E4', text: '#136B36' },
  }
  return (map[color || 'gray'] || map.gray)[mode]
}

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', background: 'var(--white)',
    border: '1px solid var(--line)', borderRadius: 12,
    textDecoration: 'none', color: 'var(--ink)',
  }
}
function actionIcon(bg: string, color: string): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: bg, color, display: 'grid', placeItems: 'center', fontSize: 15,
  }
}
const actionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--ink)' }
const actionSub: React.CSSProperties = { fontSize: 11, color: 'var(--ink-mute)' }
