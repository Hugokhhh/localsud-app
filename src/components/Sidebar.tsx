'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { HelpPopover } from './HelpPopover'

type NavItem = { href: string; icon: string; label: string; badge?: number }

export function Sidebar({
  variant, user, items,
}: {
  variant: 'client' | 'admin' | 'collaborator'
  user: { name: string; subtitle?: string; initials: string }
  items: NavItem[]
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const isAdmin = variant === 'admin'
  const isCollab = variant === 'collaborator'
  const darkBg = isAdmin

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const accountHref = isAdmin ? '/admin/compte' : isCollab ? '/collab/compte' : '/espace/compte'

  if (isMobile) {
    return (
      <>
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: darkBg ? 'var(--ink)' : 'var(--white)',
          borderBottom: `1px solid ${darkBg ? 'var(--ink-2)' : 'var(--line)'}`,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={() => setDrawerOpen(true)} aria-label="Menu" style={{
            background: 'transparent', border: 'none',
            color: darkBg ? 'var(--white)' : 'var(--ink)',
            fontSize: 20, padding: 6, cursor: 'pointer',
          }}>
            <i className="fa-solid fa-bars"></i>
          </button>
          <div style={{
            fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
            color: darkBg ? 'var(--white)' : 'var(--ink)',
          }}>
            Local<em style={{ fontStyle: 'normal', color: darkBg ? 'var(--yellow)' : 'var(--yellow-deep)' }}>Sud</em>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--yellow)', color: 'var(--ink)',
            display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12,
          }}>{user.initials}</div>
        </header>

        {drawerOpen && (
          <>
            <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
            <aside className="drawer-panel" style={{
              background: darkBg ? 'var(--ink)' : 'var(--white)',
              padding: '20px 16px',
              display: 'flex', flexDirection: 'column',
            }}>
              <NavContent variant={variant} items={items} pathname={pathname} user={user}
                menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                accountHref={accountHref} onClose={() => setDrawerOpen(false)} />
            </aside>
          </>
        )}
      </>
    )
  }

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: darkBg ? 'var(--ink)' : 'var(--white)',
      borderRight: `1px solid ${darkBg ? 'var(--ink-2)' : 'var(--line)'}`,
      padding: '20px 16px',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, alignSelf: 'flex-start',
    }}>
      <NavContent variant={variant} items={items} pathname={pathname} user={user}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen} accountHref={accountHref} />
    </aside>
  )
}

function NavContent({
  variant, items, pathname, user, menuOpen, setMenuOpen, onClose, accountHref,
}: {
  variant: 'client' | 'admin' | 'collaborator'
  items: NavItem[]
  pathname: string
  user: { name: string; subtitle?: string; initials: string }
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  onClose?: () => void
  accountHref: string
}) {
  const isAdmin = variant === 'admin'
  const isCollab = variant === 'collaborator'
  const darkBg = isAdmin

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 24 }}>
        <div style={{
          fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
          color: darkBg ? 'var(--white)' : 'var(--ink)',
        }}>
          Local<em style={{ fontStyle: 'normal', color: darkBg ? 'var(--yellow)' : 'var(--yellow-deep)' }}>Sud</em>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer" style={{
            background: 'transparent', border: 'none',
            color: darkBg ? 'rgba(255,255,255,0.6)' : 'var(--ink-mute)',
            fontSize: 18, cursor: 'pointer', padding: 4,
          }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {isAdmin && (
        <Link href="/admin/clients" style={{
          background: 'var(--yellow)', color: 'var(--ink)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, fontWeight: 600,
        }}>
          <span><i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Nouveau client</span>
          <i className="fa-solid fa-arrow-right"></i>
        </Link>
      )}
      {variant === 'client' && <HelpPopover />}

      <div style={{
        fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: darkBg ? 'var(--yellow)' : 'var(--ink-mute)',
        fontWeight: 700, padding: '0 12px', marginBottom: 8,
      }}>
        {isAdmin ? 'Pilotage' : isCollab ? 'Espace collaborateur' : 'Espace client'}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/espace' && item.href !== '/collab' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={navItemStyle(darkBg, active)}>
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

      <div style={{
        marginTop: 'auto', padding: '12px 0 0',
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: `1px solid ${darkBg ? 'var(--ink-2)' : 'var(--line)'}`,
        position: 'relative',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--yellow)', color: 'var(--ink)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13,
        }}>{user.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: darkBg ? 'var(--white)' : 'var(--ink)' }}>{user.name}</div>
          {user.subtitle && (
            <div style={{ fontSize: 11, color: darkBg ? 'var(--yellow)' : 'var(--ink-mute)' }}>{user.subtitle}</div>
          )}
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          background: 'transparent', border: 'none',
          color: darkBg ? 'rgba(255,255,255,0.5)' : 'var(--ink-mute)',
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
            <Link href={accountHref} onClick={() => setMenuOpen(false)} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', textAlign: 'left',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none',
            }}>
              <i className="fa-solid fa-user-gear"></i> Mon compte
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/connexion' })} style={{
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
    </>
  )
}

function navItemStyle(darkBg: boolean, active: boolean): React.CSSProperties {
  if (darkBg) {
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
