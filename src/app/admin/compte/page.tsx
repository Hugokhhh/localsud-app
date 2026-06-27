import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AccountForm } from '@/components/AccountForm'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role !== 'ADMIN') redirect('/espace/compte')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700, marginBottom: 6 }}>
          Administration
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Mon compte</h1>
      </div>
      <AccountForm user={{ id: user.id, name: user.name, email: user.email, role: 'ADMIN' }} />
    </div>
  )
}
