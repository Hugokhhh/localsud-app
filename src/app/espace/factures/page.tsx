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

  const allPayments = projects.flatMap(p => p.payments)
  const totalBilling = computeBilling(allPayments as any[])

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: 'var(--ink)' }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>factures</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Suivez l'avancement de vos paiements et téléchargez vos factures sur tous vos projets.
      </p>

      {/* HERO */}
      <div style={{
        background: 'var(--ink)', color: 'white', borderRadius: 20,
        padding: '32px 36px', marginBottom: 28,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
          <HeroBlock label="Montant total" value={formatPrice(totalBilling.total)}
                     sub={`${allPayments.length} échéance${allPayments.length > 1 ? 's' : ''}`} />
          <HeroBlock label="Déjà payé" value={formatPrice(totalBilling.paid)}
                     sub={`${totalBilling.progress}% du total`} color="green" icon="fa-check" />
          <HeroBlock label="Reste à régler" value={formatPrice(totalBilling.remaining)}
                     sub={TVA_MENTION} color="yellow" icon="fa-hourglass" />
        </div>
      </div>

      {/* Sections par projet */}
      {projects.map(project => {
        const billing = computeBilling(project.payments as any[])
        if (project.payments.length === 0) return null

        return (
          <div key={project.id} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14, flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{project.name}</h2>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                  {billing.progress}% payé
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>
                {formatPrice(billing.paid)} / <b style={{ color: 'var(--ink)' }}>{formatPrice(billing.total)}</b>
              </div>
            </div>

            <div style={{
              background: 'var(--white)', border: '1px solid var(--line)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {project.payments.map((p, i) => {
                const meta = STATUS_META[p.status] || STATUS_META.PENDING
                return (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto auto',
                    gap: 14, alignItems: 'center',
                    padding: '16px 18px',
                    borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
                  }}>
                    {/* Icone status */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: meta.bg, color: meta.text,
                      display: 'grid', placeItems: 'center', fontSize: 15,
                    }}>
                      <i className={`fa-solid ${meta.icon}`}></i>
                    </div>

                    {/* Infos échéance */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
                        {p.label}
                        {p.invoiceRef && (
                          <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 500, marginLeft: 8 }}>
                            · Réf. {p.invoiceRef}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 9px', borderRadius: 100,
                          background: meta.bg, color: meta.text, fontWeight: 700,
                        }}>
                          {meta.label}
                        </span>
                        {p.status === 'PAID' && p.paidAt ? (
                          <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                            Réglée le {formatDate(p.paidAt)}
                          </span>
                        ) : p.dueDate ? (
                          <span style={{ fontSize: 12, color: p.status === 'OVERDUE' ? 'var(--red)' : 'var(--ink-mute)' }}>
                            {p.status === 'OVERDUE' ? 'Échéance dépassée : ' : 'À régler avant le '}
                            {formatDate(p.dueDate)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Montant */}
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {formatPrice(Number(p.amount))}
                    </div>

                    {/* Téléchargement PDF */}
                    {p.pdfUrl ? (
                      <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" download style={{
                        padding: '9px 14px', background: 'var(--bg)', color: 'var(--ink)',
                        borderRadius: 10, fontSize: 12, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        textDecoration: 'none', border: '1px solid var(--line)',
                      }} title={`${p.pdfName || 'facture.pdf'} · ${formatFileSize(p.pdfSize || 0)}`}>
                        <i className="fa-solid fa-file-pdf" style={{ color: 'var(--red)' }}></i>
                        Facture PDF
                      </a>
                    ) : (
                      <span style={{
                        padding: '9px 14px', color: 'var(--ink-mute)',
                        fontSize: 11, fontWeight: 600, fontStyle: 'italic',
                      }}>
                        PDF à venir
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HeroBlock({
  label, value, sub, color, icon,
}: { label: string; value: string; sub: string; color?: string; icon?: string }) {
  const accent = color === 'green' ? 'var(--green)' : color === 'yellow' ? 'var(--yellow)' : 'white'
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 6,
      }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: accent, lineHeight: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 22 }}></i>}
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
    </div>
  )
}
