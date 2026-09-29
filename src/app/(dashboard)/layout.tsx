'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import WorkspaceProvider from '@/components/layout/WorkspaceProvider'
import SwRegister from '@/components/layout/SwRegister'
import BottomNav from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { SidebarDesktop, SidebarProvider, useSidebar } from '@/components/layout/Sidebar'


function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setCollapsed } = useSidebar()

  useEffect(() => { setCollapsed(!open ? false : false) }, [open, setCollapsed])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(5,6,14,.72)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ duration: .24, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
            <SidebarDesktop />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setAuthChecked(true)
    } catch {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [checkAuth, router])

  if (!authChecked) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="tt-card" style={{ width: 220, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 38, height: 38, margin: '0 auto 14px', borderRadius: '50%', border: '2px solid rgba(163,167,242,.18)', borderTopColor: '#a3a7f2', animation: 'spin .9s linear infinite' }} />
          <div style={{ fontFamily: "var(--font-inter, Inter), Inter, sans-serif", fontSize: 18, fontWeight: 800, color: '#eceefb' }}>Carregando</div>
          <div style={{ marginTop: 6, color: '#666c8e', fontSize: 12 }}>Preparando a central Tiotrack...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      <div className="mobile-bottom-nav"><BottomNav /></div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <SwRegister />
        <DashboardInner>{children}</DashboardInner>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
