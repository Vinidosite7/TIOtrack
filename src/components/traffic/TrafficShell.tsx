'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, ShieldCheck, Shield, Globe2, FileText, RadioTower } from 'lucide-react'

export const trafficTheme = {
  bg: '#0b0d18',
  card: 'rgba(22,26,44,.94)',
  border: 'rgba(170,176,235,.09)',
  text: '#eceefb',
  sub: '#9ea3c2',
  muted: '#666c8e',
  green: '#74d3ab',
  red: '#f0899b',
  amber: '#e8c27f',
  blue: '#a3a7f2',
  purple: '#a3a7f2',
  cyan: '#9fb6f5',
  mono: "'JetBrains Mono', ui-monospace, monospace",
  display: "var(--font-inter, Inter), Inter, sans-serif",
  sans: "var(--font-inter, Inter), Inter, sans-serif",
} as const

const tabs = [
  { href: '/traffic', label: 'Visão geral', icon: Activity },
  { href: '/traffic/live', label: 'Ao vivo', icon: Globe2 },
  { href: '/traffic/rules', label: 'Regras', icon: ShieldCheck },
  { href: '/traffic/security', label: 'Segurança', icon: Shield },
  { href: '/domains', label: 'Domínios', icon: RadioTower },
  { href: '/traffic/logs', label: 'Logs', icon: FileText },
]

export function TrafficShell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="shell-page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="tt-eyebrow">
            <span className="tt-status-dot hk-live-dot" style={{ background: '#74d3ab', boxShadow: '0 0 10px #74d3ab' }} />
            Traffic Center
          </div>
          <h1 className="tt-title" style={{ marginTop: 6 }}>{title}</h1>
          {subtitle && <p className="tt-cap" style={{ marginTop: 5, maxWidth: 820, fontSize: 12 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="tt-tabbar no-scrollbar" style={{ marginBottom: 16 }}>
        {tabs.map((tab) => {
          const active = tab.href === '/traffic' ? pathname === tab.href : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link key={tab.href} href={tab.href} className="tt-tab" data-active={active ? 'true' : 'false'}>
              <Icon size={14} />
              {tab.label}
            </Link>
          )
        })}
      </div>
      {children}
    </div>
  )
}

export function TrafficCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="tt-card" style={style}>{children}</div>
}
