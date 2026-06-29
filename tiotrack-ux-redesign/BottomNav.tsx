'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, TrendingUp, ShoppingCart, FileText, Settings } from 'lucide-react'

const TABS = [
  { href: '/overview',      icon: LayoutDashboard, label: 'Overview',   color: '#60a5fa' },
  { href: '/campanhas',     icon: TrendingUp,       label: 'Campanhas',  color: '#34d399' },
  { href: '/vendas',        icon: ShoppingCart,     label: 'Vendas',     color: '#22d3ee' },
  { href: '/relatorios',    icon: FileText,         label: 'Relatórios', color: '#60a5fa' },
  { href: '/configuracoes', icon: Settings,         label: 'Config',     color: '#8a8aaa' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 64,
      background: 'rgba(7,8,18,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(({ href, icon: Icon, label, color }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, height: 56,
              position: 'relative',
            }}>
              {/* Linha topo ativa */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="bottom-active-line"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    style={{
                      position: 'absolute', top: 0, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 28, height: 2, borderRadius: 99,
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                animate={{
                  scale: active ? 1.12 : 1,
                  y: active ? -1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Icon
                  size={active ? 21 : 19}
                  style={{
                    color: active ? color : 'rgba(255,255,255,0.22)',
                    filter: active ? `drop-shadow(0 0 5px ${color}80)` : 'none',
                    transition: 'all 200ms',
                  }}
                />
              </motion.div>

              {/* Label */}
              <span style={{
                fontSize: 9,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: active ? 600 : 400,
                color: active ? color : 'rgba(255,255,255,0.2)',
                letterSpacing: '0.03em',
                transition: 'all 200ms',
              }}>
                {label}
              </span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
