'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useState } from 'react'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Link2, FileText, Package, Cloud, Globe2,
  Plug, Settings, ShieldCheck, RadioTower, BarChart3, ChevronRight,
  LogOut, Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { T } from '@/lib/tokens'

export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} })
export function useSidebar() { return useContext(SidebarContext) }
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>
}

type NavItemType = { label: string; href: string; icon: any; color: string; badge?: string }

const groups: { title: string; items: NavItemType[] }[] = [
  {
    title: 'Operação',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard, color: T.accent },
      { label: 'Campanhas', href: '/campanhas', icon: TrendingUp, color: T.green },
      { label: 'Vendas', href: '/vendas', icon: ShoppingCart, color: T.cyan },
      { label: 'Produtos', href: '/produtos', icon: Package, color: T.accentLight },
      { label: 'Funil & UTMs', href: '/utms', icon: Link2, color: T.purple },
      { label: 'Relatórios', href: '/relatorios', icon: FileText, color: T.yellow },
    ],
  },
  {
    title: 'Infra',
    items: [
      { label: 'Pages', href: '/pages', icon: Cloud, color: T.accentLight },
      { label: 'Domínios', href: '/domains', icon: Globe2, color: T.green },
    ],
  },
  {
    title: 'Central',
    items: [
      { label: 'Traffic Center', href: '/traffic', icon: ShieldCheck, color: T.green, badge: 'LIVE' },
      { label: 'Signal Center', href: '/signal', icon: RadioTower, color: T.purple, badge: 'MVP' },
      { label: 'Integrações', href: '/integracoes', icon: Plug, color: T.accentLight },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Configurações', href: '/configuracoes', icon: Settings, color: '#94a3b8' },
    ],
  },
]

function NavItem({ item, active }: { item: NavItemType; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 46,
        padding: '0 12px',
        borderRadius: 14,
        color: active ? '#eceefb' : '#9ea3c2',
        background: active ? 'linear-gradient(180deg, rgba(163,167,242,.18) 0%, rgba(163,167,242,.10) 100%)' : 'transparent',
        border: `1px solid ${active ? 'rgba(163,167,242,.28)' : 'transparent'}`,
        boxShadow: active ? '0 10px 24px rgba(163,167,242,.12)' : 'none',
        transition: 'all .18s ease',
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: active ? `${item.color}20` : 'rgba(255,255,255,.04)',
        border: `1px solid ${active ? `${item.color}33` : 'rgba(148,163,184,.08)'}`,
        flexShrink: 0,
      }}>
        <Icon size={16} color={active ? item.color : '#666c8e'} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: 9,
              lineHeight: 1,
              padding: '4px 6px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,.12)',
              color: active ? '#dcdefd' : '#8ea0bb',
              background: active ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
            }}>{item.badge}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: active ? '#9ea3c2' : '#666c8e', marginTop: 1 }}>
          {item.href === '/traffic' ? 'tráfego · regras · segurança' : item.href === '/signal' ? 'eventos · qualidade · retry' : 'dados e operação'}
        </div>
      </div>

      <ChevronRight size={14} color={active ? '#dcdefd' : '#666c8e'} />
    </Link>
  )
}

export function SidebarDesktop() {
  const pathname = usePathname()
  const router = useRouter()
  const { active } = useWorkspaceStore()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      style={{
        width: 290, height: '100%',
        padding: 16,
        background: '#0b0d18',
        borderRight: '1px solid rgba(148,163,184,.08)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        position: 'relative',
        zIndex: 3,
      }}
    >
      <div className="tt-panel" style={{ height: '100%', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 4px 10px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(163,167,242,.28) 0%, rgba(163,167,242,.22) 100%)',
            border: '1px solid rgba(185,188,247,.22)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 12px 32px rgba(163,167,242,.14)',
          }}>
            <BarChart3 size={22} color="#dcdefd" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#eceefb', fontFamily: "var(--font-inter, Inter), Inter, sans-serif" }}>Tiotrack</div>
            <div style={{ marginTop: 2, fontSize: 12, color: '#9ea3c2' }}>Operation Control Center</div>
          </div>
        </div>

        <div style={{
          padding: 14,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,.08)',
          background: 'linear-gradient(180deg, rgba(163,167,242,.12) 0%, rgba(255,255,255,.02) 100%)',
        }}>
          <div className="tt-badge" style={{ width: 'fit-content', background: 'rgba(255,255,255,.04)' }}>
            <Sparkles size={12} color="#a3a7f2" />
            Workspace ativo
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: '#eceefb', fontFamily: "var(--font-inter, Inter), Inter, sans-serif" }}>
            {active?.nome || 'Selecione um workspace'}
          </div>
          <p style={{ marginTop: 8, color: '#9ea3c2', fontSize: 12, lineHeight: 1.65 }}>
            Painel único para tráfego, atribuição, funil e qualidade de eventos.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }} className="no-scrollbar">
          {groups.map((group) => (
            <div key={group.title} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#666c8e', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 800, padding: '0 8px 10px' }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((item) => {
                  const activeItem = item.href === '/traffic'
                    ? pathname === item.href || pathname.startsWith('/traffic/')
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                  return <NavItem key={item.href} item={item} active={activeItem} />
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: 14,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,.08)',
          background: 'rgba(255,255,255,.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ea3c2', fontWeight: 600 }}>Status da central</div>
              <div style={{ marginTop: 4, fontSize: 16, color: '#eceefb', fontWeight: 800, fontFamily: "var(--font-inter, Inter), Inter, sans-serif" }}>Live monitor</div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#74d3ab', fontSize: 11, fontWeight: 800 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#74d3ab', boxShadow: '0 0 18px rgba(116,211,171,.75)' }} /> ON
            </div>
          </div>
          <button onClick={handleLogout} className="tt-btn tt-btn-ghost" style={{ width: '100%', marginTop: 12, justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LogOut size={14} /> Sair da conta</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
