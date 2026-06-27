import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, TVA_MENTION } from '@/lib/utils'

export default async function FacturesClientPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          payments: { orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const project = client?.projects[0]
  if (!project) return <div>Aucun projet en cours.</div>

  const payments = project.payments
  const billing = computeBilling(payments as any[])

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>factures</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Suivez l'avancement de vos paiements pour <b>{project.name}</b>
      </p>

      {/* HERO : 3 gros chiffres */}
      <div style={{
        background: 'var(--ink)', color: 'white', borderRadius: 20,
        padding: '32px 36px', marginBottom: 24,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32,
        }}>
          <HeroBlock label="Montant total" value={formatPrice(billing.total)}
                     sub={`${payments.length} échéance${payments.length > 1 ? 's' : ''}`} />
          <HeroBlock label="Déjà payé" value={formatPrice(billing.paid)}
                     sub={`${billing.progress}% du total`} color="green" icon="fa-check" />
          <HeroBlock label="Reste à régler" value={formatPrice(billing.remaining)}
                     sub={billing.remaining > 0 ? 'À la livraison' : 'Tout est réglé ✨'}
                     color="yellow" icon="fa-clock" />
        </div>
      </div>

      {/* FRISE DYNAMIQUE */}
      <div style={{
        background: 'white', border: '1px solid var(--line)', borderRadius: 16,
        padding: '28px 32px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
              Calendrier de paiement
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Avancement de vos règlements</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
            Progression : <b style={{ color: 'var(--ink)', fontSize: 15 }}>{billing.progress}%</b>
          </div>
        </div>

        <div style={{ position: 'relative', padding: '0 20px' }}>
          {/* Track */}
          <div style={{
            position: 'absolute', left: 40, right: 40, top: 22,
            height: 4, background: 'var(--bg)', borderRadius: 100, zIndex: 0,
          }}>
            <div style={{
              height: '100%',
              width: `${billing.progress}%`,
              background: 'linear-gradient(90deg, var(--green), var(--yellow))',
              borderRadius: 100, transition: 'width 0.6s ease',
            }} />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            {payments.map((p, i) => {
              const state = p.status === 'PAID' ? 'done' : (i === payments.findIndex(x => x.status !== 'PAID') ? 'current' : 'pending')
              return (
                <div key={p.id} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px',
                    display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800,
                    border: '3px solid white',
                    ...(state === 'done' ? {
                      background: 'var(--green)', color: 'white',
                      boxShadow: '0 0 0 4px var(--green-soft)',
                    } : state === 'current' ? {
                      background: 'var(--yellow)', color: 'var(--ink)',
                      boxShadow: '0 0 0 4px var(--yellow-soft)',
                    } : {
                      background: 'var(--bg)', color: 'var(--ink-mute)',
                      borderColor: 'var(--line)',
                    }),
                  }}>
                    {state === 'done' ? <i className="fa-solid fa-check"></i> : i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.label}</div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
                    color: state === 'done' ? 'var(--green)' :
                           state === 'current' ? 'var(--yellow-deep)' : 'var(--ink-mute)',
                  }}>{formatPrice(Number(p.amount))}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4, fontWeight: 500 }}>
                    {p.status === 'PAID' && p.paidAt ? `Payé le ${formatDate(p.paidAt)}` :
                     p.dueDate ? `Dû le ${formatDate(p.dueDate)}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* DÉTAIL DES FACTURES */}
      <div style={{
        background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 22,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Détail des factures</div>

        {payments.map((p, i) => {
          const isPaid = p.status === 'PAID'
          const isPending = p.status === 'PENDING'
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 80px auto auto',
              gap: 14, alignItems: 'center', padding: '14px 0',
              borderBottom: i < payments.length - 1 ? '1px solid var(--line-soft)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'grid', placeItems: 'center', fontSize: 13,
                background: isPaid ? 'var(--green-soft)' : isPending ? 'var(--yellow-soft)' : 'var(--bg)',
                color: isPaid ? 'var(--green)' : isPending ? 'var(--yellow-deep)' : 'var(--ink-mute)',
              }}>
                <i className={`fa-solid ${isPaid ? 'fa-check' : 'fa-hourglass-half'}`}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {p.label}{p.invoiceRef ? ` · ${p.invoiceRef}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 1 }}>
                  {isPaid ? 'Virement bancaire · Encaissé' : 'À régler'}
                </div>
              </div>
              {p.pdfUrl ? (
                <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--line)',
                  borderRadius: 8, color: 'var(--ink)', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  justifySelf: 'center',
                }}>
                  <i className="fa-solid fa-file-pdf" style={{ color: 'var(--red)' }}></i> PDF
                </a>
              ) : (
                <div style={{
                  width: 36, height: 28, borderRadius: 8, background: 'var(--bg)',
                  color: 'var(--ink-mute)', border: '1px dashed var(--line)',
                  display: 'grid', placeItems: 'center', fontSize: 11, justifySelf: 'center',
                }}>
                  <i className="fa-regular fa-clock"></i>
                </div>
              )}
              <div style={{
                fontWeight: 800, fontSize: 16,
                color: isPaid ? 'var(--green)' : isPending ? 'var(--yellow-deep)' : 'var(--ink-mute)',
              }}>
                {isPaid ? '+' : ''}{formatPrice(Number(p.amount))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                {formatDate(p.paidAt || p.dueDate)}
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-mute)' }}>
          <i className="fa-solid fa-circle-info"></i> {TVA_MENTION}
        </div>
      </div>
    </div>
  )
}

function HeroBlock({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color?: 'green' | 'yellow'; icon?: string }) {
  const fg = color === 'green' ? 'var(--green)' : color === 'yellow' ? 'var(--yellow)' : 'white'
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: color ? fg : 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 10,
      }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ marginRight: 6 }}></i>}{label}
      </div>
      <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: fg }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontWeight: 500 }}>{sub}</div>
    </div>
  )
}
