'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, ShoppingCart, FileText, Settings } from 'lucide-react'
import { FloatingDock } from '@/components/ui/aceternity'

const TABS = [
  { href: '/overview',      icon: <LayoutDashboard size={18}/>, label: 'Overview',   color: '#60a5fa' },
  { href: '/campanhas',     icon: <TrendingUp size={18}/>,      label: 'Campanhas',  color: '#34d399' },
  { href: '/vendas',        icon: <ShoppingCart size={18}/>,    label: 'Vendas',     color: '#22d3ee' },
  { href: '/relatorios',    icon: <FileText size={18}/>,        label: 'Relatórios', color: '#60a5fa' },
  { href: '/configuracoes', icon: <Settings size={18}/>,        label: 'Config',     color: '#8a8aaa' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const items = TABS.map(t => ({
    ...t,
    active: pathname === t.href || pathname.startsWith(t.href + '/'),
  }))

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
      padding: '0 0 12px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      zIndex: 100, pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <FloatingDock items={items}/>
      </div>
    </div>
  )
}
