import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'

const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return '/not-invited'
      if (allowedEmails.length && !allowedEmails.includes(user.email.toLowerCase())) {
        return '/not-invited'
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
}

declare module 'next-auth' {
  interface Session {
    user: { id: string; name: string; email: string; image?: string }
  }
}

const ROLE_RANK: Record<string, number> = { viewer: 0, editor: 1, admin: 2 }

export function roleAtLeast(actual: string, required: string): boolean {
  return (ROLE_RANK[actual] ?? -1) >= (ROLE_RANK[required] ?? 0)
}
