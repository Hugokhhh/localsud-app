import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

/** PATCH - Modifier les infos d'un client */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { company, email, trade, city, phone } = body

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { user: true },
    })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (email && email.toLowerCase().trim() !== client.user.email) {
      const emailNorm = String(email).toLowerCase().trim()
      const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
      if (existing && existing.id !== client.userId) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
      }
      await prisma.user.update({ where: { id: client.userId }, data: { email: emailNorm } })
    }

    if (company && company !== client.user.name) {
      await prisma.user.update({ where: { id: client.userId }, data: { name: company } })
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        company: company ?? client.company,
        trade: trade !== undefined ? (trade || null) : client.trade,
        city: city !== undefined ? (city || null) : client.city,
        phone: phone !== undefined ? (phone || null) : client.phone,
      },
    })
    return NextResponse.json({ success: true, client: updated })
  } catch (e: any) {
    console.error('[PATCH /api/clients/[id]]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** DELETE - Supprimer un client et toutes ses données associées */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Suppression du User → cascade vers Client → Projects → Payments → Comments → Attachments
    await prisma.user.delete({ where: { id: client.userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[DELETE /api/clients/[id]]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
