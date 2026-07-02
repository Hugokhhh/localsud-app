import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { put, del } from '@vercel/blob'
import { errorResponse } from '@/lib/utils'

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

/** POST - Upload d'une pièce jointe pour un commentaire */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const commentId = formData.get('commentId') as string

    if (!file || !commentId) {
      return NextResponse.json({ error: 'file et commentId requis' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier > 10 Mo' }, { status: 400 })
    }
    // FIX audit #4 : n'accepter que les images et les PDF (bloque .html/.svg/.exe piégés)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé (images et PDF uniquement)' }, { status: 400 })
    }

    // Vérifier que le commentaire appartient au bon utilisateur (sauf admin)
    if (user.role !== 'ADMIN') {
      const c = await prisma.comment.findUnique({ where: { id: commentId } })
      if (!c || c.authorId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const blob = await put(`pieces-jointes/${commentId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    const attachment = await prisma.attachment.create({
      data: {
        commentId,
        url: blob.url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        isImage: file.type.startsWith('image/'),
      },
    })

    return NextResponse.json({ attachment })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}

/** DELETE ?id=xxx - Supprimer une pièce jointe */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser() as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const att = await prisma.attachment.findUnique({
      where: { id },
      include: { comment: true },
    })
    if (!att) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    if (user.role !== 'ADMIN' && att.comment.authorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try { await del(att.url) } catch (e) { console.error('Blob del error', e) }
    await prisma.attachment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
