import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const user = await getCurrentUser() as any
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, company, trade, city, phone } = body

  // Validation basique
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  // Email unique check si modifié
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }
  }

  // Update User
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
    },
  })

  // Update Client si role CLIENT
  if (user.role === 'CLIENT' && (company !== undefined || trade !== undefined || city !== undefined || phone !== undefined)) {
    await prisma.client.update({
      where: { userId: user.id },
      data: {
        ...(company !== undefined && { company: company.trim() }),
        ...(trade !== undefined && { trade: trade?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    })
  }

  return NextResponse.json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email } })
}
