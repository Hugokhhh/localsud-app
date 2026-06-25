import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

/** PATCH ?id=xxx - Modifier les infos d'un projet (admin) */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const projectId = req.nextUrl.searchParams.get('id')
    if (!projectId) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const body = await req.json()
    const data: any = {}

    if (body.name !== undefined) data.name = body.name
    if (body.type !== undefined) data.type = body.type
    if (body.status !== undefined) data.status = body.status
    if (body.mockupUrl !== undefined) data.mockupUrl = body.mockupUrl || null
    if (body.documentsUrl !== undefined) data.documentsUrl = body.documentsUrl || null
    if (body.totalPrice !== undefined) data.totalPrice = parseFloat(body.totalPrice)
    if (body.estimatedDelivery !== undefined) {
      data.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null
    }
    if (body.deliveredAt !== undefined) {
      data.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null
    }

    const updated = await prisma.project.update({ where: { id: projectId }, data })
    return NextResponse.json({ project: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
