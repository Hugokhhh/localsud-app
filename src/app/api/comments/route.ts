import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { errorResponse } from '@/lib/utils'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/** POST - Créer un commentaire (client OU admin selon authorId) */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // FIX audit #1 : anti-spam — max 20 commentaires par IP / minute
    const ip = getClientIp(req)
    if (!rateLimit(`comment:${ip}`, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Trop de messages envoyés. Patientez un instant.' },
        { status: 429 }
      )
    }

    const { projectId, type, section, content, parentId } = await req.json()

    if (!projectId || !content || !section) {
      return NextResponse.json({ error: 'Page et message requis' }, { status: 400 })
    }
    // FIX audit #4 : limites de longueur pour protéger la BDD
    if (String(content).length > 5000) {
      return NextResponse.json({ error: 'Message trop long (5000 caractères max)' }, { status: 400 })
    }
    if (String(section).length > 200) {
      return NextResponse.json({ error: 'Nom de page trop long' }, { status: 400 })
    }

    // Vérifier que le client ne peut commenter QUE ses propres projets
    if (user.role === 'CLIENT') {
      const project = await prisma.project.findFirst({
        where: { id: projectId, client: { user: { id: user.id } } },
      })
      if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }
    if (user.role === 'COLLABORATOR') {
      const project = await prisma.project.findFirst({
        where: { id: projectId, client: { collaboratorId: user.id } },
      })
      if (!project) return NextResponse.json({ error: 'Projet non autorisé' }, { status: 403 })
    }

    // FIX audit #6 : si c'est une réponse, le parent doit appartenir au même projet
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { projectId: true },
      })
      if (!parent || parent.projectId !== projectId) {
        return NextResponse.json({ error: 'Commentaire parent invalide' }, { status: 400 })
      }
    }

    const comment = await prisma.comment.create({
      data: {
        projectId,
        authorId: user.id,
        type: type || 'MODIFICATION',
        section,
        content,
        parentId: parentId || null,
        status: 'OPEN',
      },
      include: { attachments: true },
    })

    // Si admin répond à un commentaire client OPEN, passer le parent en IN_PROGRESS
    if (user.role === 'ADMIN' && parentId) {
      await prisma.comment.update({
        where: { id: parentId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return NextResponse.json({ comment })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}

/** PATCH ?id=xxx - Changer le statut d'un retour (admin uniquement) */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'COLLABORATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { status } = await req.json()
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // FIX audit #1 : un collaborateur ne peut modifier QUE les retours
    // des clients qui lui sont assignés.
    const target = await prisma.comment.findUnique({
      where: { id },
      select: { projectId: true },
    })
    if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const { canAccessProject } = await import('@/lib/auth')
    const allowed = await canAccessProject(user.id, user.role, target.projectId)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const comment = await prisma.comment.update({
      where: { id },
      data: { status },
    })
    return NextResponse.json({ comment })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}

/** DELETE ?id=xxx - Supprimer un commentaire */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Client ne peut supprimer que ses propres commentaires
    if (user.role !== 'ADMIN' && comment.authorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.comment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
