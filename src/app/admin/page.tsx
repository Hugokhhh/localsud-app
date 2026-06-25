import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatPrice, formatDate, computeBilling, PROJECT_STATUS } from '@/lib/utils'
import Link from 'next/link'
import { NewClientButton } from './NewClientButton'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const clients = await prisma.client.findMany({
    include: {
      user: { select: { email: true } },
      projects: {
        include: {
          payments: true,
          comments: { where: { status: 'OPEN', parentId: null } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Stats globales
  let totalRevenue = 0, totalPaid = 0, totalOpenComments = 0
  clients.forEach(c => c.projects.forEach(p => {
    const b = computeBilling(p.payments as any[])
    totalRevenue += b.total
    totalPaid += b.paid
    totalOpenComments += p.comments.length
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Salut <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>{user.name?.split(' ')[0] || 'admin'}</em>, {clients.length} projet{clients.length > 1 ? 's' : ''} actif{clients.length > 1 ? 's' : ''}
          </h1>
          <p style={{ color: 'var(--ink-mute)', fontSize: 14 }}>Vue d'ensemble de votre activité</p>
        </div>
        <NewClientButton />
      </div>

      {/* 4 stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Clients actifs" value={String(clients.length)} sub={`${clients.length} compte${clients.length > 1 ? 's' : ''} créé${clients.length > 1 ? 's' : ''}`} />
        <StatCard label="Retours à traiter" value={String(totalOpenComments)} sub={totalOpenComments > 0 ? 'En attente' : 'Tout est traité ✨'} valueColor={totalOpenComments > 0 ? 'var(--red)' : 'var(--green)'} />
        <StatCard label="CA encaissé" value={formatPrice(totalPaid)} sub={`Sur ${formatPrice(totalRevenue)} contractualisés`} dark />
        <StatCard label="Reste à encaisser" value={formatPrice(totalRevenue - totalPaid)} sub="Factures en attente" dark valueColor="var(--yellow)" />
      </div>

      {/* Liste clients */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Vos clients</div>
          <Link href="/admin/clients" style={{
            fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600,
          }}>Tout voir →</Link>
        </div>

        {clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-mute)' }}>
            Aucun client pour le moment. Clique sur "Nouveau client" pour démarrer.
          </div>
        )}

        {clients.map(c => {
          const project = c.projects[0]
          const billing = project ? computeBilling(project.payments as any[]) : { total: 0, paid: 0, progress: 0 }
          const statusMeta = project ? PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] : null
          return (
            <Link key={c.id} href={`/admin/clients/${c.id}`} style={{
              display: 'grid', gridTemplateColumns: '44px 1.4fr 1fr 120px 60px 80px 20px',
              gap: 16, alignItems: 'center', padding: '14px 12px',
              borderRadius: 10, color: 'var(--ink)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--yellow)', color: 'var(--ink)',
                display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13,
              }}>
                {c.company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.company}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                  {[c.trade, c.city].filter(Boolean).join(' · ') || c.user.email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  <b>{formatPrice(billing.paid)}</b> / {formatPrice(billing.total)}
                </div>
                <div style={{ height: 4, background: 'var(--bg)', borderRadius: 100, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${billing.progress}%`, height: '100%', background: 'var(--green)' }} />
                </div>
              </div>
              {statusMeta && (
                <span style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                  background: statusBg(statusMeta.color),
                  color: statusFg(statusMeta.color),
                  textAlign: 'center',
                }}>{statusMeta.label}</span>
              )}
              {project && project.comments.length > 0 ? (
                <span style={{
                  background: 'var(--red)', color: 'white',
                  padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                  textAlign: 'center',
                }}>{project.comments.length}</span>
              ) : <span style={{ fontSize: 12, color: 'var(--ink-mute)', textAlign: 'center' }}>À jour</span>}
              <div style={{ fontSize: 12, fontWeight: 600 }}>{project?.estimatedDelivery ? formatDate(project.estimatedDelivery) : '—'}</div>
              <div style={{ color: 'var(--ink-mute)' }}><i className="fa-solid fa-chevron-right"></i></div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, valueColor, dark }: { label: string; value: string; sub?: string; valueColor?: string; dark?: boolean }) {
  return (
    <div style={{
      background: dark ? 'var(--ink)' : 'white', color: dark ? 'white' : 'var(--ink)',
      border: dark ? 'none' : '1px solid var(--line)', borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: dark ? 'var(--yellow)' : 'var(--ink-mute)', fontWeight: 700, marginBottom: 8,
      }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: valueColor || 'inherit' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : 'var(--ink-mute)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function statusBg(color: string) {
  const map: Record<string, string> = {
    gray: 'var(--bg)', yellow: 'var(--yellow-soft)', red: 'var(--red-soft)',
    blue: 'var(--blue-soft)', green: 'var(--green-soft)',
  }
  return map[color] || 'var(--bg)'
}
function statusFg(color: string) {
  const map: Record<string, string> = {
    gray: 'var(--ink-mute)', yellow: 'var(--yellow-deep)', red: 'var(--red)',
    blue: 'var(--ink)', green: 'var(--green)',
  }
  return map[color] || 'var(--ink-mute)'
}
