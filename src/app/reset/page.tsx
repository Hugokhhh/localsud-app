'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, AuthBrand } from '@/components/AuthShell'

export default function ResetPageWrapper() {
  return (
    <Suspense fallback={<AuthShell><div style={{ textAlign: 'center', padding: 40 }}>Chargement…</div></AuthShell>}>
      <ResetPage />
    </Suspense>
  )
}

function ResetPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [valid, setValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setValid(false); return }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then(r => r.json()).then(d => setValid(d.valid))
      .catch(() => setValid(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError('Mot de passe trop court (min 8 caractères)'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); return }
    setDone(true)
    setTimeout(() => router.push('/connexion'), 1800)
  }

  if (valid === null) return <AuthShell><div style={{ textAlign: 'center', padding: 40 }}>Chargement…</div></AuthShell>

  if (!valid) {
    return (
      <AuthShell>
        <AuthBrand />
        <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Lien expiré</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 20 }}>
          Le lien de réinitialisation est invalide ou expiré.
        </p>
        <Link href="/mot-de-passe-oublie"><button style={primaryBtn}>Demander un nouveau lien</button></Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell>
        <div style={{ width: 70, height: 70, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 28 }}>
          <i className="fa-solid fa-check"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }}>Mot de passe modifié !</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginTop: 8 }}>Redirection…</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthBrand />
      <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Nouveau mot de passe</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 24 }}>
        Choisissez un nouveau mot de passe pour votre compte
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Nouveau mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Confirmation</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" style={inputStyle} />
        </div>
        {error && (
          <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{error}</div>
        )}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Modification…' : 'Modifier mon mot de passe'}
        </button>
      </form>
    </AuthShell>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, outline: 'none' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }
const primaryBtn: React.CSSProperties = { width: '100%', background: 'var(--ink)', color: 'white', border: 'none', padding: 13, borderRadius: 100, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', marginTop: 6, cursor: 'pointer' }
