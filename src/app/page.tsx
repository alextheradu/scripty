import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f11',
      color: '#e8e6de',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        borderBottom: '1px solid #2a2a30',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', color: '#e8b86d' }}>
          Scripty
        </span>
        <Link
          href="/api/auth/signin"
          style={{
            background: '#e8b86d',
            color: '#0f0f11',
            border: 'none',
            borderRadius: 6,
            padding: '0.45rem 1.25rem',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 700,
          color: '#e8e6de',
          marginBottom: '0.5rem',
          lineHeight: 1.1,
        }}>
          Write better scripts,
          <br />
          <span style={{ color: '#e8b86d', fontStyle: 'italic' }}>together.</span>
        </h1>

        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '1.125rem',
          color: '#6b6a64',
          maxWidth: 480,
          marginTop: '1.25rem',
          marginBottom: '2.5rem',
          lineHeight: 1.6,
        }}>
          A self-hosted, real-time collaborative screenwriting app.
          Proper screenplay formatting, live cursors, export to PDF, Fountain, and Final Draft.
        </p>

        <Link
          href="/api/auth/signin"
          style={{
            background: '#e8b86d',
            color: '#0f0f11',
            borderRadius: 6,
            padding: '0.75rem 2rem',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Get started with Google
        </Link>
      </main>

      <footer style={{
        borderTop: '1px solid #2a2a30',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        fontSize: '0.8125rem',
        color: '#6b6a64',
        fontFamily: 'Syne, sans-serif',
      }}>
        <span>Real-time collaboration</span>
        <span style={{ color: '#2a2a30' }}>·</span>
        <span>Final Draft formatting</span>
        <span style={{ color: '#2a2a30' }}>·</span>
        <span>PDF · Fountain · FDX export</span>
        <span style={{ color: '#2a2a30' }}>·</span>
        <span>Self-hosted</span>
      </footer>
    </div>
  )
}
