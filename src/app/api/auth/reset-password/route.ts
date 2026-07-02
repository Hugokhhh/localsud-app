import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/utils'
import { sendResetPasswordEmail } from '@/lib/emails'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/** POST - Demander un reset (envoyer email) */
export async function POST(req: NextRequest) {
  // FIX audit #1 : anti-spam — max 3 demandes de reset par IP / 15 min
  const ip = getClientIp(req)
  if (!rateLimit(`reset:${ip}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })

  // Pour ne pas révéler si l'email existe, on renvoie toujours success
  if (!user) return NextResponse.json({ success: true })

  // Invalider les tokens RESET précédents non utilisés
  await prisma.authToken.updateMany({
    where: { userId: user.id, type: 'RESET', usedAt: null },
    data: { usedAt: new Date() },
  })

  // Créer un nouveau token (1h)
  const token = generateToken()
  await prisma.authToken.create({
    data: {
      token,
      userId: user.id,
      type: 'RESET',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  await sendResetPasswordEmail({ to: user.email, name: user.name, resetToken: token })

  return NextResponse.json({ success: true })
}

/** GET ?token=xxx - Vérifier un token de reset */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false }, { status: 400 })

  const authToken = await prisma.authToken.findUnique({ where: { token } })
  if (!authToken || authToken.type !== 'RESET' || authToken.usedAt || authToken.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré' }, { status: 400 })
  }
  return NextResponse.json({ valid: true })
}

/** PATCH - Appliquer le nouveau mot de passe */
export async function PATCH(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const authToken = await prisma.authToken.findUnique({ where: { token } })
  if (!authToken || authToken.type !== 'RESET' || authToken.usedAt || authToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: authToken.userId }, data: { passwordHash } }),
    prisma.authToken.update({ where: { id: authToken.id }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ success: true })
}
