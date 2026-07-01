import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, timeAgo, PROJECT_STATUS, PROJECT_TYPE, externalUrl } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_ORDER = ['BRIEF', 'MAQUETTE', 'RETOURS', 'INTEGRATION', 'ONLINE'] as const

export default async function EspaceAccueilPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          payments: { orderBy: { order: 'asc' } },
          steps: { orderBy: { order: 'asc' } },
          comments: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const projects = client?.projects || []

  if (projects.length === 0) {
    return (
      <div>
        <h1 style={pageTitle}>Bonjour, <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>{client?.company || 'cher client'}</em></h1>
        <p style={pageSub}>Votre projet n'est pas encore configuré. Hugo vous contactera prochainement.</p>
      </div>
    )
  }

  // Prendre le projet principal (le plus récent actif)
  const mainProject = projects[0]

  // Récupérer les auteurs des commentaires
  const authorIds = [...new Set(mainProject.comments.map(c => c.authorId))]
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, role: true },
  })
  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]))

  const openCount = mainProject.comments.filter(c => c.status === 'OPEN' && !c.parentId).length
  const resolvedCount = mainProject.comments.filter(c => c.status === 'RESOLVED' && !c.parentId).length
  const totalComments = mainProject.comments.filter(c => !c.parentId).length

  const billing = computeBilling(mainProject.payments as any[])
  const currentStepIdx = STATUS_ORDER.indexOf(mainProject.status as any)
  const statusMeta = PROJECT_STATUS[mainProject.status as keyof typeof PROJECT_STATUS]

  // Activité récente
  const recentActivity = mainProject.comments
    .slice(0, 4)
    .map(c => ({
      ...c,
      author: authorMap[c.authorId] || { name: 'Utilisateur', role: 'CLIENT' },
    }))

  return (
    <div>
      <h1 style={pageTitle}>Bonjour, <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>{client?.company}</em></h1>
      <p style={pageSub}>Suivez l'avancement de votre site web LocalSud</p>

      {/* === VOS RESSOURCES (les 3 cards) === */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabel}>Vos ressources</div>
        <div style={sectionTitleStyle}>Tout ce qu'il vous faut, au même endroit</div>
        <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4, marginBottom: 16 }}>
          Mis à jour par votre chef de projet · Hugo Chey
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

          {/* Card Maquette */}
          <Link href={mainProject.mockupUrl ? externalUrl(mainProject.mockupUrl) : `/espace/projets/${mainProject.id}`}
            target={mainProject.mockupUrl ? '_blank' : undefined}
            rel="noopener noreferrer"
            style={resCardStyle}>
            <div style={{ ...resStatusStyle, background: 'var(--yellow-soft)', color: 'var(--yellow-deep)' }}>
              <i className="fa-solid fa-clock"></i>
              {mainProject.status === 'MAQUETTE' || mainProject.status === 'RETOURS' ? ' Retours en cours' : ` Étape ${statusMeta?.label}`}
            </div>
            <div style={{ ...resIconStyle, background: 'var(--blue-soft)', color: 'var(--ink)' }}>
              <i className="fa-solid fa-image"></i>
            </div>
            <div style={resSource}>{mainProject.mockupUrl ? 'Lien externe' : 'Non disponible'}</div>
            <div style={resTitle}>Maquette</div>
            <div style={resDesc}>La maquette interactive de votre site, ouverte aux commentaires.</div>
            <div style={resCta}>
              {mainProject.mockupUrl ? 'Ouvrir' : 'Bientôt disponible'}
              {mainProject.mockupUrl && <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: 6 }}></i>}
            </div>
          </Link>

          {/* Card Commentaires & retours */}
          <Link href={`/espace/projets/${mainProject.id}?tab=retours`} style={resCardStyle}>
            <div style={{ ...resStatusStyle, background: openCount > 0 ? 'var(--yellow-soft)' : 'var(--green-soft)', color: openCount > 0 ? 'var(--yellow-deep)' : 'var(--green)' }}>
              <i className={`fa-solid ${openCount > 0 ? 'fa-clock' : 'fa-check'}`}></i>
              {openCount > 0 ? ` ${openCount} à traiter` : ' À jour'}
            </div>
            <div style={{ ...resIconStyle, background: 'var(--yellow-soft)', color: 'var(--ink)' }}>
              <i className="fa-regular fa-comments"></i>
            </div>
            <div style={resSource}>Espace dédié</div>
            <div style={resTitle}>Commentaires & retours</div>
            <div style={resDesc}>Posez vos questions, demandez des modifications et signalez vos axes d'amélioration.</div>
            <div style={resCta}>Ouvrir <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }}></i></div>
          </Link>

          {/* Card Documents / Drive */}
          <Link href={mainProject.documentsUrl ? externalUrl(mainProject.documentsUrl) : `/espace/projets/${mainProject.id}`}
            target={mainProject.documentsUrl ? '_blank' : undefined}
            rel="noopener noreferrer"
            style={resCardStyle}>
            <div style={{ ...resStatusStyle, background: 'var(--bg)', color: 'var(--ink-soft)' }}>
              <i className="fa-solid fa-folder"></i>
              {mainProject.documentsUrl ? ' Drive partagé' : ' Non disponible'}
            </div>
            <div style={{ ...resIconStyle, background: 'var(--bg)', color: 'var(--ink)' }}>
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <div style={resSource}>Drive</div>
            <div style={resTitle}>Vos documents</div>
            <div style={resDesc}>Logo, photos et PDF liés à votre projet.</div>
            <div style={resCta}>
              {mainProject.documentsUrl ? 'Ouvrir' : 'Bientôt disponible'}
              {mainProject.documentsUrl && <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: 6 }}></i>}
            </div>
          </Link>

        </div>
      </div>

      {/* === STATS === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatBox label="Projet en cours" value={PROJECT_TYPE[mainProject.type as keyof typeof PROJECT_TYPE] || 'Projet'} sub={`Démarré le ${formatDate(mainProject.createdAt)}`} />
        <StatBox label="Avancement" value={`${billing.progress}%`} sub={`${formatPrice(billing.paid)} payé sur ${formatPrice(billing.total)}`} progress={billing.progress} />
        <StatBox label="Livraison estimée" value={mainProject.estimatedDelivery ? formatDate(mainProject.estimatedDelivery) : 'À définir'} sub={statusMeta?.label || ''} />
        <StatBox label="Retours à traiter" value={`${openCount} / ${totalComments}`} sub={`${resolvedCount} résolu${resolvedCount > 1 ? 's' : ''}`} />
      </div>

      {/* === ACTIVITÉ + ÉTAPES === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* Activité récente */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={cardTitle}>Activité récente</div>
            <Link href={`/espace/projets/${mainProject.id}?tab=retours`} style={{ fontSize: 12, color: 'var(--ink-mute)', textDecoration: 'none' }}>
              Tout voir
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-mute)', padding: '8px 0' }}>Aucun échange pour le moment.</div>
          ) : recentActivity.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: a.author?.role === 'ADMIN' ? 'var(--ink)' : 'var(--yellow)',
                color: a.author?.role === 'ADMIN' ? 'var(--yellow)' : 'var(--ink)',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11,
              }}>
                {a.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                  {a.author?.role === 'ADMIN' ? 'Hugo (LocalSud)' : a.author?.name}
                  <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 400, marginLeft: 6 }}>· {timeAgo(a.createdAt)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📍 {a.section} · {a.content.slice(0, 60)}{a.content.length > 60 ? '…' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Étapes du projet */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={cardTitle}>Étapes du projet</div>
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{STATUS_ORDER.length} étapes</span>
          </div>
          {STATUS_ORDER.map((s, idx) => {
            const isDone = idx < currentStepIdx
            const isCurrent = idx === currentStepIdx
            const meta = PROJECT_STATUS[s as keyof typeof PROJECT_STATUS]
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: idx > 0 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                  background: isDone ? 'var(--green)' : isCurrent ? 'var(--yellow)' : 'var(--bg)',
                  color: isDone ? 'white' : isCurrent ? 'var(--ink)' : 'var(--ink-mute)',
                  border: isDone || isCurrent ? 'none' : '2px solid var(--line)',
                }}>
                  {isDone ? <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i> : idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--ink)' : isDone ? 'var(--ink-soft)' : 'var(--ink-mute)' }}>
                  {meta?.label}
                </div>
                {isDone && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>Validé</span>}
                {isCurrent && <span style={{ fontSize: 11, color: 'var(--yellow-deep)', fontWeight: 700 }}>En cours</span>}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

function StatBox({ label, value, sub, progress }: { label: string; value: string; sub: string; progress?: number }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      {progress !== undefined && (
        <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--yellow)', borderRadius: 4 }} />
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{sub}</div>
    </div>
  )
}

const pageTitle: React.CSSProperties = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: 'var(--ink)' }
const pageSub: React.CSSProperties = { color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }
const sectionLabel: React.CSSProperties = { fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }
const sectionTitleStyle: React.CSSProperties = { fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }
const resCardStyle: React.CSSProperties = {
  background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14,
  padding: 18, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6,
  cursor: 'pointer', transition: 'border-color 0.15s',
}
const resStatusStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }
const resIconStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, marginTop: 4 }
const resSource: React.CSSProperties = { fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.05em' }
const resTitle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: 'var(--ink)' }
const resDesc: React.CSSProperties = { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, flex: 1 }
const resCta: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginTop: 4, display: 'flex', alignItems: 'center' }
const cardStyle: React.CSSProperties = { background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }
const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--ink)' }
