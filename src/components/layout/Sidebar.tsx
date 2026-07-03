'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Link2,
  FileText, Plug, Settings, LogOut, Zap,
} from 'lucide-react'
import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { useRouter } from 'next/navigation'

const W_COLLAPSED = 60
const W_EXPANDED  = 228

const S = {
  bg:           'rgba(8,8,14,0.97)',
  border:       'rgba(255,255,255,0.055)',
  borderActive: 'rgba(59,130,246,0.25)',
  blue:         '#3b82f6',
  blueLight:    '#60a5fa',
  blueDim:      'rgba(59,130,246,0.10)',
  text:         '#dcdcf0',
  textSub:      '#9090b0',
  textMuted:    '#50506a',
}

export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: true, setCollapsed: () => {} })
export function useSidebar() { return useContext(SidebarContext) }
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true)
  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>
}

const navMain = [
  { label: 'Overview',    href: '/overview',      icon: LayoutDashboard, color: '#60a5fa' },
  { label: 'Campanhas',   href: '/campanhas',     icon: TrendingUp,      color: '#34d399' },
  { label: 'Vendas',      href: '/vendas',        icon: ShoppingCart,    color: '#22d3ee' },
  { label: 'UTMs',        href: '/utms',          icon: Link2,           color: '#a78bfa' },
  { label: 'Relatórios',  href: '/relatorios',    icon: FileText,        color: '#60a5fa' },
]
const navSystem = [
  { label: 'Integrações',   href: '/integracoes',   icon: Plug,     color: '#fbbf24' },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, color: S.textMuted },
]

function NavItem({ href, icon: Icon, label, color, active, collapsed, onClick }: {
  href: string; icon: any; label: string; color: string
  active: boolean; collapsed: boolean; onClick?: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link href={href} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        height: 40, borderRadius: 10, padding: '0 10px', gap: 10,
        overflow: 'hidden', whiteSpace: 'nowrap',
        background: active ? `${color}15` : hov ? 'rgba(255,255,255,0.035)' : 'transparent',
        border: active ? `1px solid ${color}20` : '1px solid transparent',
        color: active ? color : hov ? S.text : S.textSub,
        transition: 'all 0.15s ease', textDecoration: 'none',
      }}>
      {/* Barra ativa */}
      <AnimatePresence>
        {active && (
          <motion.div layoutId="nav-active-bar"
            initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 99, background: color, boxShadow: `0 0 12px ${color}cc` }}
          />
        )}
      </AnimatePresence>
      {/* Hover glow */}
      {hov && !active && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 18% 50%, ${color}0c, transparent)`, borderRadius: 10, pointerEvents: 'none' }}/>
      )}
      {/* Ícone */}
      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, filter: active ? `drop-shadow(0 0 5px ${color}99)` : 'none', transition: 'filter 0.2s' }}>
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8}/>
      </div>
      {/* Label */}
      <motion.span
        animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -8 : 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em', overflow: 'hidden', flex: 1, position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        {label}
      </motion.span>
      {/* Ponto ativo */}
      <AnimatePresence>
        {active && !collapsed && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 7px ${color}`, position: 'relative', zIndex: 1 }}
          />
        )}
      </AnimatePresence>
    </Link>
  )
}

function Sep() {
  return <div style={{ height: 1, margin: '6px 8px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), transparent)' }}/>
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <motion.div animate={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : 'auto' }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: S.textMuted, padding: '6px 10px 3px', fontFamily: "'Syne', sans-serif" }}>
        {label}
      </p>
    </motion.div>
  )
}

function MetaRing({ collapsed }: { collapsed: boolean }) {
  const { active: workspace } = useWorkspaceStore()
  const [pct, setPct] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [target, setTarget] = useState(0)
  const [hov, setHov] = useState(false)
  const color = pct >= 100 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171'
  const circ = 2 * Math.PI * 10

  useEffect(() => {
    if (!workspace?.id) return
    async function load() {
      try {
        const now = new Date()
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const today = now.toISOString().split('T')[0]
        const [vRes, pRes] = await Promise.all([
          supabase.from('conversions').select('valor').eq('workspace_id', workspace!.id).eq('status', 'paid').gte('dia', start).lte('dia', today),
          supabase.from('user_prefs').select('meta_mensal_brl').eq('workspace_id', workspace!.id).single(),
        ])
        const rev = (vRes.data || []).reduce((s: number, r: any) => s + Number(r.valor), 0)
        const tgt = pRes.data?.meta_mensal_brl || 0
        setRevenue(rev); setTarget(tgt)
        setPct(tgt > 0 ? Math.min((rev / tgt) * 100, 100) : 0)
      } catch {}
    }
    load()
  }, [workspace?.id])

  function fmt(n: number) {
    if (n >= 1000000) return `R$${(n/1000000).toFixed(1)}M`
    if (n >= 1000) return `R$${(n/1000).toFixed(0)}K`
    return `R$${n.toFixed(0)}`
  }

  return (
    <Link href="/configuracoes" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', height: 44, borderRadius: 10, padding: '0 10px', gap: 10, overflow: 'hidden', textDecoration: 'none', background: hov ? 'rgba(255,255,255,0.04)' : S.blueDim, border: `1px solid ${hov ? S.borderActive : 'rgba(59,130,246,0.08)'}`, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      <div style={{ flexShrink: 0, position: 'relative', width: 26, height: 26 }}>
        <svg width={26} height={26} viewBox="0 0 26 26" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={13} cy={13} r={10} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2.5}/>
          <motion.circle cx={13} cy={13} r={10} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 700, color, fontFamily: "'Syne', sans-serif" }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <motion.div animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -8 : 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: S.text, fontFamily: "'Syne', sans-serif" }}>Meta do mês</p>
        {target > 0 && <p style={{ fontSize: 10, color: S.textMuted, marginTop: 1, fontFamily: "'DM Sans', sans-serif" }}>{fmt(revenue)} / {fmt(target)}</p>}
      </motion.div>
    </Link>
  )
}

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const [hov, setHov] = useState(false)
  return (
    <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', height: 40, width: '100%', cursor: 'pointer', gap: 10, padding: '0 10px', borderRadius: 10, color: hov ? '#f87171' : S.textMuted, background: hov ? 'rgba(248,113,113,0.08)' : 'transparent', border: hov ? '1px solid rgba(248,113,113,0.15)' : '1px solid transparent', transition: 'all 0.15s', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <LogOut size={16} strokeWidth={1.8}/>
      </div>
      <motion.span animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -8 : 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontSize: 13.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
        Sair
      </motion.span>
    </button>
  )
}

function LogoMark({ glowing }: { glowing?: boolean }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: glowing ? '0 0 18px rgba(59,130,246,0.55)' : 'none', transition: 'box-shadow 0.28s ease' }}>
      <Zap size={14} color="white"/>
    </div>
  )
}

export function SidebarDesktop() {
  const { collapsed, setCollapsed } = useSidebar()
  const pathname = usePathname()
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setCollapsed(false)
  }, [setCollapsed])

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setCollapsed(true), 150)
  }, [setCollapsed])

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }, [])

  return (
    <motion.aside
      animate={{ width: collapsed ? W_COLLAPSED : W_EXPANDED }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        height: '100vh', flexShrink: 0,
        background: S.bg, backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${collapsed ? S.border : S.borderActive}`,
        boxShadow: collapsed ? '1px 0 0 rgba(255,255,255,0.03)' : '4px 0 40px rgba(0,0,0,0.4), 4px 0 32px rgba(59,130,246,0.08)',
        transition: 'border-color 0.28s ease, box-shadow 0.28s ease',
        zIndex: 30, overflow: 'hidden',
      }}>
      {/* Linha gradiente abaixo do logo */}
      <div aria-hidden style={{ position: 'absolute', top: 47, left: 0, right: 0, height: 1, background: collapsed ? 'rgba(255,255,255,0.055)' : 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(99,102,241,0.25), transparent)', transition: 'background 0.28s ease', zIndex: 1, pointerEvents: 'none' }}/>

      {/* Logo */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 14px', overflow: 'hidden', gap: 10, position: 'relative' }}>
        <LogoMark glowing={!collapsed}/>
        <motion.div animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -10 : 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.03em', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}>TioTrack</span>
        </motion.div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 6px', scrollbarWidth: 'none' }}>
        <SectionLabel label="Principal" collapsed={collapsed}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navMain.map(n => <NavItem key={n.href} {...n} active={pathname === n.href || pathname.startsWith(n.href + '/')} collapsed={collapsed}/>)}
        </div>
        <Sep/>
        <SectionLabel label="Sistema" collapsed={collapsed}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navSystem.map(n => <NavItem key={n.href} {...n} active={pathname === n.href || pathname.startsWith(n.href + '/')} collapsed={collapsed}/>)}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: '6px 6px 10px', borderTop: `1px solid ${collapsed ? S.border : S.borderActive}`, transition: 'border-color 0.28s ease', flexShrink: 0 }}>
        <MetaRing collapsed={collapsed}/>
        <div style={{ height: 4 }}/>
        <LogoutButton collapsed={collapsed}/>
      </div>

      {/* Dica hover */}
      <AnimatePresence>
        {collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.7, duration: 0.6 }} aria-hidden
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 56, borderRadius: '3px 0 0 3px', background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.55), transparent)', pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  )
}

export default function Sidebar() {
  return <SidebarDesktop/>
}
