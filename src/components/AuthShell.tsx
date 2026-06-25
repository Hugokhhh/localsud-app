export function AuthShell({
  children,
  variant = 'light',
}: {
  children: React.ReactNode
  variant?: 'light' | 'dark'
}) {
  const isDark = variant === 'dark'
  return (
    <div className={isDark ? 'min-h-screen bg-ink text-white' : 'min-h-screen bg-bg text-ink'}
         style={{ padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'white',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'var(--line)'}`,
        borderRadius: 20, padding: '36px 32px',
      }}>
        {children}
      </div>
    </div>
  )
}

export function AuthBrand({ tag, dark }: { tag?: string; dark?: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: dark ? 'white' : 'var(--ink)' }}>
        Local<span style={{ color: dark ? 'var(--yellow)' : 'var(--yellow-deep)' }}>Sud</span>
      </div>
      {tag && (
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: dark ? 'var(--yellow)' : 'var(--ink-mute)',
                      fontWeight: 700, marginTop: 4 }}>
          {tag}
        </div>
      )}
    </div>
  )
}
