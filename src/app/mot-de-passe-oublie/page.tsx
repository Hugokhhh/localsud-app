'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell, AuthBrand } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
                      background: 'var(--green-soft)', color: 'var(--green)',
                      display: 'grid', placeItems: 'center', fontSize: 22 }}>
          <i className="fa-solid fa-envelope-circle-check"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Email envoyé !</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 18, lineHeight: 1.5 }}>
          Si un compte existe avec <b>{email}</b>, vous recevrez un email contenant un lien pour réinitialiser votre mot de passe.
        </p>
        <Link href="/connexion"><button style={primaryBtn}>← Retour à la connexion</button></Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthBrand />
      <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
                    background: 'var(--yellow-soft)', color: 'var(--yellow-deep)',
                    display: 'grid', placeItems: 'center', fontSize: 22 }}>
        <i className="fa-solid fa-key"></i>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Mot de passe oublié ?</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
        Pas de panique. Entrez votre email et nous vous enverrons un lien pour le réinitialiser.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                 placeholder="contact@votre-entreprise.fr"
                 style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line)',
                          borderRadius: 10, fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
        </div>

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Envoi…' : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }}></i> Envoyer le lien</>}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)', marginTop: 14 }}>
        <Link href="/connexion" style={{ color: 'var(--ink)', fontWeight: 600 }}>← Retour à la connexion</Link>
      </div>
    </AuthShell>
  )
}

const primaryBtn: React.CSSProperties = {
  width: '100%', background: 'var(--ink)', color: 'white', border: 'none',
  padding: 13, borderRadius: 100, fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
  marginTop: 6, cursor: 'pointer',
}
