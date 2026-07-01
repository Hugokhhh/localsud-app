import crypto from 'crypto'

/** Formate un prix en euros (français) */
export function formatPrice(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

/** Formate une date au format français court (12.06.2026) */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
}

/** Taille de fichier lisible (1.4 Mo, 142 Ko, etc.) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

/** Temps relatif court ("il y a 2h", "hier", "il y a 3j") */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'à l\'instant'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days}j`
  return formatDate(d)
}

/** Calcule les totaux d'un projet : total facturé, payé, restant, progression */
export function computeBilling(payments: { amount: any; status: string }[]) {
  let total = 0, paid = 0
  payments.forEach(p => {
    const amount = typeof p.amount === 'object' && p.amount !== null
      ? parseFloat(p.amount.toString())
      : parseFloat(String(p.amount))
    total += amount
    if (p.status === 'PAID') paid += amount
  })
  const remaining = Math.max(0, total - paid)
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0
  return { total, paid, remaining, progress }
}

/** Génère un token aléatoire sécurisé (pour création/reset mdp) */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Mention TVA non applicable (auto-entrepreneur) */
export const TVA_MENTION = 'TVA non applicable, art. 293 B du CGI'

/** Types et statuts de commentaires (labels FR) */
export const COMMENT_TYPES = {
  MODIFICATION: { label: 'Modification', color: 'red', emoji: '🔴' },
  QUESTION:     { label: 'Question',     color: 'blue', emoji: '🔵' },
  VALIDATION:   { label: 'Validation',   color: 'green', emoji: '🟢' },
  IDEA:         { label: 'Idée',         color: 'yellow', emoji: '🟡' },
} as const

export const COMMENT_STATUS = {
  OPEN:        { label: 'À traiter', color: 'red',    icon: 'fa-circle-exclamation' },
  IN_PROGRESS: { label: 'En cours',  color: 'yellow', icon: 'fa-spinner' },
  RESOLVED:    { label: 'Résolu',    color: 'green',  icon: 'fa-check' },
} as const

/** Statuts de projet (labels FR) */
export const PROJECT_STATUS = {
  BRIEF:       { label: 'Brief',        color: 'gray' },
  MAQUETTE:    { label: 'Maquette',     color: 'yellow' },
  RETOURS:     { label: 'Retours',      color: 'red' },
  INTEGRATION: { label: 'Intégration',  color: 'blue' },
  ONLINE:      { label: 'En ligne',     color: 'green' },
  ARCHIVED:    { label: 'Archivé',      color: 'gray' },
} as const

export const PROJECT_TYPE = {
  VITRINE:   'Site vitrine',
  LANDING:   'Landing page',
  ECOMMERCE: 'E-commerce',
  REFONTE:   'Refonte',
} as const

/** Calcule les initiales d'un nom (max 2 caractères) */
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}


/** Normalise un lien externe : ajoute https:// s'il manque le protocole.
 *  Évite le 404 quand un admin saisit "exemple.fr" au lieu de "https://exemple.fr". */
export function externalUrl(url: string | null | undefined): string {
  if (!url) return '#'
  const trimmed = url.trim()
  if (!trimmed) return '#'
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return trimmed  // lien interne
  return 'https://' + trimmed
}
