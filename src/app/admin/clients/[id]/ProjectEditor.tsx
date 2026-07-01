'use client'


import { ClientActions } from './ClientActions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CommentThread } from '@/components/CommentThread'
import { formatPrice, formatFileSize, PROJECT_STATUS, PROJECT_TYPE } from '@/lib/utils'

type Payment = {
  id: string
  label: string
  amount: number
  status: string
  dueDate: string | null
  paidAt: string | null
  invoiceRef: string | null
  pdfUrl: string | null
  pdfName: string | null
  pdfSize: number | null
}

type Project = {
  id: string
  name: string
  type: string
  status: string
  mockupUrl: string | null
  documentsUrl: string | null
  totalPrice: number
  estimatedDelivery: string | null
  payments: Payment[]
}

export function ProjectEditor({
  client, project, comments, currentUser,
}: {
  client: { id: string; company: string; trade: string | null; city: string | null; email: string }
  project: Project
  comments: any[]
  currentUser: any
}) {
  const router = useRouter()
  const [data, setData] = useState({
    name: project.name,
    type: project.type,
    status: project.status,
    mockupUrl: project.mockupUrl || '',
    documentsUrl: project.documentsUrl || '',
    totalPrice: project.totalPrice,
    estimatedDelivery: project.estimatedDelivery ? project.estimatedDelivery.split('T')[0] : '',
  })
  const [payments, setPayments] = useState<Payment[]>(project.payments)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  function markDirty() { setDirty(true); setSaved(false) }

  async function handleSaveAll() {
    setSaving(true)
    try {
      // 1. Sauver les infos projet
      await fetch(`/api/projects?id=${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          status: data.status,
          mockupUrl: data.mockupUrl,
          documentsUrl: data.documentsUrl,
          totalPrice: data.totalPrice,
          estimatedDelivery: data.estimatedDelivery || null,
        }),
      })

      // 2. Sauver chaque paiement modifié
      for (const p of payments) {
        const isNew = p.id.startsWith('new-')
        if (isNew) {
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              label: p.label, amount: p.amount, status: p.status,
              dueDate: p.dueDate, invoiceRef: p.invoiceRef,
            }),
          })
        } else {
          await fetch(`/api/payments?id=${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: p.label, amount: p.amount, status: p.status,
              dueDate: p.dueDate, invoiceRef: p.invoiceRef,
            }),
          })
        }
      }

      setSaved(true); setDirty(false)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert(e.message || 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  function addPayment() {
    setPayments([...payments, {
      id: 'new-' + Date.now(),
      label: '', amount: 0, status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      paidAt: null, invoiceRef: null,
      pdfUrl: null, pdfName: null, pdfSize: null,
    }])
    markDirty()
  }

  async function removePayment(id: string) {
    if (!confirm('Supprimer cette échéance ?')) return
    if (!id.startsWith('new-')) {
      await fetch(`/api/payments?id=${id}`, { method: 'DELETE' })
    }
    setPayments(payments.filter(p => p.id !== id))
    router.refresh()
  }

  function updatePayment(id: string, patch: Partial<Payment>) {
    setPayments(payments.map(p => p.id === id ? { ...p, ...patch } : p))
    // On marque simplement comme "modifié" : la sauvegarde se fait via le bouton
    // "Enregistrer" (barre sticky). Plus de fetch immédiat + router.refresh() qui
    // écrasait les autres champs en cours d'édition.
    markDirty()
  }

  async function uploadPdf(paymentId: string, file: File) {
    if (file.type !== 'application/pdf') { alert('PDF uniquement'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 Mo'); return }
    if (paymentId.startsWith('new-')) {
      alert('Sauvegarde d\'abord l\'échéance avant de joindre un PDF')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/payments?id=${paymentId}`, { method: 'PUT', body: fd })
    const result = await res.json()
    if (!res.ok) { alert(result.error); return }
    setPayments(payments.map(p => p.id === paymentId ? {
      ...p, pdfUrl: result.payment.pdfUrl, pdfName: result.payment.pdfName, pdfSize: result.payment.pdfSize,
    } : p))
    router.refresh()
  }

  // Totaux dynamiques
  const totalSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const paidSum = payments.filter(p => p.status === 'PAID').reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const due = Math.max(0, Number(data.totalPrice) - paidSum)

  return (
    <div style={{ position: 'relative', paddingBottom: dirty ? 80 : 0 }}>
      {/* Bouton retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <Link href="/admin/clients" style={{
          width: 36, height: 36, borderRadius: 10, background: 'white',
          border: '1px solid var(--line)', display: 'grid', placeItems: 'center',
          color: 'var(--ink-soft)',
        }}>
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Retour à la liste des clients</div>
      </div>

      {/* Header projet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--yellow)', color: 'var(--ink)',
          display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18,
        }}>
          {client.company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
            {client.company}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
            {[client.trade, client.city, client.email].filter(Boolean).join(' · ')}</div></div><ClientActions client={{ id: client.id, company: client.company, email: client.email, trade: client.trade, city: client.city }} /></div>

      {/* INFORMATIONS PROJET */}
      <Section title="Informations du projet" icon="fa-circle-info">
        <Row>
          <Field label="Nom du projet">
            <input value={data.name} onChange={e => { setData({ ...data, name: e.target.value }); markDirty() }} style={input} />
          </Field>
          <Field label="Type">
            <select value={data.type} onChange={e => { setData({ ...data, type: e.target.value }); markDirty() }} style={input}>
              {Object.entries(PROJECT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Statut">
            <select value={data.status} onChange={e => { setData({ ...data, status: e.target.value }); markDirty() }} style={input}>
              {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Livraison estimée">
            <input type="date" value={data.estimatedDelivery} onChange={e => { setData({ ...data, estimatedDelivery: e.target.value }); markDirty() }} style={input} />
          </Field>
        </Row>
      </Section>

      {/* LIENS RESSOURCES */}
      <Section title="Liens des ressources client" icon="fa-link"
               subtitle="Ces liens apparaissent dans l'espace client">
        <LinkRow icon="fa-solid fa-image" iconBg="var(--blue-soft)" iconColor="var(--ink)"
                 label="Maquette" title="Lien de la maquette"
                 value={data.mockupUrl}
                 onChange={v => { setData({ ...data, mockupUrl: v }); markDirty() }} />
        <LinkRow icon="fa-solid fa-folder-open" iconBg="var(--green-soft)" iconColor="var(--green)"
                 label="Vos documents" title="Dossier Drive partagé"
                 value={data.documentsUrl}
                 onChange={v => { setData({ ...data, documentsUrl: v }); markDirty() }} />
      </Section>

      {/* RETOURS */}
      <Section title="Retours du client" icon="fa-comments"
               subtitle="Répondez et changez le statut de chaque retour">
        <CommentThread
          projectId={project.id}
          comments={comments}
          currentUser={currentUser}
          isAdmin={true}
        />
      </Section>

      {currentUser?.role !== 'COLLABORATOR' && (<>
      {/* FACTURATION */}
      <Section title="Facturation" icon="fa-file-invoice"
               subtitle="Modifiez les montants et marquez les paiements reçus">
        <div style={{ marginBottom: 22 }}>
          <label style={fieldLabel}>Montant total contractualisé (€)</label>
          <input type="number" value={data.totalPrice}
                 onChange={e => { setData({ ...data, totalPrice: parseFloat(e.target.value) || 0 }); markDirty() }}
                 style={{ ...input, fontSize: 22, fontWeight: 800, padding: '14px 16px' }} />
        </div>

        <label style={fieldLabel}>Échéances de paiement</label>

        {payments.map(p => (
          <div key={p.id} style={{
            background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 12, marginBottom: 8, padding: 12,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '24px 1.2fr 1fr 1fr 130px 32px', minWidth: 540,
              gap: 10, alignItems: 'center',
            }}>
              <i className="fa-solid fa-grip-vertical" style={{ color: 'var(--ink-mute)' }}></i>
              <input value={p.label} onChange={e => updatePayment(p.id, { label: e.target.value })}
                     placeholder="Libellé" style={smallInput} />
              <input
                type="text" inputMode="decimal" value={p.amount}
                onChange={e => {
                  const raw = e.target.value.replace(',', '.')
                  // n'accepte que chiffres et un point décimal
                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                    updatePayment(p.id, { amount: raw === '' ? 0 : Number(raw) })
                  }
                }}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                placeholder="Montant" style={smallInput} />
              <select value={p.status}
                      onChange={e => updatePayment(p.id, { status: e.target.value })}
                      style={smallInput}>
                <option value="PAID">✓ Payée</option>
                <option value="PENDING">⏳ En attente</option>
                <option value="OVERDUE">❗ En retard</option>
              </select>
              <input type="date" value={p.dueDate?.split('T')[0] || ''}
                     onChange={e => updatePayment(p.id, { dueDate: e.target.value })}
                     style={smallInput} />
              <button onClick={() => removePayment(p.id)}
                      style={{
                        background: 'transparent', border: 'none', color: 'var(--ink-mute)',
                        cursor: 'pointer', padding: 6, borderRadius: 6,
                      }}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>

            {/* PDF slot */}
            <div style={{ marginTop: 10, paddingLeft: 34 }}>
              {p.pdfUrl ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '8px 8px 8px 12px', background: 'white',
                  border: '1px solid var(--line)', borderRadius: 10,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--ink)',
                                color: 'var(--yellow)', display: 'grid', placeItems: 'center' }}>
                    <i className="fa-solid fa-file-pdf"></i>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.pdfName}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                      ✓ {formatFileSize(p.pdfSize || 0)} · Visible par le client
                    </div>
                  </div>
                  <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" style={pdfActionBtn}>
                    <i className="fa-solid fa-eye"></i>
                  </a>
                </div>
              ) : (
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', border: '1.5px dashed var(--line)',
                  borderRadius: 8, background: 'white', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
                }}>
                  <i className="fa-solid fa-file-arrow-up"></i> Joindre la facture PDF
                  <input type="file" accept="application/pdf"
                         onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(p.id, f) }}
                         style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>
        ))}

        <button onClick={addPayment} style={{
          width: '100%', padding: 12, border: '2px dashed var(--line)',
          background: 'transparent', borderRadius: 12, fontFamily: 'inherit',
          fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="fa-solid fa-plus"></i> Ajouter une échéance
        </button>

        {/* Totaux dynamiques */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          padding: 18, background: 'var(--ink)', color: 'white',
          borderRadius: 12, marginTop: 14,
        }}>
          <Total label="Total contractualisé" value={formatPrice(Number(data.totalPrice))} />
          <Total label="Déjà encaissé" value={formatPrice(paidSum)} color="var(--green)" />
          <Total label="Reste à encaisser" value={formatPrice(due)} color="var(--yellow)" />
        </div>
      </Section>
      </>)}

      {/* Barre sticky de sauvegarde */}
      {dirty && (
        <div style={{
          position: 'sticky', bottom: 20, background: 'var(--ink)', color: 'white',
          padding: '14px 22px', borderRadius: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 12px 32px rgba(11,31,77,0.25)', marginTop: 20,
        }}>
          <div style={{ fontSize: 13 }}>
            {saved ? <><i className="fa-solid fa-check" style={{ color: 'var(--green)', marginRight: 6 }}></i> Enregistré !</> : 'Modifications non enregistrées'}
          </div>
          <button onClick={handleSaveAll} disabled={saving} style={{
            background: 'var(--yellow)', color: 'var(--ink)', border: 'none',
            padding: '10px 22px', borderRadius: 100, fontFamily: 'inherit',
            fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>
            {saving ? 'Enregistrement…' : <><i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }}></i> Enregistrer</>}
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, subtitle, children }: { title: string; icon: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 24, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className={`fa-solid ${icon}`} style={{ color: 'var(--yellow-deep)' }}></i> {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function LinkRow({ icon, iconBg, iconColor, label, title, value, onChange }: {
  icon: string; iconBg: string; iconColor: string; label: string; title: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '48px 1fr 40px', gap: 12, alignItems: 'center',
      padding: 12, background: 'var(--bg)', border: '1px solid var(--line)',
      borderRadius: 12, marginBottom: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconColor,
        display: 'grid', placeItems: 'center', fontSize: 16,
      }}><i className={icon}></i></div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 6px' }}>{title}</div>
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
               placeholder="https://..." style={{
                 width: '100%', padding: '6px 10px', border: '1px solid var(--line)',
                 borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
                 background: 'white', outline: 'none',
               }} />
      </div>
      {value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: 'var(--ink)', color: 'white',
          display: 'grid', placeItems: 'center',
        }}>
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      ) : <div></div>}
    </div>
  )
}

function Total({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: color || 'white' }}>{value}</div>
    </div>
  )
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--line)',
  borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
  background: 'var(--bg)', outline: 'none',
}
const smallInput: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8,
  fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
  background: 'white', outline: 'none', width: '100%',
}
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6,
}
const pdfActionBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)',
  background: 'white', color: 'var(--ink-soft)',
  display: 'grid', placeItems: 'center', fontSize: 11,
}
