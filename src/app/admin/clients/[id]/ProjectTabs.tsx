'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Project = { id: string; name: string; status: string }

export function ProjectTabs({
  clientId,
  projects,
  activeId,
}: {
  clientId: string
  projects: Project[]
  activeId: string
}) {
  const router = useRouter()
  const [newOpen, setNewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canDelete = projects.length > 1

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--line-soft)', borderRadius: 12,
          overflowX: 'auto', maxWidth: '100%',
        }}>
          {projects.map(p => {
            const active = p.id === activeId
            return (
              <Link
                key={p.id}
                href={`/admin/clients/${clientId}?projectId=${p.id}`}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: active ? 'var(--white)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-soft)',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  boxShadow: active ? '0 1px 3px rgba(11,31,77,0.08)' : 'none',
                }}
              >
                {p.name}
              </Link>
            )
          })}
        </div>

        <button onClick={() => setNewOpen(true)} style={btnGhost} title="Ajouter un projet">
          <i className="fa-solid fa-plus"></i> Nouveau projet
        </button>

        {canDelete && (
          <button onClick={() => setDeleteOpen(true)} style={btnDanger} title="Supprimer ce projet">
            <i className="fa-solid fa-trash"></i>
          </button>
        )}
      </div>

      {newOpen && (
        <NewProjectModal
          clientId={clientId}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false)
            router.push(`/admin/clients/${clientId}?projectId=${id}`)
            router.refresh()
          }}
        />
      )}

      {deleteOpen && (
        <DeleteProjectModal
          projectId={activeId}
          projectName={projects.find(p => p.id === activeId)?.name || ''}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            const remaining = projects.find(p => p.id !== activeId)
            setDeleteOpen(false)
            router.push(`/admin/clients/${clientId}?projectId=${remaining?.id || ''}`)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function NewProjectModal({
  clientId, onClose, onCreated,
}: { clientId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('VITRINE')
  const [totalPrice, setTotalPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) { setErr('Nom requis'); return }
    setSaving(true); setErr(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, name: name.trim(), type, totalPrice: totalPrice || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onCreated(data.project.id)
    } catch (e: any) {
      setErr(e.message); setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Nouveau projet">
      <Field label="Nom du projet">
        <input value={name} onChange={e => setName(e.target.value)}
               placeholder="Refonte site, Nouveau e-commerce…" style={inputStyle} autoFocus />
      </Field>
      <Field label="Type">
        <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
          <option value="VITRINE">Vitrine</option>
          <option value="ECOMMERCE">E-commerce</option>
          <option value="REFONTE">Refonte</option>
          <option value="LANDING">Landing page</option>
        </select>
      </Field>
      <Field label="Montant total (€) — optionnel">
        <input type="number" value={totalPrice} onChange={e => setTotalPrice(e.target.value)}
               placeholder="2500" style={inputStyle} />
      </Field>
      {err && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={btnCancel}>Annuler</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving ? 'Création…' : 'Créer le projet'}
        </button>
      </div>
    </ModalShell>
  )
}

function DeleteProjectModal({
  projectId, projectName, onClose, onDeleted,
}: { projectId: string; projectName: string; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`/api/projects?id=${projectId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onDeleted()
    } catch (e: any) {
      setErr(e.message); setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Supprimer le projet">
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Tu vas supprimer définitivement <b>{projectName}</b>, incluant toutes ses échéances de
        paiement, ses retours et ses étapes. Cette action est <b>irréversible</b>.
      </p>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 12 }}>
        Pour confirmer, tape <b>SUPPRIMER</b> :
      </p>
      <input value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} autoFocus />
      {err && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={btnCancel}>Annuler</button>
        <button onClick={submit} disabled={saving || confirm !== 'SUPPRIMER'} style={btnDangerSolid}>
          {saving ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
      </div>
    </ModalShell>
  )
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,77,0.5)',
      display: 'grid', placeItems: 'center', zIndex: 90, padding: 16,
    }}>
      <div className="modal-mobile" style={{
        background: 'var(--white)', borderRadius: 16,
        padding: 24, maxWidth: 460, width: '100%',
        boxShadow: '0 24px 48px rgba(11,31,77,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--ink-mute)',
            cursor: 'pointer', fontSize: 18, padding: 4,
          }}><i className="fa-solid fa-xmark"></i></button>
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--line)', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)',
  background: 'var(--white)', outline: 'none',
}
const btnPrimary: React.CSSProperties = {
  background: 'var(--ink)', color: 'var(--white)', border: 'none',
  borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
}
const btnCancel: React.CSSProperties = {
  background: 'var(--white)', color: 'var(--ink-soft)',
  border: '1px solid var(--line)', borderRadius: 10,
  padding: '10px 18px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  background: 'var(--white)', color: 'var(--ink)',
  border: '1px solid var(--line)', borderRadius: 10,
  padding: '8px 14px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
}
const btnDanger: React.CSSProperties = {
  background: 'var(--white)', color: 'var(--red)',
  border: '1px solid var(--red-soft)', borderRadius: 10,
  padding: '8px 12px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
const btnDangerSolid: React.CSSProperties = {
  background: 'var(--red)', color: 'var(--white)', border: 'none',
  borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
}
