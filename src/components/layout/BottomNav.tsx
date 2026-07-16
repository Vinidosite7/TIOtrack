'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, ShoppingCart, FileText, Settings, PlugZap, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'

const TABS = [
  { href: '/overview',      icon: LayoutDashboard, label: 'Hoje',        color: '#60a5fa' },
  { href: '/campanhas',     icon: TrendingUp,      label: 'Campanhas',   color: '#34d399' },
  { href: '/vendas',        icon: ShoppingCart,    label: 'Vendas',      color: '#22d3ee' },
  { href: '/utms',          icon: Link2,           label: 'UTMs',        color: '#a78bfa' },
  { href: '/integracoes',   icon: PlugZap,         label: 'Integrações', color: '#f59e0b' },
  { href: '/relatorios',    icon: FileText,        label: 'Relatórios',  color: '#60a5fa' },
  { href: '/configuracoes', icon: Settings,        label: 'Config',      color: '#8a8aaa' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
      padding: '0 10px 12px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      zIndex: 100, pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(7,minmax(0,1fr))',
        gap: 4,
        width: 'min(100%, 430px)',
        padding: '8px',
        borderRadius: 24,
        background: 'rgba(10,10,18,0.94)',
        border: '1px solid rgba(124,110,247,0.18)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,110,247,0.06)',
        backdropFilter: 'blur(20px)',
      }}>
        {TABS.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a key={item.href} href={item.href} aria-label={item.label} style={{ textDecoration: 'none', minWidth: 0 }}>
              <motion.div
                whileTap={{ scale: 0.94 }}
                style={{
                  height: 44,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: active ? `${item.color}18` : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${active ? `${item.color}42` : 'rgba(255,255,255,0.055)'}`,
                  color: active ? item.color : '#5d6378',
                  boxShadow: active ? `0 0 16px ${item.color}22` : 'none',
                }}>
                <Icon size={16}/>
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 8, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em', color: active ? '#E2E8F0' : '#68708a' }}>
                  {item.label}
                </span>
              </motion.div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
