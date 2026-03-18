import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/shared/SessionProvider'

export const metadata: Metadata = { title: 'Scripty', description: 'Collaborative screenwriting' }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><SessionProvider>{children}</SessionProvider></body>
    </html>
  )
}
