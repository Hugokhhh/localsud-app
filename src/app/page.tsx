import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/connexion')
  if (user.role === 'ADMIN') redirect('/admin')
  redirect('/espace')
}
