'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, ShoppingCart, Package, ShieldCheck, Settings } from 'lucide-react'

const tabs = [
  { href: '/overview', icon: LayoutDashboard, label: 'Home', color: '#a3a7f2' },
  { href: '/campanhas', icon: TrendingUp, label: 'Ads', color: '#a3a7f2' },
  { href: '/vendas', icon: ShoppingCart, label: 'Sales', color: '#a3a7f2' },
  { href: '/produtos', icon: Package, label: 'Produtos', color: '#a3a7f2' },
  { href: '/traffic', icon: ShieldCheck, label: 'Traffic', color: '#a3a7f2' },
  { href: '/configuracoes', icon: Settings, label: 'Config', color: '#a3a7f2' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 12px 12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 50, justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="tt-panel" style={{ pointerEvents: 'auto', display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 6, width: 'min(100%, 520px)', margin: '0 auto', padding: 8, borderRadius: 22 }}>
        {tabs.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                minHeight: 48,
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                border: `1px solid ${active ? `${item.color}44` : 'rgba(170,176,235,.08)'}`,
                background: active ? `${item.color}15` : 'rgba(255,255,255,.03)',
                color: active ? '#eceefb' : '#666c8e',
                boxShadow: active ? `0 10px 24px ${item.color}22` : 'none',
              }}>
                <Icon size={16} color={active ? item.color : '#666c8e'} />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.02em' }}>{item.label}</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
