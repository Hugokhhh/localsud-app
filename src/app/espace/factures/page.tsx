import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, formatFileSize, TVA_MENTION } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  PAID:    { label: 'Payée',      bg: '#DDF4E4', text: '#136B36', icon: 'fa-check' },
  PENDING: { label: 'En attente', bg: '#FFF7D6', text: '#7A6300', icon: 'fa-hourglass-half' },
  OVERDUE: { label: 'En retard',  bg: '#FEE9E7', text: '#B12A1A', icon: 'fa-circle-exclamation' },
}

export default async function FacturesClientPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      projects: {
        include: { payments: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const projects = client?.projects || []
  if (projects.length === 0) return <div>Aucun projet en cours.</div>

  const allPayments = projects.flatMap(p => p.payments.map(pay => ({ ...pay, projectName: p.name })))
  const totalBilling = computeBilling(allPayments as any[])

  // Timeline chronologique : payées d'abord (par date), puis à venir (par échéance)
  const timeline = [...allPayments].sort((a, b) => {
    const da = a.paidAt ? new Date(a.paidAt).getTime() : a.dueDate ? new Date(a.dueDate).getTime() : 0
    const db = b.paidAt ? new Date(b.paidAt).getTime() : b.dueDate ? new Date(b.dueDate).getTime() : 0
    return da - db
  })

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: 'var(--ink)' }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>factures</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Récapitulatif des sommes versées et restant à régler sur vos projets.
      </p>

      {/* === 3 STATS === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={statLabel}>Montant total</div>
          <div style={statValue}>{formatPrice(totalBilling.total)}</div>
          <div style={statSub}>{allPayments.length} échéance{allPayments.length > 1 ? 's' : ''}</div>
        </div>
        <div style={{ background: 'var(--green-soft)', borderRadius: 14, padding: 20 }}>
          <div style={{ ...statLabel, color: 'var(--green)' }}><i className="fa-solid fa-check"></i> Payé</div>
          <div style={{ ...statValue, color: 'var(--green)' }}>{formatPrice(totalBilling.paid)}</div>
          <div style={statSub}>{totalBilling.progress}% du total</div>
        </div>
        <div style={{ background: 'var(--yellow-soft)', borderRadius: 14, padding: 20 }}>
          <div style={{ ...statLabel, color: 'var(--yellow-deep)' }}><i className="fa-solid fa-clock"></i> Reste à régler</div>
          <div style={{ ...statValue, color: 'var(--yellow-deep)' }}>{formatPrice(totalBilling.remaining)}</div>
          <div style={statSub}>{100 - totalBilling.progress}% du total</div>
        </div>
      </div>

      {/* === BARRE DE PROGRESSION GLOBALE === */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Progression du paiement</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            <b style={{ color: 'var(--green)' }}>{formatPrice(totalBilling.paid)}</b> versés sur {formatPrice(totalBilling.total)}
          </div>
        </div>
        <div style={{ height: 14, background: 'var(--bg)', borderRadius: 100, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${totalBilling.progress}%`, height: '100%',
            background: 'linear-gradient(90deg, var(--green) 0%, #1BA85A 100%)',
            borderRadius: 100, transition: 'width 0.4s',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
          }}>
            {totalBilling.progress >= 15 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{totalBilling.progress}%</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-mute)' }}>
          <span>Début du projet</span>
          <span>Paiement complet</span>
        </div>
      </div>

      {/* === TIMELINE / HISTORIQUE === */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4 }}>
          Échéancier
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Historique des paiements</h2>
      </div>

      <div style={{ position: 'relative', paddingLeft: 8 }}>
        {timeline.map((p, i) => {
          const meta = STATUS_META[p.status] || STATUS_META.PENDING
          const isLast = i === timeline.length - 1
          return (
            <div key={p.id} style={{ display: 'flex', gap: 18, position: 'relative' }}>
              {/* Ligne verticale + point */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: meta.bg, color: meta.text,
                  display: 'grid', placeItems: 'center', fontSize: 14,
                  border: '3px solid var(--white)', boxShadow: '0 0 0 1px var(--line)',
                  zIndex: 1,
                }}>
                  <i className={`fa-solid ${meta.icon}`}></i>
                </div>
                {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--line)', minHeight: 20 }} />}
              </div>

              {/* Contenu */}
              <div style={{
                flex: 1, marginBottom: isLast ? 0 : 16,
                background: 'var(--white)', border: '1px solid var(--line)',
                borderRadius: 14, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{p.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 100, background: meta.bg, color: meta.text, fontWeight: 700 }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                      {p.projectName}
                      {p.invoiceRef && <> · Réf. {p.invoiceRef}</>}
                      {' · '}
                      {p.status === 'PAID' && p.paidAt
                        ? `Réglée le ${formatDate(p.paidAt)}`
                        : p.dueDate
                        ? (p.status === 'OVERDUE' ? `En retard depuis le ${formatDate(p.dueDate)}` : `À régler avant le ${formatDate(p.dueDate)}`)
                        : 'Date non définie'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap',
                      color: p.status === 'PAID' ? 'var(--green)' : p.status === 'OVERDUE' ? 'var(--red)' : 'var(--yellow-deep)',
                    }}>
                      {p.status === 'PAID' ? '+ ' : ''}{formatPrice(Number(p.amount))}
                    </div>
                    {p.pdfUrl && (
                      <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" download style={{
                        padding: '8px 12px', background: 'var(--bg)', color: 'var(--ink)',
                        borderRadius: 10, fontSize: 12, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        textDecoration: 'none', border: '1px solid var(--line)',
                      }} title={`${p.pdfName || 'facture.pdf'}${p.pdfSize ? ' · ' + formatFileSize(p.pdfSize) : ''}`}>
                        <i className="fa-solid fa-file-pdf" style={{ color: 'var(--red)' }}></i> PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 18, textAlign: 'center' }}>
        {TVA_MENTION}
      </div>
    </div>
  )
}

const statLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink-mute)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }
const statValue: React.CSSProperties = { fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }
const statSub: React.CSSProperties = { fontSize: 12, color: 'var(--ink-mute)', marginTop: 6 }
