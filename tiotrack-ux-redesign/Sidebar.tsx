'use client'

import { useState, createContext, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Link2,
  FileText, Plug, Settings, LogOut, Zap, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'

export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} })
export function useSidebar() { return useContext(SidebarContext) }
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>
}

const NAV_MAIN = [
  { href: '/overview',   icon: LayoutDashboard, label: 'Overview',   color: '#60a5fa' },
  { href: '/campanhas',  icon: TrendingUp,       label: 'Campanhas',  color: '#34d399' },
  { href: '/vendas',     icon: ShoppingCart,     label: 'Vendas',     color: '#22d3ee' },
  { href: '/utms',       icon: Link2,            label: 'UTMs',       color: '#a78bfa' },
  { href: '/relatorios', icon: FileText,         label: 'Relatórios', color: '#60a5fa' },
]
const NAV_SYSTEM = [
  { href: '/integracoes',   icon: Plug,     label: 'Integrações',   color: '#fbbf24' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações', color: '#4a4a6a' },
]

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E")`

function NavItem({ href, icon: Icon, label, color, active, collapsed }: {
  href: string; icon: any; label: string; color: string; active: boolean; collapsed: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link href={href} title={collapsed ? label : undefined}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', height: 38,
        borderRadius: 10, padding: collapsed ? '0' : '0 10px',
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 9, overflow: 'hidden',
        background: active ? `${color}14` : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: active ? `1px solid ${color}22` : '1px solid transparent',
        textDecoration: 'none', transition: 'all 0.14s ease', flexShrink: 0,
      }}>
      {/* Grain */}
      {active && <div style={{ position:'absolute',inset:0,pointerEvents:'none',borderRadius:'inherit',backgroundImage:GRAIN,backgroundSize:'120px 120px',mixBlendMode:'overlay' as const }} />}
      {/* Shimmer hover */}
      {(hov || active) && <div style={{ position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.03) 50%, transparent 80%)',backgroundSize:'200% 100%',animation:'shimmerSweep 2.5s ease-in-out infinite',borderRadius:'inherit' }} />}
      {/* Barra ativa */}
      <AnimatePresence>
        {active && <motion.div layoutId="sidebar-active-bar" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }} style={{ position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:16,borderRadius:99,background:color,boxShadow:`0 0 10px ${color}cc` }} />}
      </AnimatePresence>
      <Icon size={14} style={{ color: active ? color : hov ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)', transition:'color 140ms', flexShrink:0, marginLeft: active && !collapsed ? 2 : 0 }} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span initial={{ opacity:0, width:0 }} animate={{ opacity:1, width:'auto' }} exit={{ opacity:0, width:0 }} transition={{ duration:0.16 }}
            style={{ fontSize:13, fontWeight:active?600:400, color:active?'#dcdcf0':hov?'#c0c0d8':'rgba(255,255,255,0.38)', letterSpacing:'-0.01em', overflow:'hidden', whiteSpace:'nowrap', fontFamily:"'DM Sans', sans-serif", transition:'color 140ms' }}>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'6px 8px' }} />
  return <div style={{ fontSize:9, color:'rgba(255,255,255,0.18)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 10px 5px', fontFamily:"'DM Sans', sans-serif" }}>{label}</div>
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { active: workspace } = useWorkspaceStore()
  const [collapsed, setCollapsed] = useState(false)

  const initials = workspace?.nome
    ? workspace.nome.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'OP'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 228 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ height:'100vh', display:'flex', flexDirection:'column', background:'rgba(7,8,18,0.97)', borderRight:'1px solid rgba(255,255,255,0.055)', flexShrink:0, overflow:'hidden', position:'relative' }}>

      {/* Orbs ambientais */}
      <div style={{ position:'absolute', top:-80, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:0, animation:'float-orb 14s ease-in-out infinite' }} />
      <div style={{ position:'absolute', bottom:-100, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:0, animation:'float-orb 20s ease-in-out infinite reverse' }} />
      {/* Dot grid */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:'radial-gradient(circle, rgba(148,163,184,0.05) 1px, transparent 1px)', backgroundSize:'24px 24px', maskImage:'radial-gradient(ellipse 100% 80% at 50% 30%, black 30%, transparent 100%)', WebkitMaskImage:'radial-gradient(ellipse 100% 80% at 50% 30%, black 30%, transparent 100%)' }} />
      {/* Grain geral */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:GRAIN, backgroundSize:'180px 180px', mixBlendMode:'overlay' as const, opacity:0.5 }} />

      {/* Conteúdo */}
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%' }}>

        {/* Logo */}
        <div onClick={() => setCollapsed(c => !c)} style={{ padding: collapsed ? '18px 0 14px' : '18px 16px 14px', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, cursor:'pointer', flexShrink:0 }}>
          <motion.div whileHover={{ scale:1.08 }} whileTap={{ scale:0.94 }}
            style={{ width:32, height:32, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 16px rgba(59,130,246,0.45)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)',backgroundSize:'200% 100%',animation:'shimmerSweep 3s ease-in-out infinite' }} />
            <Zap size={15} color="#fff" style={{ position:'relative', zIndex:1 }} />
          </motion.div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }} transition={{ duration:0.16 }}>
                <div style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne', sans-serif", color:'#f0f0ff', letterSpacing:'-0.03em', lineHeight:1.2 }}>TioTrack</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', fontFamily:"'JetBrains Mono', monospace", letterSpacing:'0.06em' }}>v1.0</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Workspace */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} transition={{ duration:0.16 }}
              style={{ padding:'0 10px 10px', overflow:'hidden', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.065)', cursor:'pointer', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:GRAIN,backgroundSize:'120px 120px',mixBlendMode:'overlay' as const }} />
                <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', boxShadow:'0 2px 8px rgba(99,102,241,0.35)', fontFamily:"'Syne', sans-serif" }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#dcdcf0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3, fontFamily:"'DM Sans', sans-serif" }}>{workspace?.nome ?? 'Workspace'}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', fontFamily:"'DM Sans', sans-serif" }}>workspace</div>
                </div>
                <ChevronDown size={12} style={{ color:'rgba(255,255,255,0.2)', flexShrink:0 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'0 12px 8px', flexShrink:0 }} />

        {/* Nav */}
        <nav style={{ flex:1, padding:'0 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>
          <SectionLabel label="Principal" collapsed={collapsed} />
          {NAV_MAIN.map(({ href, icon, label, color }) => (
            <NavItem key={href} href={href} icon={icon} label={label} color={color} active={pathname === href || pathname.startsWith(href + '/')} collapsed={collapsed} />
          ))}
        </nav>

        <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'8px 12px', flexShrink:0 }} />

        <div style={{ padding:'0 10px 8px', display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
          <SectionLabel label="Sistema" collapsed={collapsed} />
          {NAV_SYSTEM.map(({ href, icon, label, color }) => (
            <NavItem key={href} href={href} icon={icon} label={label} color={color} active={pathname === href || pathname.startsWith(href + '/')} collapsed={collapsed} />
          ))}
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'0 12px 8px', flexShrink:0 }} />

        {/* User */}
        <div style={{ padding:'0 10px 16px', flexShrink:0 }}>
          {collapsed ? (
            <motion.button onClick={handleLogout} whileHover={{ scale:1.08 }} whileTap={{ scale:0.94 }} title="Sair"
              style={{ width:'100%', height:36, borderRadius:10, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.15)', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <LogOut size={14} />
            </motion.button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:GRAIN,backgroundSize:'120px 120px',mixBlendMode:'overlay' as const }} />
              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', fontFamily:"'Syne', sans-serif", boxShadow:'0 2px 8px rgba(59,130,246,0.3)' }}>VN</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#dcdcf0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3, fontFamily:"'DM Sans', sans-serif" }}>vnmktagencia</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:"'DM Sans', sans-serif" }}>admin</div>
              </div>
              <motion.button onClick={handleLogout} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} title="Sair"
                style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.14)', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LogOut size={12} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmerSweep { 0%,100%{background-position:200% center} 50%{background-position:-200% center} }
        @keyframes float-orb { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,-14px) scale(1.06)} }
      `}</style>
    </motion.aside>
  )
}
