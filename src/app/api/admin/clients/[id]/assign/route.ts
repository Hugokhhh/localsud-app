import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const { collaboratorId } = await req.json()
    if (collaboratorId) {
      const collab = await prisma.user.findUnique({
        where: { id: collaboratorId }, select: { role: true },
      })
      if (!collab || collab.role !== 'COLLABORATOR') {
        return NextResponse.json({ error: 'Collaborateur invalide' }, { status: 400 })
      }
    }
    await prisma.client.update({
      where: { id: params.id },
      data: { collaboratorId: collaboratorId || null },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
