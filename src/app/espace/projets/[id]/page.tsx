import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/CommentThread'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_ORDER = ['BRIEF', 'MAQUETTE', 'RETOURS', 'INTEGRATION', 'ONLINE'] as const

export default async function ProjetClientDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      payments: { orderBy: { order: 'asc' } },
      steps: { orderBy: { order: 'asc' } },
      comments: {
        include: { attachments: true, parent: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) notFound()
  if (project.client.userId !== user.id) redirect('/espace/projets')

  const authorIds = [...new Set(project.comments.map(c => c.authorId))]
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, role: true },
  })
  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]))

  const commentsWithAuthor = project.comments.map(c => ({
    ...c,
    author: authorMap[c.authorId] || { name: 'Utilisateur', role: 'CLIENT' },
    createdAt: c.createdAt.toISOString(),
  })) as any

  const statusMeta = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]
  const currentStepIdx = STATUS_ORDER.indexOf(project.status as any)
  const billing = computeBilling(project.payments as any[])
  const nextPayment = project.payments.find(p => p.status === 'PENDING' || p.status === 'OVERDUE')

  return (
    <div>
      <Link href="/espace/projets" style={{
        fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16,
        display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
      }}>
        <i className="fa-solid fa-arrow-left"></i> Retour à mes projets
      </Link>

      {/* Header projet */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>
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
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 6 }}>
            {project.name}
          </h1>
          {project.estimatedDelivery && (
            <div style={{ color: 'var(--ink-mute)', fontSize: 14 }}>
              <i className="fa-solid fa-calendar" style={{ marginRight: 6 }}></i>
              Livraison prévue le {formatDate(project.estimatedDelivery)}
            </div>
          )}
        </div>

        {/* Boutons d'accès rapide */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {project.mockupUrl && (
            <a href={project.mockupUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: '11px 20px', background: 'var(--yellow)', color: 'var(--ink)',
              borderRadius: 100, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            }}>
              <i className="fa-solid fa-image"></i> Voir la maquette
            </a>
          )}
          {project.documentsUrl && (
            <a href={project.documentsUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: '11px 20px', background: 'var(--ink)', color: 'var(--white)',
              borderRadius: 100, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            }}>
              <i className="fa-solid fa-folder-open"></i> Accéder au Drive
            </a>
          )}
        </div>
      </div>

      {/* Timeline visuelle */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--line)',
        borderRadius: 16, padding: 22, marginBottom: 20,
      }}>
        <div style={sectionKicker}>Avancement</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 18 }}>
          Étape actuelle : <span style={{ color: 'var(--yellow-deep)' }}>{statusMeta?.label}</span>
        </h3>

        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_ORDER.map((s, idx) => {
            const isDone = idx < currentStepIdx
            const isCurrent = idx === currentStepIdx
            return (
              <div key={s} style={{ flex: 1 }}>
                <div style={{
                  height: 6, borderRadius: 6,
                  background: isDone || isCurrent ? 'var(--yellow)' : 'var(--line)',
                  marginBottom: 8,
                }} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                  fontSize: 11,
                  color: isCurrent ? 'var(--ink)' : isDone ? 'var(--ink-soft)' : 'var(--ink-mute)',
                  fontWeight: isCurrent ? 800 : 600,
                }}>
                  {isDone && <i className="fa-solid fa-check" style={{ color: 'var(--green)', fontSize: 10 }}></i>}
                  {PROJECT_STATUS[s as keyof typeof PROJECT_STATUS]?.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Récap paiement + Étapes détaillées (côte à côte) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Bloc paiement */}
        <div style={{
          background: 'var(--ink)', color: 'white',
          borderRadius: 16, padding: 22,
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--yellow)', fontWeight: 700, marginBottom: 4 }}>
            Facturation
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Récapitulatif</h3>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>
              <span>{billing.progress}% payé</span>
              <span>{formatPrice(billing.paid)} / {formatPrice(billing.total)}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${billing.progress}%`, height: '100%',
                background: 'var(--yellow)', borderRadius: 4,
              }} />
            </div>
          </div>

          {nextPayment ? (
            <div style={{
              padding: '12px 14px', background: 'rgba(255,255,255,0.08)',
              borderRadius: 10, marginTop: 14,
            }}>
              <div style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Prochaine échéance
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{nextPayment.label}</div>
                  {nextPayment.dueDate && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Avant le {formatDate(nextPayment.dueDate)}</div>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {formatPrice(Number(nextPayment.amount))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--yellow)', marginTop: 14, fontWeight: 600 }}>
              <i className="fa-solid fa-check-circle" style={{ marginRight: 6 }}></i>
              Toutes les échéances sont réglées
            </div>
          )}

          <Link href="/espace/factures" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 14, color: 'var(--yellow)', fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}>
            Voir toutes les factures <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        {/* Étapes détaillées ou informations */}
        <div style={{
          background: 'var(--white)', border: '1px solid var(--line)',
          borderRadius: 16, padding: 22,
        }}>
          <div style={sectionKicker}>Étapes du projet</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 14 }}>
            {project.steps.length > 0 ? 'Détail' : 'Prochainement'}
          </h3>

          {project.steps.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {project.steps.map((step, i) => (
                <li key={step.id} style={{
                  display: 'flex', gap: 12, padding: '10px 0',
                  borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: step.completed ? 'var(--green)' : 'var(--bg)',
                    border: step.completed ? 'none' : '2px solid var(--line)',
                    color: 'white', display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0,
                  }}>
                    {step.completed && <i className="fa-solid fa-check"></i>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: step.completed ? 'var(--ink-soft)' : 'var(--ink)',
                      textDecoration: step.completed ? 'line-through' : 'none',
                    }}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{step.description}</div>
                    )}
                    {step.completed && step.completedAt && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontWeight: 600 }}>
                        <i className="fa-solid fa-check-circle" style={{ marginRight: 4 }}></i>
                        Terminée le {formatDate(step.completedAt)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.6 }}>
              Hugo ajoutera bientôt le détail des étapes de votre projet ici (design, développement, tests, mise en ligne...).
            </p>
          )}
        </div>
      </div>

      {/* Retours & commentaires */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionKicker}>Échanges</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Retours & commentaires
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>
          Un souci sur une page, une idée, une demande de modification ? Écrivez-le ici, Hugo vous répondra vite.
        </p>
      </div>

      <CommentThread
        projectId={project.id}
        comments={commentsWithAuthor}
        currentUser={{ id: user.id, name: user.name, role: 'CLIENT' }}
        isAdmin={false}
      />
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

const sectionKicker: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 4,
}
