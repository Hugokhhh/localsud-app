import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await getCurrentUser() as any
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !dbUser.passwordHash) {
    return NextResponse.json({ error: 'Compte invalide' }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ ok: true })
}
