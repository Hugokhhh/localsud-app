import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { generateToken } from '@/lib/utils'
import { sendInvitationEmail } from '@/lib/emails'

/** GET - Liste de tous les clients (admin) */
export async function GET() {
  try {
    await requireAdmin()
    const clients = await prisma.client.findMany({
      include: {
        user: { select: { email: true, name: true } },
        projects: {
          include: {
            payments: true,
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ clients })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

/** POST - Créer un nouveau client + projet initial + envoi email d'invitation */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { company, email, trade, city, phone, projectType, totalPrice } = body

    if (!company || !email) {
      return NextResponse.json({ error: 'Entreprise et email requis' }, { status: 400 })
    }

    const emailNorm = String(email).toLowerCase().trim()
    // FIX audit #11 : validation basique du format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 400 })
    }

    // Création User + Client + Project
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        name: company,
        role: 'CLIENT',
        client: {
          create: {
            company,
            trade: trade || null,
            city: city || null,
            phone: phone || null,
            projects: {
              create: {
                name: `Site ${company}`,
                type: projectType || 'VITRINE',
                status: 'BRIEF',
                totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
              },
            },
          },
        },
      },
      include: { client: true },
    })

    // Token de création de mot de passe (7 jours)
    const setupToken = generateToken()
    await prisma.authToken.create({
      data: {
        token: setupToken,
        userId: user.id,
        type: 'SETUP',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Envoi de l'email d'invitation
    await sendInvitationEmail({ to: user.email, clientName: company, setupToken })

    return NextResponse.json({ success: true, clientId: user.client?.id })
  } catch (e: any) {
    console.error('[POST /api/clients]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
