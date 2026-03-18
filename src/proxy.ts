import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authSessionCookieName, useSecureAuthCookies } from '@/lib/auth'

const PROTECTED = [
  '/dashboard',
  '/script',
  '/stats',
  '/api/scripts',
  '/api/stats',
  '/api/characters',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: authSessionCookieName,
    secureCookie: useSecureAuthCookies,
  })
  if (!token) {
    const signIn = new URL('/api/auth/signin', req.url)
    signIn.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signIn)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/|favicon).*)'],
}
