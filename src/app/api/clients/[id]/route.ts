import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const { company, email, trade, city, phone } = await req.json()
    const client = await prisma.client.findUnique({ where: { id: params.id }, include: { user: true } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (email && email.toLowerCase().trim() !== client.user.email) {
      const e = email.toLowerCase().trim()
      const dup = await prisma.user.findUnique({ where: { email: e } })
      if (dup && dup.id !== client.userId) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 })
      await prisma.user.update({ where: { id: client.userId }, data: { email: e } })
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
    console.error('[PATCH client]', e)
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    await prisma.user.delete({ where: { id: client.userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[DELETE client]', e)
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
