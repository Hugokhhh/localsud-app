import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

/** Erreur HTTP avec code de statut, pour distinguer 401/403 des vraies erreurs 500 */
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }
}


export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/connexion',
    error: '/connexion',
  },
  providers: [
    Credentials({
      name: 'Email & mot de passe',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase().trim() },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
})

// Helpers
export async function getCurrentUser() {
  const session = await auth()
  return session?.user as (typeof session extends null ? null : { id: string; email: string; name: string; role: 'ADMIN' | 'CLIENT' | 'COLLABORATOR' } | null)
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) throw new HttpError(401, 'Non authentifié')
  if ((user as any).role !== 'ADMIN') throw new HttpError(403, 'Accès réservé à l\'administrateur')
  return user
}

export async function requireClient() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}


/** Vérifie qu'un user peut accéder à un client (admin ou collab assigné) */
export async function canAccessClient(userId: string, role: string, clientId: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  if (role !== 'COLLABORATOR') return false
  const { prisma } = await import('./prisma')
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { collaboratorId: true },
  })
  return client?.collaboratorId === userId
}

export async function canAccessProject(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  if (role !== 'COLLABORATOR') return false
  const { prisma } = await import('./prisma')
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { client: { select: { collaboratorId: true } } },
  })
  return project?.client.collaboratorId === userId
}
