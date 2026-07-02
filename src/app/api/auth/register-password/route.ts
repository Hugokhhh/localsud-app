import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { errorResponse } from '@/lib/utils'

/** GET ?token=xxx - Vérifier la validité d'un token de création de mot de passe */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, error: 'Token manquant' }, { status: 400 })

  const authToken = await prisma.authToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!authToken || authToken.type !== 'SETUP' || authToken.usedAt || authToken.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré' }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    user: { email: authToken.user.email, name: authToken.user.name },
  })
}

/** POST - Définir le mot de passe pour la première fois */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const authToken = await prisma.authToken.findUnique({ where: { token } })

    if (!authToken || authToken.type !== 'SETUP' || authToken.usedAt || authToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
