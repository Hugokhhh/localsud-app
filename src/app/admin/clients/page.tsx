import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatPrice, formatDate, computeBilling, PROJECT_STATUS } from '@/lib/utils'
import Link from 'next/link'
import { NewClientButton } from '../NewClientButton'

export default async function AdminClientsPage() {
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Vos <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>clients</em>
          </h1>
          <p style={{ color: 'var(--ink-mute)', fontSize: 14 }}>Tous vos projets en cours et leurs informations</p>
        </div>
        <NewClientButton />
      </div>

      {clients.length === 0 ? (
        <div style={{
          background: 'white', border: '1px solid var(--line)', borderRadius: 16,
          padding: 60, textAlign: 'center',
        }}>
          <div style={{
            width: 70, height: 70, margin: '0 auto 16px', borderRadius: 16,
            background: 'var(--yellow-soft)', color: 'var(--yellow-deep)',
            display: 'grid', placeItems: 'center', fontSize: 24,
          }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Aucun client pour le moment</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 22 }}>
            Crée ton premier client pour démarrer.
          </p>
          <NewClientButton />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {clients.map(c => {
            const project = c.projects[0]
            const billing = project ? computeBilling(project.payments as any[]) : { total: 0, paid: 0, remaining: 0, progress: 0 }
            const statusMeta = project ? PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] : null
            const openCount = project?.comments.length || 0
            return (
              <Link key={c.id} href={`/admin/clients/${c.id}`} style={{
                background: 'white', border: '1px solid var(--line)', borderRadius: 14,
                padding: '18px 22px', display: 'grid',
                gridTemplateColumns: '52px 1fr 130px 20px', gap: 18, alignItems: 'center',
                color: 'var(--ink)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'var(--yellow)', color: 'var(--ink)',
                  display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16,
                }}>
                  {c.company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{c.company}</div>
                    {statusMeta && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: statusBg(statusMeta.color), color: statusFg(statusMeta.color),
                      }}>{statusMeta.label}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>
                    {[c.trade, c.city, c.user.email].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-soft)', flexWrap: 'wrap', fontWeight: 500 }}>
                    <span><i className="fa-solid fa-calendar" style={{ color: 'var(--ink-mute)', marginRight: 4 }}></i>
                      Livraison {project?.estimatedDelivery ? formatDate(project.estimatedDelivery) : '—'}
                    </span>
                    <span>
                      <i className="fa-solid fa-comments" style={{ color: 'var(--ink-mute)', marginRight: 4 }}></i>
                      {openCount > 0 ? <b style={{ color: 'var(--red)' }}>{openCount} retour{openCount > 1 ? 's' : ''}</b> : 'À jour'}
                    </span>
                    <span><i className="fa-solid fa-euro-sign" style={{ color: 'var(--ink-mute)', marginRight: 4 }}></i>
                      {formatPrice(billing.paid)} / {formatPrice(billing.total)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: billing.progress === 100 ? 'var(--green)' : 'var(--ink)' }}>
                    {billing.progress}%
                  </div>
                  <div style={{ width: 100, height: 5, background: 'var(--bg)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ width: `${billing.progress}%`, height: '100%', background: billing.progress === 100 ? 'var(--green)' : 'var(--yellow-deep)', borderRadius: 100 }} />
                  </div>
                </div>

                <div style={{ color: 'var(--ink-mute)' }}><i className="fa-solid fa-chevron-right"></i></div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusBg(color: string) {
  const map: Record<string, string> = { gray: 'var(--bg)', yellow: 'var(--yellow-soft)', red: 'var(--red-soft)', blue: 'var(--blue-soft)', green: 'var(--green-soft)' }
  return map[color] || 'var(--bg)'
}
function statusFg(color: string) {
  const map: Record<string, string> = { gray: 'var(--ink-mute)', yellow: 'var(--yellow-deep)', red: 'var(--red)', blue: 'var(--ink)', green: 'var(--green)' }
  return map[color] || 'var(--ink-mute)'
}
