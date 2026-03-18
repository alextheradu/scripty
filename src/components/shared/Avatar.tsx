import Image from 'next/image'

interface AvatarProps { src?: string | null; name: string; size?: number; color?: string }

export function Avatar({ src, name, size = 32, color }: AvatarProps) {
  const initials = (name ?? '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()

  const frameStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  }

  if (src) {
    return (
      <div style={frameStyle}>
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...frameStyle,
      background: color ?? '#e8b86d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: '#0f0f11',
      fontFamily: 'Syne, sans-serif',
    }}>
      {initials}
    </div>
  )
}
