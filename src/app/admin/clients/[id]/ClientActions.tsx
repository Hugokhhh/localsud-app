'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  client: {
    id: string
    company: string
    email: string
    trade: string | null
    city: string | null
    phone?: string | null
  }
}

export function ClientActions({ client }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company: client.company,
    email: client.email,
    trade: client.trade || '',
    city: client.city || '',
    phone: client.phone || '',
  })
  const [confirm, setConfirm] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/clients/' + client.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setEditOpen(false)
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/clients/' + client.id, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur') }
      router.push('/admin/clients')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditOpen(true)} style={btnSecondary}>
          <i className="fa-solid fa-pen" style={{ marginRight: 6 }}></i> Modifier
        </button>
        <button onClick={() => setDeleteOpen(true)} style={btnDanger}>
          <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i> Supprimer
        </button>
      </div>

      {editOpen && (
        <Backdrop onClose={() => !submitting && setEditOpen(false)}>
          <form onSubmit={handleSave} style={modal}>
            <h2 style={modalTitle}>Modifier le client</h2>
            <Field label="Nom de l'entreprise">
              <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={input} />
            </Field>
            <Field label="Email">
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Métier"><input value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })} style={input} /></Field>
              <Field label="Ville"><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={input} /></Field>
            </div>
            <Field label="Téléphone">
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={input} />
            </Field>
            {error && <div style={errorBox}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditOpen(false)} style={btnSecondary}>Annuler</button>
              <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </Backdrop>
      )}

      {deleteOpen && (
        <Backdrop onClose={() => !submitting && setDeleteOpen(false)}>
          <div style={modal}>
            <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'grid', placeItems: 'center', fontSize: 22 }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 style={{ ...modalTitle, textAlign: 'center' }}>Supprimer ce client ?</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 18, lineHeight: 1.5 }}>
              Cette action est <strong>irréversible</strong>. Le compte de <strong>{client.company}</strong>, son projet, ses retours, paiements et fichiers seront supprimés définitivement.
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
              Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
            </p>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SUPPRIMER" style={input} autoFocus />
            {error && <div style={errorBox}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={submitting} style={btnSecondary}>Annuler</button>
              <button onClick={handleDelete} disabled={submitting || confirm !== 'SUPPRIMER'} style={{ ...btnDanger, opacity: confirm !== 'SUPPRIMER' ? 0.5 : 1 }}>
                {submitting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </Backdrop>
      )}
    </>
  )
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,77,0.45)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const modal: React.CSSProperties = { background: 'white', padding: 28, borderRadius: 18 }
const modalTitle: React.CSSProperties = { fontSize: 20, fontWeight: 800, marginBottom: 16, color: 'var(--ink)' }
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { background: 'var(--ink)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const btnSecondary: React.CSSProperties = { background: 'white', color: 'var(--ink)', border: '1px solid var(--line)', padding: '10px 16px', borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const btnDanger: React.CSSProperties = { background: '#DC2626', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const errorBox: React.CSSProperties = { background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginTop: 10 }
