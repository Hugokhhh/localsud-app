import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS, PROJECT_TYPE, timeAgo } from '@/lib/utils'
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
          comments: {
            include: { author: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
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

  const totalBilling = projects.reduce((acc, p) => {
    const b = computeBilling(p.payments as any[])
    return { total: acc.total + b.total, paid: acc.paid + b.paid, remaining: acc.remaining + b.remaining }
  }, { total: 0, paid: 0, remaining: 0 })

  const totalOpenComments = projects.reduce(
    (acc, p) => acc + p.comments.filter(c => c.status === 'OPEN' && !c.parentId).length,
    0
  )

  // Prochaine échéance à payer (tous projets confondus)
  const upcomingPayment = projects
    .flatMap(p => p.payments.map(pay => ({ ...pay, projectName: p.name })))
    .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
    .sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })[0]

  // Activité récente (5 derniers commentaires tous projets confondus)
  const recentActivity = projects
    .flatMap(p => p.comments.map(c => ({ ...c, projectName: p.name, projectId: p.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  return (
    <div>
      <h1 style={pageTitle}>Bonjour, <em>{client?.company}</em></h1>
      <p style={pageSub}>
        {projects.length === 1
          ? <>Suivez l'avancement de votre projet <b>{projects[0].name}</b></>
          : <>Vous avez <b>{projects.length} projets</b> en cours</>
        }
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Projets" value={String(projects.length)} icon="fa-folder-open" color="var(--ink)" />
        <StatCard label="Retours ouverts" value={String(totalOpenComments)} icon="fa-comments" color="var(--red)" />
        <StatCard label="Déjà payé" value={formatPrice(totalBilling.paid)} icon="fa-check" color="var(--green)" />
        <StatCard label="Reste à régler" value={formatPrice(totalBilling.remaining)} icon="fa-hourglass" color="var(--yellow-deep)" />
      </div>

      {/* Prochaine échéance */}
      {upcomingPayment && (
        <div style={{
          background: upcomingPayment.status === 'OVERDUE' ? '#FEE9E7' : '#FFF7D6',
          border: `1px solid ${upcomingPayment.status === 'OVERDUE' ? 'var(--red)' : 'var(--yellow)'}`,
          borderRadius: 14, padding: 18, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: upcomingPayment.status === 'OVERDUE' ? 'var(--red)' : 'var(--yellow-deep)',
            color: 'white', display: 'grid', placeItems: 'center', fontSize: 18,
          }}>
            <i className={`fa-solid ${upcomingPayment.status === 'OVERDUE' ? 'fa-circle-exclamation' : 'fa-hourglass-half'}`}></i>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--ink-mute)', marginBottom: 2 }}>
              {upcomingPayment.status === 'OVERDUE' ? 'Paiement en retard' : 'Prochaine échéance'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              {upcomingPayment.label} · {upcomingPayment.projectName}
            </div>
            {upcomingPayment.dueDate && (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                À régler avant le {formatDate(upcomingPayment.dueDate)}
              </div>
            )}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            {formatPrice(Number(upcomingPayment.amount))}
          </div>
          <Link href="/espace/factures" style={{
            padding: '10px 18px', background: 'var(--ink)', color: 'white',
            borderRadius: 100, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Voir les factures <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      )}

      {/* Section projets */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionKicker}>Mes projets</div>
        <h2 style={sectionTitle}>{projects.length === 1 ? 'Votre projet' : 'Tous vos projets'}</h2>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 32 }}>
        {projects.map(project => {
          const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]
          const billing = computeBilling(project.payments as any[])
          const openComments = project.comments.filter(c => c.status === 'OPEN' && !c.parentId).length
          const currentStepIdx = STATUS_ORDER.indexOf(project.status as any)

          return (
            <Link key={project.id} href={`/espace/projets/${project.id}`} style={projectCardStyle}>
              {/* Ligne 1 : type + statut + retours */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>
                    {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 100,
                    background: statusColor(statusMeta?.color, 'bg'),
                    color: statusColor(statusMeta?.color, 'text'),
                    fontWeight: 700,
                  }}>
                    {statusMeta?.label}
                  </span>
                </div>
                {openComments > 0 && (
                  <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 700 }}>
                    {openComments} retour{openComments > 1 ? 's' : ''} à traiter
                  </span>
                )}
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 14 }}>
                {project.name}
              </div>

              {/* Timeline visuelle */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {STATUS_ORDER.map((s, idx) => {
                  const isDone = idx < currentStepIdx
                  const isCurrent = idx === currentStepIdx
                  return (
                    <div key={s} style={{ flex: 1 }}>
                      <div style={{
                        height: 4, borderRadius: 4,
                        background: isDone || isCurrent ? 'var(--yellow)' : 'var(--line)',
                        marginBottom: 4,
                      }} />
                      <div style={{
                        fontSize: 10, textAlign: 'center',
                        color: isCurrent ? 'var(--ink)' : isDone ? 'var(--ink-soft)' : 'var(--ink-mute)',
                        fontWeight: isCurrent ? 700 : 500,
                      }}>
                        {PROJECT_STATUS[s as keyof typeof PROJECT_STATUS]?.label}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Ligne 3 : actions rapides + prix */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {project.mockupUrl && (
                    <span style={quickBadge}>
                      <i className="fa-solid fa-image" style={{ color: 'var(--yellow-deep)' }}></i> Maquette
                    </span>
                  )}
                  {project.documentsUrl && (
                    <span style={quickBadge}>
                      <i className="fa-solid fa-folder-open" style={{ color: 'var(--ink)' }}></i> Drive
                    </span>
                  )}
                  {project.estimatedDelivery && (
                    <span style={quickBadge}>
                      <i className="fa-solid fa-calendar" style={{ color: 'var(--ink-mute)' }}></i> Livraison {formatDate(project.estimatedDelivery)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      {billing.progress}% payé
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                      {formatPrice(billing.total)}
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-right" style={{ color: 'var(--ink-mute)' }}></i>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Activité récente */}
      {recentActivity.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={sectionKicker}>Activité récente</div>
            <h2 style={sectionTitle}>Derniers échanges</h2>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            {recentActivity.map((activity, idx) => (
              <Link
                key={activity.id}
                href={`/espace/projets/${activity.projectId}`}
                style={{
                  display: 'flex', gap: 14, padding: '14px 18px',
                  borderTop: idx > 0 ? '1px solid var(--line-soft)' : 'none',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: activity.author?.role === 'ADMIN' ? 'var(--ink)' : 'var(--yellow)',
                  color: activity.author?.role === 'ADMIN' ? 'var(--yellow)' : 'var(--ink)',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {activity.author?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      {activity.author?.role === 'ADMIN' ? 'Hugo (LocalSud)' : activity.author?.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>· {activity.projectName}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>· {timeAgo(activity.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {activity.content}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 18,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: 'var(--bg)', color,
        display: 'grid', placeItems: 'center', fontSize: 18,
      }}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>{value}</div>
      </div>
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

const pageTitle: React.CSSProperties = {
  fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: 'var(--ink)',
}
const pageSub: React.CSSProperties = { color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }
const sectionKicker: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)',
}
const projectCardStyle: React.CSSProperties = {
  background: 'var(--white)', border: '1px solid var(--line)',
  borderRadius: 16, padding: 20, textDecoration: 'none', display: 'block',
}
const quickBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 10px', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 100, fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)',
}
