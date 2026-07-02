import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { generateToken, errorResponse } from '@/lib/utils'
import { sendCollaboratorInvitationEmail } from '@/lib/emails'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const collabs = await prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      include: { _count: { select: { assignedClients: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ collaborators: collabs.map(c => ({
      id: c.id, name: c.name, email: c.email,
      clientCount: c._count.assignedClients,
      createdAt: c.createdAt.toISOString(),
    })) })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { name, email } = await req.json()
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
    }
    const emailNorm = String(email).toLowerCase().trim()
    // FIX audit #11 : validation basique du format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
    if (existing) return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 400 })

    const user = await prisma.user.create({
      data: { email: emailNorm, name: name.trim(), role: 'COLLABORATOR' },
    })
    const token = generateToken()
    await prisma.authToken.create({
      data: {
        userId: user.id, token, type: 'SETUP',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    try {
      await sendCollaboratorInvitationEmail({ to: emailNorm, collaboratorName: name.trim(), setupToken: token })
    } catch (e) { console.error('[Email collab]', e) }
    return NextResponse.json({ success: true, collaboratorId: user.id })
  } catch (e: any) {
    console.error('[POST /api/admin/collaborators]', e)
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
