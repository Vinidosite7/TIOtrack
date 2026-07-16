import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'TioTrack',
  description: 'Dashboard de marketing — TikTok Ads, Meta Ads e vendas em tempo real',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TioTrack',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#05080F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} style={{ height: '100%' }}>
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="TioTrack"/>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"/>
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body style={{ margin: 0, padding: 0, height: '100%', background: '#05080F', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
