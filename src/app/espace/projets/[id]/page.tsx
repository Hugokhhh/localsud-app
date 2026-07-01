import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/CommentThread'
import { computeBilling, formatPrice, formatDate, PROJECT_STATUS, PROJECT_TYPE, externalUrl } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_ORDER = ['BRIEF', 'MAQUETTE', 'RETOURS', 'INTEGRATION', 'ONLINE'] as const

export default async function ProjetClientDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { tab?: string } }) {
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
  const openCount = project.comments.filter(c => c.status === 'OPEN' && !c.parentId).length

  const activeTab = searchParams.tab || 'overview'

  return (
    <div>
      {/* Retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/espace/projets" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--white)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-soft)',
          textDecoration: 'none',
        }}>
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Retour à mes projets</span>
      </div>

      {/* Titre */}
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4 }}>
        {project.name}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 22 }}>
        {PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE]} · {statusMeta?.label}
        {project.estimatedDelivery && <> · Livraison estimée {formatDate(project.estimatedDelivery)}</>}
      </p>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 12, marginBottom: 24, width: 'fit-content' }}>
        <TabBtn href={`/espace/projets/${project.id}?tab=overview`} active={activeTab === 'overview'} label="Vue d'ensemble" />
        <TabBtn href={`/espace/projets/${project.id}?tab=maquette`} active={activeTab === 'maquette'} label="Maquette" />
        <TabBtn href={`/espace/projets/${project.id}?tab=retours`} active={activeTab === 'retours'} label="Retours" badge={openCount > 0 ? openCount : undefined} badgeColor="var(--red)" />
      </div>

      {/* === TAB VUE D'ENSEMBLE === */}
      {activeTab === 'overview' && (
        <div>
          {/* Ressources rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>

            <Link href={project.mockupUrl ? externalUrl(project.mockupUrl) : `/espace/projets/${project.id}?tab=maquette`}
              target={project.mockupUrl ? '_blank' : undefined}
              rel="noopener noreferrer" style={resCardStyle}>
              <div style={{ ...resStatus, background: 'var(--yellow-soft)', color: 'var(--yellow-deep)' }}>
                <i className="fa-solid fa-clock"></i> Retours en cours
              </div>
              <div style={{ ...resIcon, background: 'var(--blue-soft)', color: 'var(--ink)' }}>
                <i className="fa-solid fa-image"></i>
              </div>
              <div style={resSourceStyle}>{project.mockupUrl ? 'Lien externe' : 'Non disponible'}</div>
              <div style={resTitleStyle}>Maquette</div>
              <div style={resDescStyle}>La maquette interactive de votre site.</div>
              <div style={resCtaStyle}>Ouvrir <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: 6 }}></i></div>
            </Link>

            <Link href={`/espace/projets/${project.id}?tab=retours`} style={resCardStyle}>
              <div style={{ ...resStatus, background: openCount > 0 ? 'var(--yellow-soft)' : 'var(--green-soft)', color: openCount > 0 ? 'var(--yellow-deep)' : 'var(--green)' }}>
                <i className={`fa-solid ${openCount > 0 ? 'fa-clock' : 'fa-check'}`}></i>
                {openCount > 0 ? ` ${openCount} à traiter` : ' À jour'}
              </div>
              <div style={{ ...resIcon, background: 'var(--yellow-soft)', color: 'var(--ink)' }}>
                <i className="fa-regular fa-comments"></i>
              </div>
              <div style={resSourceStyle}>Espace dédié</div>
              <div style={resTitleStyle}>Commentaires & retours</div>
              <div style={resDescStyle}>Posez vos questions et axes d'amélioration.</div>
              <div style={resCtaStyle}>Ouvrir <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }}></i></div>
            </Link>

            <Link href={project.documentsUrl ? externalUrl(project.documentsUrl) : '#'}
              target={project.documentsUrl ? '_blank' : undefined}
              rel="noopener noreferrer" style={resCardStyle}>
              <div style={{ ...resStatus, background: 'var(--bg)', color: 'var(--ink-soft)' }}>
                <i className="fa-solid fa-folder"></i>
                {project.documentsUrl ? ' Drive partagé' : ' Non disponible'}
              </div>
              <div style={{ ...resIcon, background: 'var(--bg)', color: 'var(--ink)' }}>
                <i className="fa-solid fa-folder-open"></i>
              </div>
              <div style={resSourceStyle}>Drive</div>
              <div style={resTitleStyle}>Vos documents</div>
              <div style={resDescStyle}>Logo, photos et PDF liés à votre projet.</div>
              <div style={resCtaStyle}>
                {project.documentsUrl ? <>Ouvrir <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: 6 }}></i></> : 'Bientôt disponible'}
              </div>
            </Link>

          </div>

          {/* Étapes du projet */}
          <div style={cardStyle}>
            <div style={cardHeadStyle}>
              <div style={cardTitleStyle}>Étapes du projet</div>
              <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{STATUS_ORDER.length} étapes</span>
            </div>
            {STATUS_ORDER.map((s, idx) => {
              const isDone = idx < currentStepIdx
              const isCurrent = idx === currentStepIdx
              const meta = PROJECT_STATUS[s as keyof typeof PROJECT_STATUS]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: idx > 0 ? '1px solid var(--line-soft)' : 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
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
      )}

      {/* === TAB MAQUETTE === */}
      {activeTab === 'maquette' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--blue-soft)', display: 'grid', placeItems: 'center', fontSize: 28, color: 'var(--ink)' }}>
                <i className="fa-solid fa-image"></i>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>
                  Maquette · {project.mockupUrl ? 'Disponible' : 'Pas encore disponible'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Votre maquette interactive</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.5 }}>
                  {project.mockupUrl
                    ? "Cliquez pour ouvrir la maquette dans un nouvel onglet. Vous pouvez naviguer et poster un retour structuré depuis l'onglet Retours."
                    : "Votre maquette sera disponible ici dès qu'Hugo l'aura partagée."}
                </div>
              </div>
              {project.mockupUrl && (
                <a href={externalUrl(project.mockupUrl)} target="_blank" rel="noopener noreferrer" style={{
                  padding: '13px 22px', background: 'var(--yellow)', color: 'var(--ink)',
                  borderRadius: 100, fontWeight: 700, fontSize: 13,
                  display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
                }}>
                  Ouvrir la maquette <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              )}
            </div>
          </div>
          <div style={{ background: 'var(--yellow-soft)', borderRadius: 14, padding: 18, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
            <i className="fa-solid fa-lightbulb" style={{ color: 'var(--yellow-deep)', marginRight: 8 }}></i>
            <b>Astuce :</b> pour un retour structuré, utilisez l'onglet <b>Retours</b> plutôt que les commentaires directement sur le lien — tout est suivi au même endroit avec un statut clair.
          </div>
        </div>
      )}

      {/* === TAB RETOURS === */}
      {activeTab === 'retours' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
          {/* Colonne gauche : CommentThread */}
          <div>
            <CommentThread
              projectId={project.id}
              comments={commentsWithAuthor}
              currentUser={{ id: user.id, name: user.name, role: 'CLIENT' }}
              isAdmin={false}
            />
          </div>

          {/* Colonne droite : Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Récap paiement */}
            <div style={{ ...cardStyle, background: 'var(--ink)', color: 'white' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--yellow)', fontWeight: 700, marginBottom: 8 }}>
                Facturation
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{billing.progress}% payé</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{formatPrice(billing.paid)} / {formatPrice(billing.total)}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: `${billing.progress}%`, height: '100%', background: 'var(--yellow)', borderRadius: 4 }} />
              </div>
              <Link href="/espace/factures" style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Voir mes factures <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>

            {/* Conseils */}
            <div style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                💡 Bien rédiger vos retours
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Soyez précis sur la section et le changement souhaité. Joignez une capture si possible. Plus c'est précis, plus vite c'est traité.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ href, active, label, badge, badgeColor }: { href: string; active: boolean; label: string; badge?: number; badgeColor?: string }) {
  return (
    <Link href={href} style={{
      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
      background: active ? 'var(--white)' : 'transparent',
      color: active ? 'var(--ink)' : 'var(--ink-mute)',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
      whiteSpace: 'nowrap',
    }}>
      {label}
      {badge !== undefined && (
        <span style={{ background: badgeColor || 'var(--ink)', color: 'white', fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </Link>
  )
}

const resCardStyle: React.CSSProperties = { background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }
const resStatus: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }
const resIcon: React.CSSProperties = { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, marginTop: 4 }
const resSourceStyle: React.CSSProperties = { fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.05em' }
const resTitleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: 'var(--ink)' }
const resDescStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, flex: 1 }
const resCtaStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginTop: 4, display: 'flex', alignItems: 'center' }
const cardStyle: React.CSSProperties = { background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }
const cardHeadStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const cardTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--ink)' }
