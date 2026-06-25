import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user as any

  // Routes publiques (auth)
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/connexion') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/reset') ||
    pathname.startsWith('/mot-de-passe-oublie') ||
    pathname.startsWith('/api/auth')

  if (isPublic) {
    // Si déjà connecté, rediriger vers l'espace approprié
    if (user && (pathname === '/' || pathname === '/connexion')) {
      const dest = user.role === 'ADMIN' ? '/admin' : '/espace'
      return NextResponse.redirect(new URL(dest, req.nextUrl))
    }
    return NextResponse.next()
  }

  // Routes protégées
  if (!user) {
    return NextResponse.redirect(new URL('/connexion', req.nextUrl))
  }

  // Isolation des rôles
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/espace', req.nextUrl))
  }
  if (pathname.startsWith('/espace') && user.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
