'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { COMMENT_TYPES, COMMENT_STATUS, formatFileSize, timeAgo, initials } from '@/lib/utils'

type Attachment = { id: string; url: string; name: string; size: number; mimeType: string; isImage: boolean }
type Comment = {
  id: string; type: string; status: string; section: string; content: string;
  createdAt: string | Date; parentId: string | null;
  author: { name: string; role: string }
  attachments: Attachment[]
  replies?: Comment[]
}

export function CommentThread({
  projectId, comments, currentUser, isAdmin,
}: {
  projectId: string
  comments: Comment[]
  currentUser: { id: string; name: string; role: string }
  isAdmin: boolean
}) {
  const router = useRouter()
  const [type, setType] = useState('MODIFICATION')
  const [section, setSection] = useState('')
  const [content, setContent] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!section.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type, section: section.trim(), content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Upload pièces jointes
      for (const file of pendingFiles) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('commentId', data.comment.id)
        await fetch('/api/attachments', { method: 'POST', body: fd })
      }

      setSection(''); setContent(''); setPendingFiles([]); setType('MODIFICATION')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const parent = comments.find(c => c.id === parentId)
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, parentId,
          type: parent?.type || 'MODIFICATION',
          section: parent?.section || '',
          content: replyContent.trim(),
        }),
      })
      setReplyTo(null); setReplyContent('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(commentId: string, status: string) {
    // Anti double-clic : si une requête est déjà en cours pour ce commentaire, on ignore
    if (statusLoading === commentId) return
    setStatusLoading(commentId)
    try {
      await fetch(`/api/comments?id=${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setStatusLoading(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter(f => {
      if (f.size > 10 * 1024 * 1024) { alert(`"${f.name}" > 10 Mo`); return false }
      return true
    })
    setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  // Organiser : tout-niveau-1 (parentId null) avec leurs replies
  const topLevel = comments.filter(c => !c.parentId)
  const repliesMap: Record<string, Comment[]> = {}
  comments.forEach(c => {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = []
      repliesMap[c.parentId].push(c)
    }
  })

  return (
    <div>
      {/* COMPOSER */}
      <form onSubmit={handleSubmit} style={{
        background: 'var(--white)', border: '1px solid var(--line)',
        borderRadius: 16, padding: 18, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
            {Object.entries(COMMENT_TYPES).map(([key, v]) =>
              <option key={key} value={key}>{v.emoji} {v.label}</option>
            )}
          </select>
          <div style={{
            flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg)', borderRadius: 10, padding: '0 12px',
          }}>
            <i className="fa-solid fa-location-dot" style={{ color: 'var(--ink-mute)' }}></i>
            <input value={section} onChange={e => setSection(e.target.value)} required
                   placeholder="Page concernée (Accueil, Tarifs...)*"
                   style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none',
                            padding: '10px 0', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} required
                  placeholder="Décrivez votre retour..."
                  style={{
                    width: '100%', minHeight: 80, padding: 12, border: '1px solid var(--line)',
                    borderRadius: 10, fontFamily: 'inherit', fontSize: 13.5,
                    outline: 'none', resize: 'vertical',
                  }} />

        {/* Aperçu pièces jointes */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {pendingFiles.map((f, i) => (
              <div key={i} style={chipStyle}>
                <i className={`fa-solid ${f.type.startsWith('image/') ? 'fa-image' : 'fa-file'}`}
                   style={{ color: 'var(--ink)' }}></i>
                <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{formatFileSize(f.size)}</span>
                <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={toolBtn}>
              <i className="fa-regular fa-image"></i><span>Image</span>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            <label style={toolBtn}>
              <i className="fa-solid fa-paperclip"></i><span>Fichier</span>
              <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          <button type="submit" disabled={submitting || !section.trim() || !content.trim()}
                  style={{
                    padding: '10px 22px', borderRadius: 100, border: 'none',
                    background: (!section.trim() || !content.trim()) ? 'var(--line)' : 'var(--ink)',
                    color: (!section.trim() || !content.trim()) ? 'var(--ink-mute)' : 'white',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    cursor: (!section.trim() || !content.trim()) ? 'not-allowed' : 'pointer',
                  }}>
            {submitting ? 'Envoi…' : <>Envoyer <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6 }}></i></>}
          </button>
        </div>
      </form>

      {/* COMMENTS LIST */}
      <div>
        {topLevel.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-mute)', fontSize: 14 }}>
            Aucun retour pour le moment. Le premier est pour vous !
          </div>
        )}
        {topLevel.map(c => {
          const typeMeta = COMMENT_TYPES[c.type as keyof typeof COMMENT_TYPES]
          const statusMeta = COMMENT_STATUS[c.status as keyof typeof COMMENT_STATUS]
          return (
            <div key={c.id} style={{
              background: 'var(--white)', border: '1px solid var(--line)',
              borderRadius: 14, padding: 18, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: c.author.role === 'ADMIN' ? 'var(--ink)' : 'var(--yellow)',
                  color: c.author.role === 'ADMIN' ? 'var(--yellow)' : 'var(--ink)',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13,
                  flexShrink: 0,
                }}>{initials(c.author.name)}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.author.name}</span>
                    <span style={{
                      padding: '3px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      ...tagStyle(typeMeta?.color),
                    }}>{typeMeta?.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                      📍 {c.section} · {timeAgo(c.createdAt)}
                    </span>
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{c.content}</div>

                  {/* Pièces jointes */}
                  {c.attachments?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {c.attachments.map(a => a.isImage ? (
                        <img key={a.id} src={a.url} alt={a.name} onClick={() => setLightbox(a.url)}
                             style={{ width: 96, height: 96, borderRadius: 10, objectFit: 'cover',
                                      border: '1px solid var(--line)', cursor: 'pointer' }} />
                      ) : (
                        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                           style={{
                             display: 'inline-flex', alignItems: 'center', gap: 10,
                             background: 'var(--bg)', border: '1px solid var(--line)',
                             borderRadius: 10, padding: '8px 14px 8px 10px', fontSize: 12.5,
                             color: 'var(--ink)',
                           }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ink)',
                                        color: 'var(--yellow)', display: 'grid', placeItems: 'center' }}>
                            <i className="fa-solid fa-file"></i>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                            <div style={{ color: 'var(--ink-mute)', fontSize: 11 }}>{formatFileSize(a.size)}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Replies */}
                  {repliesMap[c.id]?.map(r => (
                    <div key={r.id} style={{
                      marginTop: 12, padding: '10px 14px',
                      background: 'var(--bg)', borderLeft: '3px solid var(--ink)',
                      borderRadius: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.author.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{timeAgo(r.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{r.content}</div>
                    </div>
                  ))}

                  {/* Action bar : statut + répondre */}
                  <div style={{
                    display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    {isAdmin ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, marginRight: 4 }}>Statut :</span>
                        {Object.entries(COMMENT_STATUS).map(([key, meta]) => (
                          <button key={key} onClick={() => changeStatus(c.id, key)}
                            disabled={statusLoading === c.id}
                                  style={statusBtn(meta.color, c.status === key)}>
                            <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <span style={{
                        padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                        ...tagStyle(statusMeta?.color),
                      }}>
                        <i className={`fa-solid ${statusMeta?.icon}`} style={{ marginRight: 4 }}></i> {statusMeta?.label}
                      </span>
                    )}
                    <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                            style={{
                              marginLeft: 'auto', padding: '6px 14px',
                              background: 'var(--ink)', color: 'white', border: 'none',
                              borderRadius: 100, fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                            }}>
                      <i className="fa-regular fa-comment" style={{ marginRight: 6 }}></i> Répondre
                    </button>
                  </div>

                  {replyTo === c.id && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 10 }}>
                      <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                                placeholder="Votre réponse..."
                                style={{
                                  width: '100%', minHeight: 60, padding: 10, border: '1px solid var(--line)',
                                  borderRadius: 8, fontFamily: 'inherit', fontSize: 13, outline: 'none',
                                  resize: 'vertical',
                                }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={() => { setReplyTo(null); setReplyContent('') }}
                                style={{
                                  padding: '7px 14px', borderRadius: 100, border: '1px solid var(--line)',
                                  background: 'white', color: 'var(--ink-soft)',
                                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                }}>Annuler</button>
                        <button onClick={() => handleReply(c.id)} disabled={submitting || !replyContent.trim()}
                                style={{
                                  padding: '7px 14px', borderRadius: 100, border: 'none',
                                  background: 'var(--ink)', color: 'white',
                                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                }}>
                          <i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }}></i> Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(11,31,77,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 40, zIndex: 100, cursor: 'zoom-out',
        }}>
          <img src={lightbox} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10,
  fontFamily: 'inherit', fontSize: 13, background: 'var(--bg)', outline: 'none',
}
const toolBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 100, cursor: 'pointer',
  color: 'var(--ink-soft)', background: 'var(--bg)', border: '1px solid var(--line)',
  fontSize: 12, fontWeight: 600,
}
const chipStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
  padding: '6px 10px',
}
function tagStyle(color?: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    red: ['var(--red-soft)', 'var(--red)'],
    blue: ['var(--blue-soft)', 'var(--ink)'],
    green: ['var(--green-soft)', 'var(--green)'],
    yellow: ['var(--yellow-soft)', 'var(--yellow-deep)'],
  }
  const [bg, fg] = map[color || 'red'] || map.red
  return { background: bg, color: fg }
}
function statusBtn(color: string, active: boolean): React.CSSProperties {
  const colorMap: Record<string, string> = {
    red: 'var(--red)', yellow: 'var(--yellow-deep)', green: 'var(--green)',
  }
  return {
    border: `1px solid ${active ? colorMap[color] : 'var(--line)'}`,
    background: active ? colorMap[color] : 'white',
    color: active ? 'white' : 'var(--ink-soft)',
    padding: '5px 12px', borderRadius: 100, fontFamily: 'inherit',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5,
    textTransform: 'uppercase', letterSpacing: '0.03em',
  }
}
