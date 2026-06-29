'use client'

import {
  Bell, ChevronDown, Check, LogOut,
  Settings, User, Menu, CheckCheck, X, ChevronRight, Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace'

const popStyle: React.CSSProperties = {
  background: 'rgba(10,10,18,0.97)',
  border: '1px solid rgba(59,130,246,0.14)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  borderRadius: 14,
}

const popAnim = {
  initial: { opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -8, scale: 0.96 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { active: workspace, list: workspaces, setActive } = useWorkspaceStore()
  const [user, setUser] = useState<any>(null)
  const [showWsMenu, setShowWsMenu]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        flexShrink: 0, border: '1px solid rgba(59,130,246,0.25)',
        boxShadow: '0 0 12px rgba(59,130,246,0.2)',
      }}>
        <span style={{ fontSize: size === 'sm' ? 11 : 14, fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{initials}</span>
      </div>
    )
  }

  const hBtn = (open: boolean): React.CSSProperties => ({
    background: open ? 'rgba(59,130,246,0.08)' : 'transparent',
    border: `1px solid ${open ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
    boxShadow: open ? '0 0 16px rgba(59,130,246,0.1)' : 'none',
    transition: 'all 0.15s ease',
    borderRadius: 8, cursor: 'pointer',
  })

  return (
    <header style={{
      height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', flexShrink: 0, position: 'relative',
      background: 'rgba(8,8,14,0.88)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.055)',
      boxShadow: '0 1px 0 rgba(59,130,246,0.1), 0 4px 24px rgba(0,0,0,0.35)',
      zIndex: 50, overflow: 'visible',
    }}>
      {/* Linha gradiente azul no bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.45) 30%, rgba(99,102,241,0.55) 50%, rgba(59,130,246,0.45) 70%, transparent 100%)' }}/>

      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Hamburger mobile */}
        <motion.button whileTap={{ scale: 0.92 }} onClick={onMenuClick}
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b6b8a', cursor: 'pointer' }}
          className="mobile-only">
          <Menu size={16}/>
        </motion.button>

        {/* Workspace selector */}
        <div ref={wsRef} style={{ position: 'relative', zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setShowWsMenu(v => !v)}
            style={{ ...hBtn(showWsMenu), display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={11} style={{ color: '#60a5fa' }}/>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#dcdcf0', fontFamily: "'Syne', sans-serif", maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace?.nome || 'Workspace'}
            </span>
            <motion.div animate={{ rotate: showWsMenu ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={11} style={{ color: '#4a4a6a' }}/>
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showWsMenu && workspaces.length > 0 && (
              <motion.div {...popAnim} style={{ ...popStyle, position: 'absolute', left: 0, top: 46, minWidth: 200, padding: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a3a5c', padding: '4px 10px 6px', fontFamily: "'Syne', sans-serif" }}>Workspaces</p>
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => { setActive(ws); setShowWsMenu(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: workspace?.id === ws.id ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left' }}
                    onMouseEnter={e => { if (workspace?.id !== ws.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (workspace?.id !== ws.id) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontSize: 13, color: '#d0d0e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{ws.nome}</span>
                    {workspace?.id === ws.id && <Check size={12} style={{ color: '#60a5fa' }}/>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }}/>

        {/* User */}
        <div ref={userRef} style={{ position: 'relative', zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserMenu(v => !v)}
            style={{ ...hBtn(showUserMenu), display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px' }}>
            <UserAvatar size="sm"/>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#dcdcf0', fontFamily: "'Syne', sans-serif" }} className="desktop-only">
              {userName.split(' ')[0]}
            </span>
            <ChevronDown size={10} style={{ color: '#4a4a6a' }} className="desktop-only"/>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div {...popAnim} style={{ ...popStyle, position: 'absolute', right: 0, top: 46, width: 200, padding: 6 }}>
                {/* User card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 10px', marginBottom: 6, borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <UserAvatar size="md"/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e0e0f0', fontFamily: "'Syne', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                    <p style={{ fontSize: 11, color: '#3a3a5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                  </div>
                </div>

                {[{ icon: Settings, label: 'Configurações', href: '/configuracoes' }, { icon: User, label: 'Perfil', href: '/configuracoes' }].map(({ icon: Icon, label, href }) => (
                  <button key={label} onClick={() => { setShowUserMenu(false); router.push(href) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#8a8aaa', fontSize: 13, cursor: 'pointer', transition: 'all 0.1s', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#d0d0e0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8aaa' }}>
                    <Icon size={13}/> {label}
                  </button>
                ))}

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 4px' }}/>

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
        @media (max-width: 768px) {
          .mobile-only  { display: flex !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>
    </header>
  )
}
