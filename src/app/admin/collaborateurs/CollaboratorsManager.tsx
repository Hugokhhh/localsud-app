'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Collab = { id: string; name: string; email: string; clientCount: number }

export function CollaboratorsManager({ initial }: { initial: Collab[] }) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [newOpen, setNewOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Collab | null>(null)

  return (
    <>
      <button onClick={() => setNewOpen(true)} style={{
        background: 'var(--yellow)', color: 'var(--ink)', border: 'none',
        borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="fa-solid fa-plus"></i> Inviter un collaborateur
      </button>

      {list.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px dashed var(--line)', borderRadius: 16, padding: 32, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 14 }}>
          Aucun collaborateur pour le moment.
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          {list.map((c, i) => (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 16,
              alignItems: 'center', padding: '14px 18px',
              borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue-soft)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{c.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{c.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
                {c.clientCount} client{c.clientCount > 1 ? 's' : ''}
              </div>
              <button onClick={() => setToDelete(c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 8, fontSize: 14 }}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {newOpen && <InviteModal onClose={() => setNewOpen(false)} onCreated={() => { setNewOpen(false); router.refresh() }} />}
      {toDelete && (
        <DeleteModal collab={toDelete} onClose={() => setToDelete(null)} onDeleted={() => {
          setList(list.filter(x => x.id !== toDelete.id))
          setToDelete(null); router.refresh()
        }} />
      )}
    </>
  )
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setSaving(true); setErr(null)
    try {
      const res = await fetch('/api/admin/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onCreated()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Inviter un collaborateur">
      <Field label="Nom complet">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} autoFocus />
      </Field>
      <Field label="Email">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="collaborateur@localsud.fr" />
      </Field>
      <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4 }}>
        Le collaborateur recevra un email pour créer son mot de passe.
      </p>
      {err && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={btnCancel}>Annuler</button>
        <button onClick={submit} disabled={saving || !name || !email} style={btnPrimary}>
          {saving ? 'Envoi…' : 'Envoyer l\'invitation'}
        </button>
      </div>
    </Modal>
  )
}

function DeleteModal({ collab, onClose, onDeleted }: { collab: Collab; onClose: () => void; onDeleted: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/collaborators/${collab.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onDeleted()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Supprimer le collaborateur">
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Tu vas supprimer <b>{collab.name}</b>.{collab.clientCount > 0 ? ` Les ${collab.clientCount} client${collab.clientCount > 1 ? 's qui lui sont assignés seront désassignés' : ' qui lui est assigné sera désassigné'} automatiquement.` : ''}
      </p>
      {err && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={btnCancel}>Annuler</button>
        <button onClick={submit} disabled={saving} style={btnDanger}>
          {saving ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,77,0.5)',
      display: 'grid', placeItems: 'center', zIndex: 90, padding: 16,
    }}>
      <div className="modal-mobile" style={{
        background: 'var(--white)', borderRadius: 16, padding: 24, maxWidth: 460, width: '100%',
        boxShadow: '0 24px 48px rgba(11,31,77,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer', fontSize: 18 }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--white)', outline: 'none' }
const btnPrimary: React.CSSProperties = { background: 'var(--ink)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnCancel: React.CSSProperties = { background: 'var(--white)', color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { background: 'var(--red)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
