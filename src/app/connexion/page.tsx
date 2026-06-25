'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, AuthBrand } from '@/components/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', {
      email, password, redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou mot de passe incorrect')
    } else {
      // Redirection — l'utilisateur est routé selon son rôle par le middleware
      router.push('/')
      router.refresh()
    }
  }

  return (
    <AuthShell>
      <AuthBrand tag="Espace client" />
      <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Bon retour !</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 24 }}>
        Connectez-vous pour suivre votre projet
      </p>

      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                 placeholder="contact@votre-entreprise.fr" style={inputStyle} />
        </Field>
        <Field label="Mot de passe">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                 placeholder="••••••••" style={inputStyle} />
        </Field>

        {error && (
          <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px',
                        borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i> {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Connexion…' : <>Se connecter <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }}></i></>}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)', marginTop: 14 }}>
        <Link href="/mot-de-passe-oublie" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          Mot de passe oublié ?
        </Link>
      </div>
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
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
