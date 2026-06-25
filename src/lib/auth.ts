import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

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
  return session?.user as (typeof session extends null ? null : { id: string; email: string; name: string; role: 'ADMIN' | 'CLIENT' } | null)
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || (user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireClient() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
