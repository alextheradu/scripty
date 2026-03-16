export default function NotInvited() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f11',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', color: '#e8e6de',
    }}>
      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', marginBottom: '1rem', color: '#e8b86d' }}>
        Scripty
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#6b6a64', marginBottom: '0.5rem' }}>
        You&apos;re not on the list.
      </p>
      <p style={{ color: '#6b6a64', fontSize: '0.875rem' }}>
        Ask the owner to add your Google account email to the allowlist.
      </p>
      <a href="/api/auth/signout" style={{ marginTop: '2rem', color: '#e8b86d', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Sign out
      </a>
    </div>
  )
}
