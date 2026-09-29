'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Menu, Plug, Settings, LogOut, User, LayoutGrid, TrendingUp,
  ShoppingCart, Filter, ShieldCheck, RadioTower, FileText, Check, Package,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'

const popAnim = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: .14, ease: [0.16, 1, 0.3, 1] as const },
}

export const NAV = [
  { href: '/overview', label: 'Visão geral', icon: LayoutGrid },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/campanhas', label: 'Campanhas', icon: TrendingUp },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/utms', label: 'Funil', icon: Filter },
  { href: '/traffic', label: 'Tráfego', icon: ShieldCheck, live: true },
  { href: '/signal', label: 'Signal', icon: RadioTower },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
]

export function Logo() {
  return (
    <Link href="/overview" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }} aria-label="Tiotrack">
      <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
        <defs>
          <linearGradient id="tt-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef0ff" />
            <stop offset="100%" stopColor="#8c91ea" />
          </linearGradient>
        </defs>
        <path d="M1 3h24l-4 5h-6l-3 13-4.5-3L10 8H5z" fill="url(#tt-logo)" />
      </svg>
      <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '.02em', fontStyle: 'italic', color: '#eceefb', lineHeight: 1 }}>
        TIO<span style={{ color: '#a3a7f2', fontWeight: 600 }}>TRACK</span>
      </span>
    </Link>
  )
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { active: workspace, list: workspaces, setActive } = useWorkspaceStore()
  const [user, setUser] = useState<any>(null)
  const [showWsMenu, setShowWsMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const wsRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null)) }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setShowWsMenu(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const userName = useMemo(() => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User', [user])
  const initials = useMemo(() => userName.split(/[\s._-]+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(), [userName])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'rgba(11,13,24,.78)',
      borderBottom: '1px solid rgba(170,176,235,.07)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
    }}>
      <div style={{ width: 'min(100%, 1680px)', margin: '0 auto', height: 60, padding: '0 clamp(16px,2.2vw,32px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="tt-icon-btn hk-topnav-burger" style={{ display: 'none' }} onClick={onMenuClick} aria-label="Abrir menu"><Menu size={16} /></button>
        <Logo />

        <nav className="hk-topnav-links no-scrollbar" style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 12, background: 'rgba(20,24,41,.7)', border: '1px solid rgba(170,176,235,.08)' }}>
            {NAV.map(item => {
              const on = isActive(item.href)
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', borderRadius: 9,
                  fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
                  color: on ? '#11142a' : '#9ea3c2',
                  background: on ? 'linear-gradient(180deg, #c3c6fa 0%, #999eee 100%)' : 'transparent',
                  boxShadow: on ? '0 6px 18px rgba(133,139,230,.28), inset 0 1px 0 rgba(255,255,255,.4)' : 'none',
                  transition: 'color .15s ease, background .15s ease',
                }}>
                  <Icon size={14} strokeWidth={on ? 2.4 : 2} />
                  {item.label}
                  {item.live && <span className="tt-status-dot hk-live-dot" style={{ width: 5, height: 5, background: on ? '#11142a' : '#74d3ab' }} />}
                </Link>
              )
            })}
          </div>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div ref={wsRef} style={{ position: 'relative' }}>
            <button className="tt-btn" onClick={() => setShowWsMenu(v => !v)} style={{ gap: 8, maxWidth: 200 }}>
              <span className="tt-status-dot" style={{ background: '#74d3ab', boxShadow: '0 0 8px #74d3ab' }} />
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspace?.nome || 'Workspace'}</span>
              <ChevronDown size={14} color="#9ea3c2" />
            </button>
            <AnimatePresence>
              {showWsMenu && (
                <motion.div {...popAnim} className="tt-card" style={{ position: 'absolute', right: 0, top: 44, width: 250, padding: 6, zIndex: 40 }}>
                  <div className="tt-cap" style={{ padding: '6px 10px 8px' }}>Workspaces</div>
                  {workspaces.map(ws => {
                    const on = ws.id === workspace?.id
                    return (
                      <button key={ws.id} onClick={() => { setActive(ws); setShowWsMenu(false) }} style={{
                        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        minHeight: 36, padding: '0 10px', borderRadius: 8, fontSize: 13,
                        background: on ? 'rgba(163,167,242,.12)' : 'transparent', color: on ? '#eceefb' : '#9ea3c2',
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.nome}</span>
                        {on && <Check size={14} color="#a3a7f2" />}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="/integracoes" className="tt-icon-btn desktop-only" title="Integrações" aria-label="Integrações" style={{ display: undefined }}><Plug size={15} /></Link>
          <Link href="/configuracoes" className="tt-icon-btn desktop-only" title="Configurações" aria-label="Configurações"><Settings size={15} /></Link>

          <div ref={userRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(v => !v)} aria-label="Conta" style={{
              width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center',
              background: 'radial-gradient(circle at 35% 30%, #dcdefd 0%, #8c91ea 70%)', color: '#11142a', fontSize: 12, fontWeight: 800,
              boxShadow: '0 0 0 2px rgba(11,13,24,1), 0 0 0 3px rgba(163,167,242,.35)',
            }}>{initials}</button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div {...popAnim} className="tt-card" style={{ position: 'absolute', right: 0, top: 46, width: 230, padding: 6, zIndex: 40 }}>
                  <div style={{ padding: '10px 10px 12px', borderBottom: '1px solid rgba(170,176,235,.08)', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, color: '#eceefb' }}>{userName}</div>
                    <div style={{ marginTop: 3, color: '#666c8e', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  </div>
                  {[
                    { label: 'Perfil', icon: User, href: '/configuracoes' },
                    { label: 'Integrações', icon: Plug, href: '/integracoes' },
                    { label: 'Configurações', icon: Settings, href: '/configuracoes' },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.label} onClick={() => { setShowUserMenu(false); router.push(item.href) }} style={{ width: '100%', minHeight: 36, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', color: '#9ea3c2', fontSize: 13 }}>
                        <Icon size={14} /> {item.label}
                      </button>
                    )
                  })}
                  <div style={{ height: 1, background: 'rgba(170,176,235,.08)', margin: '6px 4px' }} />
                  <button onClick={handleLogout} style={{ width: '100%', minHeight: 36, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', color: '#f0899b', fontSize: 13 }}>
                    <LogOut size={14} /> Sair
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
