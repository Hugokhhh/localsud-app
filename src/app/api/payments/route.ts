import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { put, del } from '@vercel/blob'

/** POST - Créer une échéance (admin) */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { projectId, label, amount, status, dueDate, invoiceRef, order } = await req.json()
    if (!projectId || !label || amount === undefined) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    const payment = await prisma.payment.create({
      data: {
        projectId,
        label,
        amount: parseFloat(amount),
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
        invoiceRef: invoiceRef || null,
        order: order || 0,
      },
    })
    return NextResponse.json({ payment })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** PATCH ?id=xxx - Modifier une échéance (admin) */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const body = await req.json()
    const data: any = {}
    if (body.label !== undefined) data.label = body.label
    if (body.amount !== undefined) data.amount = parseFloat(body.amount)
    if (body.status !== undefined) {
      data.status = body.status
      // Auto-set paidAt si on passe en PAID
      data.paidAt = body.status === 'PAID' ? new Date() : null
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.invoiceRef !== undefined) data.invoiceRef = body.invoiceRef || null
    if (body.order !== undefined) data.order = body.order

    const payment = await prisma.payment.update({ where: { id }, data })
    return NextResponse.json({ payment })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** DELETE ?id=xxx - Supprimer une échéance (admin) */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    // Supprimer le PDF du blob si présent
    const payment = await prisma.payment.findUnique({ where: { id } })
    if (payment?.pdfUrl) {
      try { await del(payment.pdfUrl) } catch (e) { console.error('Blob delete error:', e) }
    }

    await prisma.payment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** PUT ?id=xxx - Upload PDF de facture (admin) */
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Seuls les PDF sont acceptés' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le PDF ne doit pas dépasser 10 Mo' }, { status: 400 })
    }

    // Supprimer l'ancien PDF si présent
    const existing = await prisma.payment.findUnique({ where: { id } })
    if (existing?.pdfUrl) {
      try { await del(existing.pdfUrl) } catch (e) { console.error('Blob delete error:', e) }
    }

    // Upload sur Vercel Blob
    const blob = await put(`factures/${id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        pdfUrl: blob.url,
        pdfName: file.name,
        pdfSize: file.size,
      },
    })

    return NextResponse.json({ payment })
  } catch (e: any) {
    console.error('[PUT /api/payments]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
