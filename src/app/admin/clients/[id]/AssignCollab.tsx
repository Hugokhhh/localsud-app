'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Collab = { id: string; name: string; email: string }

export function AssignCollab({
  clientId, currentCollabId, collaborators,
}: {
  clientId: string
  currentCollabId: string | null
  collaborators: Collab[]
}) {
  const router = useRouter()
  const [value, setValue] = useState(currentCollabId || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(newId: string) {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: newId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMsg('✓ Mis à jour')
      router.refresh()
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) { setMsg(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '12px 16px', background: 'var(--blue-soft)',
      borderRadius: 12, marginBottom: 16,
    }}>
      <i className="fa-solid fa-user-tie" style={{ color: 'var(--ink)', fontSize: 14 }}></i>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Collaborateur assigné :</span>
      <select value={value} onChange={e => { setValue(e.target.value); save(e.target.value) }} disabled={saving} style={{
        padding: '6px 10px', borderRadius: 8,
        border: '1px solid var(--line)', background: 'var(--white)',
        fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)',
        flex: 1, minWidth: 180,
      }}>
        <option value="">— Aucun (admin uniquement) —</option>
        {collaborators.map(c => (
          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
        ))}
      </select>
      {msg && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{msg}</span>}
    </div>
  )
}
