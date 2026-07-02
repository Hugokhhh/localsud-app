'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewClientButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    company: '', email: '', trade: '', city: '',
    projectType: 'VITRINE', totalPrice: '',
  })
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      // FIX audit #5 : on NE réactive PAS le bouton ici. Il reste désactivé
      // pendant l'animation de succès (1,8s) pour empêcher une double création.
      setTimeout(() => {
        setOpen(false); setSuccess(false); setSubmitting(false)
        setForm({ company: '', email: '', trade: '', city: '', projectType: 'VITRINE', totalPrice: '' })
        router.refresh()
      }, 1800)
    } catch (e: any) {
      alert(e.message || 'Erreur')
      setSubmitting(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: 'var(--ink)', color: 'white', border: 'none',
        padding: '11px 20px', borderRadius: 100, fontFamily: 'inherit',
        fontWeight: 600, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="fa-solid fa-plus"></i> Nouveau client
      </button>

      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }} style={{
          position: 'fixed', inset: 0, background: 'rgba(11,31,77,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 32,
            width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
          }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 70, height: 70, margin: '0 auto 16px', borderRadius: '50%',
                  background: 'var(--green)', color: 'white',
                  display: 'grid', placeItems: 'center', fontSize: 28,
                }}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Client créé !</div>
                <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
                  Un email d'invitation a été envoyé à <b>{form.email}</b>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Nouveau client</div>
                <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 22 }}>
                  Crée le compte client + son projet initial. Un email de connexion lui sera envoyé.
                </div>

                <form onSubmit={handleSubmit}>
                  <Field label="Nom de l'entreprise *">
                    <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                           placeholder="Ex: Maison Colette" style={inputStyle} />
                  </Field>
                  <Field label="Email du contact *">
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                           placeholder="contact@entreprise.fr" style={inputStyle} />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Type d'activité">
                      <input value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })}
                             placeholder="Restaurant, avocat..." style={inputStyle} />
                    </Field>
                    <Field label="Ville">
                      <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                             placeholder="Montpellier" style={inputStyle} />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Tarif total (€)">
                      <input type="number" value={form.totalPrice} onChange={e => setForm({ ...form, totalPrice: e.target.value })}
                             placeholder="2400" style={inputStyle} />
                    </Field>
                    <Field label="Type de projet">
                      <select value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })} style={inputStyle}>
                        <option value="VITRINE">Site vitrine</option>
                        <option value="LANDING">Landing page</option>
                        <option value="ECOMMERCE">E-commerce</option>
                        <option value="REFONTE">Refonte</option>
                      </select>
                    </Field>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="button" onClick={() => setOpen(false)} style={btnCancel}>Annuler</button>
                    <button type="submit" disabled={submitting} style={btnPrimary}>
                      {submitting ? 'Création…' : 'Créer le client'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--line)',
  borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
  background: 'var(--bg)', outline: 'none',
}
const btnCancel: React.CSSProperties = {
  flex: 1, padding: 12, borderRadius: 100, border: '1px solid var(--line)',
  background: 'white', color: 'var(--ink-soft)', fontFamily: 'inherit',
  fontWeight: 600, cursor: 'pointer', fontSize: 14,
}
const btnPrimary: React.CSSProperties = {
  flex: 1, padding: 12, borderRadius: 100, border: 'none',
  background: 'var(--ink)', color: 'white', fontFamily: 'inherit',
  fontWeight: 600, cursor: 'pointer', fontSize: 14,
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
