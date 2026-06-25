import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Détection cookie de session NextAuth (production utilise __Secure- en HTTPS)
  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token')

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/connexion') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/reset') ||
    pathname.startsWith('/mot-de-passe-oublie') ||
    pathname.startsWith('/api/auth')

  // Si déjà connecté et sur la page de connexion → laisse la page se redirige côté serveur
  if (isPublic) {
    return NextResponse.next()
  }

  // Routes protégées : si pas de cookie → connexion
  if (!hasSession) {
    return NextResponse.redirect(new URL('/connexion', req.nextUrl))
  }

  // La vérification fine du rôle (admin vs client) est faite par les pages elles-mêmes
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
