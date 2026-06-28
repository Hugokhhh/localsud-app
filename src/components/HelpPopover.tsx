'use client'

import { useEffect, useRef, useState } from 'react'

const SUPPORT_EMAIL = 'hugo@localsud.fr'
// WhatsApp : numéro au format international SANS le + ni espaces
const SUPPORT_WHATSAPP = '33661224978'
const SUPPORT_PHONE_DISPLAY = '06 61 22 49 78'

export function HelpPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer si on clique en dehors
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 24 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'var(--ink)', color: 'var(--white)',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, fontWeight: 600,
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span><i className="fa-solid fa-headset" style={{ marginRight: 8, color: 'var(--yellow)' }}></i> Besoin d'aide ?</span>
        <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: 11 }}></i>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 6,
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(11,31,77,0.12)',
          padding: 8,
          zIndex: 20,
        }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-mute)', fontWeight: 700,
            padding: '8px 10px 4px',
          }}>
            Contacter Hugo
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Besoin%20d%27aide%20-%20LocalSud`}
            onClick={() => setOpen(false)}
            style={helpItemStyle}
          >
            <span style={iconCircle('#E8EDFA', 'var(--ink)')}>
              <i className="fa-solid fa-envelope"></i>
            </span>
            <span style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Email</div>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{SUPPORT_EMAIL}</div>
            </span>
          </a>

          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Bonjour%20Hugo%2C%20j%27ai%20besoin%20d%27aide%20sur%20mon%20espace%20LocalSud.`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={helpItemStyle}
          >
            <span style={iconCircle('#E0F4EB', 'var(--green)')}>
              <i className="fa-brands fa-whatsapp"></i>
            </span>
            <span style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>WhatsApp</div>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{SUPPORT_PHONE_DISPLAY}</div>
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

const helpItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 10px', borderRadius: 10,
  textDecoration: 'none', cursor: 'pointer',
  transition: 'background 0.15s ease',
}

function iconCircle(bg: string, color: string): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: '50%',
    background: bg, color,
    display: 'grid', placeItems: 'center',
    fontSize: 14, flexShrink: 0,
  }
}
