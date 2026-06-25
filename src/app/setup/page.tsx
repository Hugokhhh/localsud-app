'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, AuthBrand } from '@/components/AuthShell'

export default function SetupPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [valid, setValid] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setValid(false); return }
    fetch(`/api/auth/register-password?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setValid(true); setEmail(data.user.email); setName(data.user.name)
        } else { setValid(false) }
      })
      .catch(() => setValid(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    const res = await fetch('/api/auth/register-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erreur'); return }
    setDone(true)
    setTimeout(() => router.push('/connexion'), 2000)
  }

  // Indicateur force du mot de passe
  const strength = (() => {
    let s = 0
    if (password.length >= 8) s++
    if (password.length >= 12) s++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return Math.min(s, 4)
  })()

  if (valid === null) return <AuthShell><div style={{ textAlign: 'center', padding: 40 }}>Chargement…</div></AuthShell>

  if (!valid) {
    return (
      <AuthShell>
        <AuthBrand />
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
                      background: 'var(--red-soft)', color: 'var(--red)',
                      display: 'grid', placeItems: 'center', fontSize: 24 }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Lien invalide ou expiré</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
          Le lien que vous avez utilisé n'est plus valide. Contactez votre interlocuteur LocalSud pour en recevoir un nouveau.
        </p>
        <Link href="/connexion"><button style={primaryBtn}>Retour à la connexion</button></Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell>
        <div style={{ width: 70, height: 70, margin: '0 auto 16px', borderRadius: '50%',
                      background: 'var(--green)', color: 'white',
                      display: 'grid', placeItems: 'center', fontSize: 28 }}>
          <i className="fa-solid fa-check"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Mot de passe créé !</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center' }}>Redirection vers la connexion…</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthBrand />
      <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
                    background: 'var(--ink)', color: 'var(--yellow)',
                    display: 'grid', placeItems: 'center', fontSize: 22 }}>
        <i className="fa-solid fa-lock"></i>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Créez votre mot de passe</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
        Bonjour <b>{name}</b> 👋<br/>Choisissez un mot de passe pour accéder à votre espace.
      </p>

      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <input type="email" value={email} readOnly
                 style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--ink-mute)' }} />
        </Field>
        <Field label="Nouveau mot de passe">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                 placeholder="••••••••" style={inputStyle} />
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 100,
                  background: i < strength ? (strength >= 3 ? 'var(--green)' : 'var(--yellow)') : 'var(--line)',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
              {strength <= 1 && 'Mot de passe trop faible'}
              {strength === 2 && 'Mot de passe correct'}
              {strength === 3 && 'Bon mot de passe'}
              {strength === 4 && 'Mot de passe fort 💪'}
            </div>
          </div>
        </Field>
        <Field label="Confirmer le mot de passe">
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                 placeholder="••••••••" style={inputStyle} />
        </Field>

        {error && (
          <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px',
                        borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i> {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...primaryBtn, background: 'var(--yellow)', color: 'var(--ink)' }}>
          {loading ? 'Création…' : <><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> Créer mon mot de passe</>}
        </button>
      </form>
    </AuthShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10,
  fontFamily: 'inherit', fontSize: 14, outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  width: '100%', background: 'var(--ink)', color: 'white', border: 'none',
  padding: 13, borderRadius: 100, fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
  marginTop: 6, cursor: 'pointer',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
