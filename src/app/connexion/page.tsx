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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Trim défensif : évite les espaces invisibles depuis les gestionnaires
    // de mots de passe (1Password, Chrome, iCloud Keychain) ou l'auto-fill mobile
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      setError('Email et mot de passe requis')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email: cleanEmail,
      password: cleanPassword,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou mot de passe incorrect')
    } else {
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
                 autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                 placeholder="contact@votre-entreprise.fr" style={inputStyle} />
        </Field>

        <Field label="Mot de passe">
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--ink-mute)', padding: 8, fontSize: 15, lineHeight: 1,
                display: 'grid', placeItems: 'center',
              }}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
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
