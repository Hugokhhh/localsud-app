import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeBilling, formatPrice, formatDate, TVA_MENTION } from '@/lib/utils'

export const dynamic = 'force-dynamic'

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

  // Agrégation tous projets confondus
  const allPayments = projects.flatMap(p => p.payments)
  const totalBilling = computeBilling(allPayments as any[])

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
        Mes <em style={{ color: 'var(--yellow-deep)', fontStyle: 'italic' }}>factures</em>
      </h1>
      <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 28 }}>
        Suivez l'avancement de vos paiements sur tous vos projets.
      </p>

      {/* HERO : 3 gros chiffres */}
      <div style={{
        background: 'var(--ink)', color: 'white', borderRadius: 20,
        padding: '32px 36px', marginBottom: 24,
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{project.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {formatPrice(billing.paid)} / <b>{formatPrice(billing.total)}</b>
              </div>
            </div>

            <div style={{
              background: 'var(--white)', border: '1px solid var(--line)',
              borderRadius: 16, padding: 8, overflow: 'hidden',
            }}>
              {project.payments.map((p, i) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 80px auto auto',
                  gap: 12, alignItems: 'center',
                  padding: '12px 14px',
                  borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: p.status === 'PAID' ? 'var(--green-soft)' : (p.status === 'OVERDUE' ? 'var(--red-soft)' : 'var(--yellow-soft)'),
                    color: p.status === 'PAID' ? 'var(--green)' : (p.status === 'OVERDUE' ? 'var(--red)' : 'var(--yellow-deep)'),
                    display: 'grid', placeItems: 'center', fontSize: 11,
                  }}>
                    <i className={`fa-solid ${p.status === 'PAID' ? 'fa-check' : (p.status === 'OVERDUE' ? 'fa-triangle-exclamation' : 'fa-hourglass')}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                      {p.dueDate ? `Échéance ${formatDate(p.dueDate)}` : 'Échéance non définie'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', textAlign: 'right' }}>
                    {formatPrice(Number(p.amount))}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
                    background: p.status === 'PAID' ? 'var(--green-soft)' : (p.status === 'OVERDUE' ? 'var(--red-soft)' : 'var(--yellow-soft)'),
                    color: p.status === 'PAID' ? 'var(--green)' : (p.status === 'OVERDUE' ? 'var(--red)' : 'var(--yellow-deep)'),
                    whiteSpace: 'nowrap',
                  }}>
                    {p.status === 'PAID' ? 'Payée' : (p.status === 'OVERDUE' ? 'En retard' : 'En attente')}
                  </div>
                  {p.invoiceUrl ? (
                    <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 12, color: 'var(--ink)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className="fa-solid fa-download"></i>
                    </a>
                  ) : <span></span>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HeroBlock({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color?: string; icon?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color === 'yellow' ? 'var(--yellow)' : color === 'green' ? '#7EE2B0' : 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 18, marginRight: 8 }}></i>}
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{sub}</div>
    </div>
  )
}
