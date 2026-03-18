import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './db'

export const useSecureAuthCookies =
  process.env.NEXTAUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production'

export const authSessionCookieName = useSecureAuthCookies
  ? '__Secure-scripty.session-token'
  : 'scripty.session-token'

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()
const oauthCookieSameSite = useSecureAuthCookies ? 'none' : 'lax'

export const authOptions: NextAuthOptions = {
  // No adapter — we handle User + Account creation manually in signIn to prevent
  // cross-account merging bugs that occur with @auth/prisma-adapter + JWT strategy.
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: authSessionCookieName,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureAuthCookies,
      },
    },
    state: {
      name: `${useSecureAuthCookies ? '__Secure-' : ''}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: '/',
        secure: useSecureAuthCookies,
        maxAge: 900,
      },
    },
    pkceCodeVerifier: {
      name: `${useSecureAuthCookies ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: '/',
        secure: useSecureAuthCookies,
        maxAge: 900,
      },
    },
    nonce: {
      name: `${useSecureAuthCookies ? '__Secure-' : ''}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: '/',
        secure: useSecureAuthCookies,
        maxAge: 900,
      },
    },
    callbackUrl: {
      name: `${useSecureAuthCookies ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: '/',
        secure: useSecureAuthCookies,
        maxAge: 900,
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return '/not-invited'
      const email = user.email.toLowerCase()

      // Gate: admin is always allowed. Others need a DB invite.
      if (email !== ADMIN_EMAIL) {
        const invite = await prisma.invite.findUnique({ where: { email } })
        if (!invite) return '/not-invited'
        // Mark invite as used on first sign-in
        if (!invite.usedAt) {
          await prisma.invite.update({ where: { email }, data: { usedAt: new Date() } })
        }
      }

      // Upsert the User row by email (never by id coming from OAuth — that's the bug).
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          // Keep name/image in sync with Google profile on every sign-in
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          emailVerified: new Date(),
        },
        create: {
          email,
          name: user.name ?? null,
          image: user.image ?? null,
          emailVerified: new Date(),
        },
      })

      // Upsert the Account row, linked to the correct User (by our DB id, not Google's).
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        update: {
          access_token: account.access_token ?? null,
          refresh_token: account.refresh_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state: (account.session_state as string | null | undefined) ?? null,
        },
        create: {
          userId: dbUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token ?? null,
          refresh_token: account.refresh_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state: (account.session_state as string | null | undefined) ?? null,
        },
      })

      // Attach our DB id onto the user object so the jwt callback receives it.
      user.id = dbUser.id

      return true
    },

    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },

    async jwt({ token, user, trigger }) {
      // On first sign-in, user.id is our DB cuid (set above in signIn).
      if (user) token.id = user.id

      // Refresh displayName/profileImage from DB on sign-in or explicit session update.
      if (trigger === 'update' || user) {
        const userId = (token.id ?? user?.id) as string | undefined
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, profileImage: true },
          })
          if (dbUser) {
            token.displayName = dbUser.displayName ?? undefined
            token.profileImage = dbUser.profileImage ?? undefined
          }
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.displayName = token.displayName as string | undefined
        session.user.profileImage = token.profileImage as string | undefined
      }
      return session
    },
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string
      displayName?: string
      profileImage?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    displayName?: string
    profileImage?: string
  }
}

const ROLE_RANK: Record<string, number> = { viewer: 0, editor: 1, admin: 2 }

export function roleAtLeast(actual: string, required: string): boolean {
  return (ROLE_RANK[actual] ?? -1) >= (ROLE_RANK[required] ?? 0)
}
