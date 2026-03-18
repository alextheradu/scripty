'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { CSSProperties, ReactNode } from 'react'
import { Avatar } from './Avatar'

interface AppNavProps {
  currentScript?: { id: string; title: string }
  actions?: ReactNode
}

const navLinks = [
  {
    href: '/dashboard',
    label: 'Scripts',
    isActive: (pathname: string) => pathname.startsWith('/dashboard') || pathname.startsWith('/script/'),
  },
  {
    href: '/stats',
    label: 'Stats',
    isActive: (pathname: string) => pathname.startsWith('/stats'),
  },
  {
    href: '/settings',
    label: 'Settings',
    isActive: (pathname: string) => pathname.startsWith('/settings'),
  },
]

export function AppNav({ currentScript, actions }: AppNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userName = session?.user?.displayName ?? session?.user?.name ?? 'Account'

  return (
    <div style={shellStyle}>
      <div style={groupStyle}>
        <Link href="/dashboard" style={brandStyle}>
          <span style={brandMarkStyle}>S</span>
          <span>Scripty</span>
        </Link>

        <nav style={navStyle} aria-label="Primary">
          {navLinks.map(link => {
            const active = link.isActive(pathname)
            return (
              <Link key={link.href} href={link.href} style={active ? activeLinkStyle : navLinkStyle}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {currentScript && (
          <Link
            href={`/script/${currentScript.id}`}
            style={scriptPillStyle}
            title={currentScript.title}
          >
            <span style={scriptLabelStyle}>Editing</span>
            <span style={scriptTitleStyle}>{currentScript.title}</span>
          </Link>
        )}
      </div>

      <div style={actionsWrapStyle}>
        {actions}
        {session?.user && (
          <Link href="/settings" style={accountLinkStyle} title="Open settings">
            <div style={{ textAlign: 'right' }}>
              <div style={accountNameStyle}>{userName}</div>
              <div style={accountMetaStyle}>{session.user.email}</div>
            </div>
            <Avatar
              src={session.user.profileImage ?? session.user.image}
              name={userName}
              size={32}
            />
          </Link>
        )}
      </div>
    </div>
  )
}

const shellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap',
  padding: '0.85rem 1.25rem',
  borderBottom: '1px solid #2a2a30',
  background: '#141419',
}

const groupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  flexWrap: 'wrap',
}

const brandStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.55rem',
  color: '#e8e6de',
  textDecoration: 'none',
  fontFamily: '"Playfair Display", serif',
  fontSize: '1.2rem',
  flexShrink: 0,
}

const brandMarkStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #e8b86d, #b8904a)',
  color: '#0f0f11',
  fontWeight: 700,
  fontSize: '1rem',
}

const navStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  flexWrap: 'wrap',
}

const baseLinkStyle: CSSProperties = {
  borderRadius: 999,
  padding: '0.42rem 0.8rem',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.8rem',
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid #2a2a30',
  transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
}

const navLinkStyle: CSSProperties = {
  ...baseLinkStyle,
  color: '#8f8d86',
  background: '#17171c',
}

const activeLinkStyle: CSSProperties = {
  ...baseLinkStyle,
  color: '#0f0f11',
  background: '#e8b86d',
  border: '1px solid #e8b86d',
}

const scriptPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.55rem',
  maxWidth: 'min(42vw, 360px)',
  padding: '0.42rem 0.75rem',
  borderRadius: 999,
  border: '1px solid #2f2f37',
  background: '#1b1b21',
  textDecoration: 'none',
}

const scriptLabelStyle: CSSProperties = {
  color: '#e8b86d',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const scriptTitleStyle: CSSProperties = {
  color: '#e8e6de',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const actionsWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.6rem',
  flexWrap: 'wrap',
  marginLeft: 'auto',
}

const accountLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.6rem',
  textDecoration: 'none',
  padding: '0.2rem 0.2rem 0.2rem 0.55rem',
  borderRadius: 999,
  border: '1px solid #2a2a30',
  background: '#17171c',
}

const accountNameStyle: CSSProperties = {
  color: '#e8e6de',
  fontSize: '0.78rem',
  fontWeight: 600,
  lineHeight: 1.1,
  maxWidth: 160,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const accountMetaStyle: CSSProperties = {
  color: '#6b6a64',
  fontSize: '0.68rem',
  lineHeight: 1.1,
  maxWidth: 160,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
