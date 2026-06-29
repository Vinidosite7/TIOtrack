import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar, { SidebarProvider } from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import SwRegister from '@/components/layout/SwRegister'
import WorkspaceProvider from '@/components/layout/WorkspaceProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <SwRegister />

        <div style={{ display: 'flex', height: '100vh', background: '#070812', overflow: 'hidden' }}>
          {/* Sidebar — desktop only */}
          <div className="desktop-sidebar">
            <Sidebar />
          </div>

          {/* Main content */}
          <main
            className="main-content"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {children}
          </main>
        </div>

        {/* Bottom nav — mobile only */}
        <div className="mobile-bottom-nav">
          <BottomNav />
        </div>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
