'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'CLIENT'
  }
  client?: {
    company: string
    trade: string | null
    city: string | null
    phone: string | null
  } | null
}

export function AccountForm({ user, client }: Props) {
  const router = useRouter()
  const isAdmin = user.role === 'ADMIN'

  // ===== Infos =====
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [company, setCompany] = useState(client?.company || '')
  const [trade, setTrade] = useState(client?.trade || '')
  const [city, setCity] = useState(client?.city || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ===== Mot de passe =====
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveInfo() {
    setInfoSaving(true)
    setInfoMsg(null)
    try {
      const payload: any = { name, email }
      if (!isAdmin) {
        payload.company = company
        payload.trade = trade
        payload.city = city
        payload.phone = phone
      }
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setInfoMsg({ ok: true, text: 'Infos mises à jour ✓' })
      router.refresh()
    } catch (e: any) {
      setInfoMsg({ ok: false, text: e.message })
    } finally {
      setInfoSaving(false)
    }
  }

  async function savePwd() {
    setPwdSaving(true)
    setPwdMsg(null)
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: 'Les deux mots de passe ne correspondent pas' })
      setPwdSaving(false)
      return
    }
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setPwdMsg({ ok: true, text: 'Mot de passe changé ✓' })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e.message })
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      {/* ===== INFOS ===== */}
      <section className="section-card" style={cardStyle}>
        <div style={cardHeader}>
          <i className="fa-solid fa-user" style={{ color: 'var(--ink)' }}></i>
          <div>
            <div style={cardTitle}>Mes informations</div>
            <div style={cardSub}>Modifiez votre nom, email{!isAdmin && ' et coordonnées'}</div>
          </div>
        </div>

        <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nom complet">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        {!isAdmin && (
          <>
            <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="Entreprise">
                <input value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Métier">
                <input value={trade} onChange={e => setTrade(e.target.value)} placeholder="Restaurant, avocat…" style={inputStyle} />
              </Field>
            </div>
            <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="Ville">
                <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Téléphone">
                <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={saveInfo} disabled={infoSaving} style={btnPrimary}>
            {infoSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {infoMsg && (
            <span style={{ fontSize: 13, color: infoMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {infoMsg.text}
            </span>
          )}
        </div>
      </section>

      {/* ===== MOT DE PASSE ===== */}
      <section className="section-card" style={cardStyle}>
        <div style={cardHeader}>
          <i className="fa-solid fa-lock" style={{ color: 'var(--ink)' }}></i>
          <div>
            <div style={cardTitle}>Mot de passe</div>
            <div style={cardSub}>Au moins 8 caractères</div>
          </div>
        </div>

        <Field label="Mot de passe actuel">
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} style={inputStyle} autoComplete="current-password" />
        </Field>
        <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Field label="Nouveau mot de passe">
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={inputStyle} autoComplete="new-password" />
          </Field>
          <Field label="Confirmer">
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={inputStyle} autoComplete="new-password" />
          </Field>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={savePwd} disabled={pwdSaving || !currentPwd || !newPwd} style={btnPrimary}>
            {pwdSaving ? 'Changement…' : 'Changer le mot de passe'}
          </button>
          {pwdMsg && (
            <span style={{ fontSize: 13, color: pwdMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {pwdMsg.text}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: 24,
}
const cardHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
}
const cardTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: 'var(--ink)',
}
const cardSub: React.CSSProperties = {
  fontSize: 12, color: 'var(--ink-mute)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--line)', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)',
  background: 'var(--white)', outline: 'none',
}
const btnPrimary: React.CSSProperties = {
  background: 'var(--ink)', color: 'var(--white)',
  border: 'none', borderRadius: 10,
  padding: '10px 18px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
}
