'use client'

import { SidebarDesktop, SidebarProvider, useSidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import SwRegister from '@/components/layout/SwRegister'
import WorkspaceProvider from '@/components/layout/WorkspaceProvider'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ─── Grain filter SVG global ──────────────────────────────────
function GrainFilter() {
  return (
    <svg style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden>
      <defs>
        <filter id="tt-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.045"/></feComponentTransfer>
          <feBlend in="SourceGraphic" mode="overlay"/>
        </filter>
      </defs>
    </svg>
  )
}

// ─── Page background — orbs + dot grid ───────────────────────
function PageBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -180, left: -60, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.055) 0%, transparent 70%)', animation: 'ttOrbA 12s ease-in-out infinite', filter: 'blur(1px)' }}/>
      <div style={{ position: 'absolute', bottom: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', animation: 'ttOrbB 18s ease-in-out infinite reverse', filter: 'blur(1px)' }}/>
      <div style={{ position: 'absolute', top: '30%', right: '5%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,110,247,0.035) 0%, transparent 70%)', animation: 'ttOrbA 28s ease-in-out infinite' }}/>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 130% 100% at 50% -10%, transparent 35%, rgba(11,15,20,0.65) 100%)' }}/>
      <style>{`
        @keyframes ttOrbA { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(22px,-28px) scale(1.07)} 60%{transform:translate(-14px,18px) scale(0.95)} }
        @keyframes ttOrbB { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-24px,22px) scale(1.09)} 70%{transform:translate(16px,-12px) scale(0.94)} }
      `}</style>
    </div>
  )
}

// ─── Mobile Sidebar Drawer ────────────────────────────────────
function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setCollapsed } = useSidebar()

  useEffect(() => {
    if (open) setCollapsed(false)
    else setCollapsed(true)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, boxShadow: '8px 0 40px rgba(0,0,0,0.5)' }}>
            <SidebarDesktop/>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Inner layout ─────────────────────────────────────────────
function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setAuthChecked(true)
    } catch { router.replace('/login') }
  }, [router])

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [checkAuth])

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0b0f14' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.25)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }}/>
          <p style={{ fontSize: 12, color: '#475569', fontFamily: "'DM Sans', sans-serif" }}>Carregando...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0b0f14', position: 'relative', zIndex: 1 }}>
      {/* Sidebar desktop */}
      <div className="desktop-sidebar">
        <SidebarDesktop/>
      </div>

      {/* Mobile drawer */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)}/>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Header onMenuClick={() => setMobileOpen(true)}/>
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <div className="mobile-bottom-nav">
        <BottomNav/>
      </div>
    </div>
  )
}

// ─── Layout wrapper ───────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <SwRegister/>
        <GrainFilter/>
        <PageBackground/>
        <DashboardInner>{children}</DashboardInner>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
