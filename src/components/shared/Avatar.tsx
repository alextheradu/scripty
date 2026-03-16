import Image from 'next/image'

interface AvatarProps { src?: string | null; name: string; size?: number; color?: string }

export function Avatar({ src, name, size = 32, color }: AvatarProps) {
  const initials = (name ?? '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()
  if (src) return <Image src={src} alt={name} width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover' }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color ?? '#e8b86d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: '#0f0f11',
      fontFamily: 'Syne, sans-serif', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
