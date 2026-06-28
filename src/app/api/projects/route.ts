import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

/** POST - Créer un nouveau projet pour un clientId */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { clientId, name, type, totalPrice } = body

    if (!clientId || !name) {
      return NextResponse.json({ error: 'clientId et name requis' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const project = await prisma.project.create({
      data: {
        clientId,
        name: String(name).trim(),
        type: type || 'VITRINE',
        status: 'BRIEF',
        totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
      },
    })

    return NextResponse.json({ project })
  } catch (e: any) {
    console.error('[POST /api/projects]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** PATCH ?id=xxx - Modifier les infos d'un projet (admin ou collab assigné) */
export async function PATCH(req: NextRequest) {
  try {
    const { getCurrentUser, canAccessProject } = await import('@/lib/auth')
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const projectId = req.nextUrl.searchParams.get('id')
    if (!projectId) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const allowed = await canAccessProject(user.id, user.role, projectId)
    if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

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

/** DELETE ?id=xxx - Supprimer un projet (admin) */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
    const projectId = req.nextUrl.searchParams.get('id')
    if (!projectId) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: { include: { projects: true } } },
    })
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Sécurité : ne pas supprimer le dernier projet d'un client
    if (project.client.projects.length <= 1) {
      return NextResponse.json({
        error: "Impossible de supprimer le seul projet de ce client. Supprimez le client à la place.",
      }, { status: 400 })
    }

    await prisma.project.delete({ where: { id: projectId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
