/**
 * Rate limiter maison en mémoire (sans dépendance externe).
 *
 * Limite le nombre de requêtes par clé (IP + action) sur une fenêtre de temps.
 * Suffisant pour un volume modéré. Note : en serverless, la mémoire n'est pas
 * partagée entre instances — ça reste une protection "best effort" qui bloque
 * l'essentiel des abus (spam d'emails, brute-force basique) sans infra externe.
 */

type Hit = { count: number; resetAt: number }
const store = new Map<string, Hit>()

// Nettoyage périodique pour éviter que la Map grossisse indéfiniment
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, hit] of store.entries()) {
    if (hit.resetAt < now) store.delete(key)
  }
}

/**
 * Retourne true si la requête est AUTORISÉE, false si la limite est atteinte.
 * @param key identifiant unique (ex: `reset:${ip}`)
 * @param limit nombre max de requêtes
 * @param windowMs fenêtre en millisecondes
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  cleanup()
  const now = Date.now()
  const hit = store.get(key)

  if (!hit || hit.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (hit.count >= limit) {
    return false
  }
  hit.count++
  return true
}

/** Extrait l'IP du client depuis les headers (Vercel/proxy) */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
