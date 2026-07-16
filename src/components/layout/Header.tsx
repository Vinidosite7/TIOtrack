'use client'

import {
  ChevronDown, Check, LogOut,
  Settings, User, Menu, Zap,
  Activity, ShoppingCart, Plug, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace'

const popStyle: React.CSSProperties = {
  background: '#0f1623',
  border: '1px solid rgba(148,163,184,0.10)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
  borderRadius: 12,
}

const popAnim = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] as const },
}

const toBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje = () => new Date().toISOString().split('T')[0]

function HeaderSignal({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      height: 30, padding: '0 10px',
      borderRadius: 9,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(148,163,184,0.08)',
      minWidth: 0,
    }}>
      <Icon size={13} color={color}/>
      <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32,
        borderRadius: 9,
        background: hov ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hov ? 'rgba(59,130,246,0.22)' : 'rgba(148,163,184,0.08)'}`,
        color: hov ? '#60a5fa' : '#64748b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}>
      <Icon size={14}/>
    </button>
  )
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { active: workspace, list: workspaces, setActive } = useWorkspaceStore()
  const [user, setUser] = useState<any>(null)
  const [showWsMenu, setShowWsMenu]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [ops, setOps] = useState({ receitaHoje: 0, pendentes: 0, fontes: 0, loading: true })
  const wsRef   = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)
    }
    load()
  }, [])

  useEffect(() => {
    if (!workspace?.id) return
    async function loadOps() {
      setOps(o => ({ ...o, loading: true }))
      const h = hoje()
      const [{ data: vendas }, { data: bcs }, { data: meta }] = await Promise.all([
        supabase.from('conversions').select('valor,status').eq('workspace_id', workspace!.id).eq('dia', h),
        supabase.from('bc_configs').select('id').eq('workspace_id', workspace!.id),
        (supabase as any).from('meta_connections').select('id').eq('workspace_id', workspace!.id),
      ])
      const receitaHoje = (vendas ?? []).filter((v: any) => v.status === 'paid').reduce((s: number, v: any) => s + (v.valor ?? 0), 0)
      const pendentes = (vendas ?? []).filter((v: any) => v.status === 'pending').length
      const fontes = ((bcs ?? []).length > 0 ? 1 : 0) + (((meta as any)?.length ?? 0) > 0 ? 1 : 0)
      setOps({ receitaHoje, pendentes, fontes, loading: false })
    }
    loadOps()
  }, [workspace?.id])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wsRef.current   && !wsRef.current.contains(e.target as Node))   setShowWsMenu(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function UserAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const d = size === 'sm' ? 30 : 38
    return (
      <div style={{
        width: d, height: d, borderRadius: size === 'sm' ? 8 : 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#3b82f6',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: size === 'sm' ? 11 : 14, fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{initials}</span>
      </div>
    )
  }

  const hBtn = (open: boolean): React.CSSProperties => ({
    background: open ? 'rgba(255,255,255,0.05)' : 'transparent',
    border: `1px solid ${open ? 'rgba(148,163,184,0.12)' : 'transparent'}`,
    transition: 'background 0.15s ease',
    borderRadius: 8, cursor: 'pointer',
  })

  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', flexShrink: 0, position: 'relative',
      background: '#0e1520',
      borderBottom: '1px solid rgba(148,163,184,0.08)',
      zIndex: 50, overflow: 'visible',
    }}>
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Hamburger mobile */}
        <motion.button whileTap={{ scale: 0.92 }} onClick={onMenuClick}
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.10)', color: '#94a3b8', cursor: 'pointer' }}
          className="mobile-only">
          <Menu size={16}/>
        </motion.button>

        {/* Workspace selector */}
        <div ref={wsRef} style={{ position: 'relative', zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setShowWsMenu(v => !v)}
            style={{ ...hBtn(showWsMenu), display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={11} style={{ color: '#60a5fa' }}/>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace?.nome || 'Workspace'}
            </span>
            <motion.div animate={{ rotate: showWsMenu ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={11} style={{ color: '#475569' }}/>
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showWsMenu && workspaces.length > 0 && (
              <motion.div {...popAnim} style={{ ...popStyle, position: 'absolute', left: 0, top: 46, minWidth: 200, padding: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', padding: '4px 10px 6px', fontFamily: "'Syne', sans-serif" }}>Workspaces</p>
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => { setActive(ws); setShowWsMenu(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: workspace?.id === ws.id ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left' }}
                    onMouseEnter={e => { if (workspace?.id !== ws.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (workspace?.id !== ws.id) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontSize: 13, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{ws.nome}</span>
                    {workspace?.id === ws.id && <Check size={12} style={{ color: '#60a5fa' }}/>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CENTER */}
      <div className="header-center" style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '48vw',
        overflow: 'hidden',
      }}>
        <HeaderSignal icon={Activity} label="Hoje" value={ops.loading ? '—' : toBRL(ops.receitaHoje)} color="#34d399"/>
        <HeaderSignal icon={ShoppingCart} label="PIX" value={ops.loading ? '—' : String(ops.pendentes)} color="#fbbf24"/>
        <HeaderSignal icon={Plug} label="Fontes" value={ops.loading ? '—' : `${ops.fontes}/2`} color={ops.fontes > 0 ? '#60a5fa' : '#64748b'}/>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <QuickAction icon={TrendingUp} label="Abrir campanhas" onClick={() => router.push('/campanhas')}/>
          <QuickAction icon={ShoppingCart} label="Abrir vendas" onClick={() => router.push('/vendas')}/>
          <QuickAction icon={Plug} label="Abrir integrações" onClick={() => router.push('/integracoes')}/>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'rgba(148,163,184,0.10)', margin: '0 2px' }}/>

        {/* User */}
        <div ref={userRef} style={{ position: 'relative', zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserMenu(v => !v)}
            style={{ ...hBtn(showUserMenu), display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px' }}>
            <UserAvatar size="sm"/>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }} className="desktop-only">
              {userName.split(' ')[0]}
            </span>
            <ChevronDown size={10} style={{ color: '#475569' }} className="desktop-only"/>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div {...popAnim} style={{ ...popStyle, position: 'absolute', right: 0, top: 46, width: 200, padding: 6 }}>
                {/* User card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 10px', marginBottom: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
                  <UserAvatar size="md"/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                    <p style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                  </div>
                </div>

                {[{ icon: Settings, label: 'Configurações', href: '/configuracoes' }, { icon: User, label: 'Perfil', href: '/configuracoes' }].map(({ icon: Icon, label, href }) => (
                  <button key={label} onClick={() => { setShowUserMenu(false); router.push(href) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', transition: 'all 0.1s', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#d0d0e0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8aaa' }}>
                    <Icon size={13}/> {label}
                  </button>
                ))}

                <div style={{ height: 1, background: 'rgba(148,163,184,0.08)', margin: '4px 4px' }}/>

                <button onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#f87171', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.1s', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <LogOut size={13}/> Sair
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .mobile-only  { display: none; }
        .desktop-only { display: flex; }
        .header-center { display: flex; }
        @media (max-width: 1120px) {
          .header-center { display: none !important; }
        }
        @media (max-width: 768px) {
          .mobile-only  { display: flex !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>
    </header>
  )
}
