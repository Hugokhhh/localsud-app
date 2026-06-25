'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

type NavItem = { href: string; icon: string; label: string; badge?: number }

export function Sidebar({
  variant,
  user,
  items,
}: {
  variant: 'client' | 'admin'
  user: { name: string; subtitle?: string; initials: string }
  items: NavItem[]
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = variant === 'admin'

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: isAdmin ? 'var(--ink)' : 'var(--white)',
      borderRight: `1px solid ${isAdmin ? 'var(--ink-2)' : 'var(--line)'}`,
      padding: '20px 16px',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', marginBottom: 24 }}>
        <div style={{
          fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
          color: isAdmin ? 'var(--white)' : 'var(--ink)',
        }}>
          Local<em style={{ fontStyle: 'normal', color: isAdmin ? 'var(--yellow)' : 'var(--yellow-deep)' }}>Sud</em>
        </div>
      </div>

      {/* CTA */}
      {isAdmin ? (
        <Link href="/admin/clients" style={{
          background: 'var(--yellow)', color: 'var(--ink)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, fontWeight: 600,
        }}>
          <span><i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Nouveau client</span>
          <i className="fa-solid fa-arrow-right"></i>
        </Link>
      ) : (
        <div style={{
          background: 'var(--ink)', color: 'var(--white)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, fontWeight: 600,
        }}>
          <span><i className="fa-solid fa-headset" style={{ marginRight: 8, color: 'var(--yellow)' }}></i> Besoin d'aide ?</span>
        </div>
      )}

      {/* Nav label */}
      <div style={{
        fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: isAdmin ? 'var(--yellow)' : 'var(--ink-mute)',
        fontWeight: 700, padding: '0 12px', marginBottom: 8,
      }}>
        {isAdmin ? 'Pilotage' : 'Espace client'}
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/espace' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
                  style={navItemStyle(isAdmin, active)}>
              <i className={item.icon} style={{ width: 16, textAlign: 'center', fontSize: 14 }}></i>
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--red)', color: 'white',
                  fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700,
                }}>{item.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User bottom with menu */}
      <div style={{
        marginTop: 'auto', padding: '12px 0 0',
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: `1px solid ${isAdmin ? 'var(--ink-2)' : 'var(--line)'}`,
        position: 'relative',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--yellow)', color: 'var(--ink)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13,
        }}>{user.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isAdmin ? 'var(--white)' : 'var(--ink)' }}>{user.name}</div>
          {user.subtitle && (
            <div style={{ fontSize: 11, color: isAdmin ? 'var(--yellow)' : 'var(--ink-mute)' }}>{user.subtitle}</div>
          )}
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          background: 'transparent', border: 'none',
          color: isAdmin ? 'rgba(255,255,255,0.5)' : 'var(--ink-mute)',
          cursor: 'pointer', padding: '0 4px',
        }}>
          <i className="fa-solid fa-ellipsis-vertical"></i>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
            background: 'var(--white)', border: '1px solid var(--line)',
            borderRadius: 10, padding: 6, minWidth: 160,
            boxShadow: '0 8px 24px rgba(11,31,77,0.12)', zIndex: 10,
          }}>
            <button onClick={() => signOut({ callbackUrl: '/connexion' })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: 'transparent', textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, color: 'var(--red)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
              <i className="fa-solid fa-right-from-bracket"></i> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function navItemStyle(isAdmin: boolean, active: boolean): React.CSSProperties {
  if (isAdmin) {
    return {
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 10,
      color: active ? 'var(--ink)' : 'rgba(255,255,255,0.7)',
      background: active ? 'var(--yellow)' : 'transparent',
      fontSize: 13.5, fontWeight: active ? 700 : 500,
      textDecoration: 'none',
    }
  }
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 10,
    color: active ? 'var(--ink)' : 'var(--ink-soft)',
    background: active ? 'var(--bg)' : 'transparent',
    fontSize: 13.5, fontWeight: active ? 600 : 500,
    textDecoration: 'none',
  }
}
