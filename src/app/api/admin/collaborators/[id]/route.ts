import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const collab = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true } })
    if (!collab || collab.role !== 'COLLABORATOR') {
      return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 })
    }
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const { safeMessage, status: errStatus } = errorResponse(e); return NextResponse.json({ error: safeMessage }, { status: errStatus })
  }
}
