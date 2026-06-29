'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  Zap, GripVertical, Eye, EyeOff, Settings2, Check,
  Trophy, Calendar, Minimize2, Maximize2, ShoppingCart,
  BookOpen, Bell, Key, Users, BarChart2, Percent, Activity,
  CheckCircle, Clock,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { T } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'
import { GlowingEffect, SpotlightCard, GlowCorner } from '@/components/ui/aceternity'
import { useWorkspaceStore } from '@/store/workspace'

type Period   = 'hoje' | '7d' | '30d'
type WidgetId =
  | 'kpi_receita' | 'kpi_gasto' | 'kpi_lucro' | 'kpi_roas'
  | 'grafico_receita' | 'activity_feed' | 'melhor_campanha'
  | 'top3_campanhas' | 'cpv_medio' | 'projecao_mes' | 'meta_dia'
  | 'saldo_bcs' | 'saldo_meta' | 'alertas' | 'diario_rapido'
  | 'token_expiry' | 'score_criativos' | 'meta_mes'
type Widget = { id: WidgetId; label: string; visible: boolean }

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'kpi_receita',     label: 'KPI Receita',         visible: true },
  { id: 'kpi_gasto',       label: 'KPI Gasto em Ads',    visible: true },
  { id: 'kpi_lucro',       label: 'KPI Lucro Líquido',   visible: true },
  { id: 'kpi_roas',        label: 'KPI ROAS',            visible: true },
  { id: 'grafico_receita', label: 'Gráfico 14 dias',     visible: true },
  { id: 'activity_feed',   label: 'Atividade em Tempo Real', visible: true },
  { id: 'melhor_campanha', label: 'Melhor Campanha',     visible: true },
  { id: 'top3_campanhas',  label: 'Top 3 Campanhas',     visible: true },
  { id: 'cpv_medio',       label: 'CPV Médio',           visible: true },
  { id: 'projecao_mes',    label: 'Projeção do Mês',     visible: true },
  { id: 'meta_dia',        label: 'Meta do Dia',         visible: true },
  { id: 'saldo_bcs',       label: 'Saldo TikTok BCs',   visible: true },
  { id: 'saldo_meta',      label: 'Saldo Meta Ads',      visible: true },
  { id: 'alertas',         label: 'Alertas',             visible: true },
  { id: 'diario_rapido',   label: 'Diário Rápido',       visible: true },
  { id: 'token_expiry',    label: 'Status dos Tokens',   visible: true },
  { id: 'score_criativos', label: 'Score de Campanhas',  visible: true },
  { id: 'meta_mes',        label: 'Meta do Mês',         visible: true },
]

// ── Helpers ────────────────────────────────────────────────────
const toBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje  = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const diasRestantesNoMes = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 0).getDate() - n.getDate() }
const diasNoMes = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 0).getDate() }
const diaAtual  = () => new Date().getDate()
const calcScore = (r: number) => r >= 3.5 ? 'S' : r >= 2.5 ? 'A' : r >= 1.5 ? 'B' : r >= 0.8 ? 'C' : 'D'
const fmtDia    = (s: string) => { const [,m,d] = s.split('-'); return `${d}/${m}` }
const timeAgo   = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`
  if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}

const SCORE: Record<string, { bg: string; color: string; glow: string }> = {
  S: { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA', glow: '0 0 10px rgba(59,130,246,0.4)' },
  A: { bg: 'rgba(16,185,129,0.12)',  color: '#34D399', glow: '0 0 10px rgba(16,185,129,0.35)' },
  B: { bg: 'rgba(245,158,11,0.12)',  color: '#FCD34D', glow: '0 0 10px rgba(245,158,11,0.3)' },
  C: { bg: 'rgba(244,63,94,0.10)',   color: '#FB7185', glow: '0 0 10px rgba(244,63,94,0.3)' },
  D: { bg: 'rgba(100,100,120,0.08)', color: '#64748B', glow: 'none' },
}

// ── Primitivos ─────────────────────────────────────────────────
const Sk = ({ h = 40, r = 8, mb = 6 }: { h?: number; r?: number; mb?: number }) => (
  <div style={{ height: h, background: `linear-gradient(90deg,${T.bgRaised} 0%,${T.bgHover} 50%,${T.bgRaised} 100%)`, backgroundSize: '200% 100%', borderRadius: r, animation: 'sk 1.4s ease-in-out infinite', marginBottom: mb }} />
)

const ScoreBadge = ({ score, sm }: { score: string; sm?: boolean }) => {
  const s = SCORE[score] ?? SCORE.D
  return (
    <span style={{ width: sm?18:22, height: sm?18:22, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: sm?8:10, fontWeight: 700, fontFamily: T.mono, background: s.bg, color: s.color, boxShadow: s.glow, flexShrink: 0 }}>{score}</span>
  )
}

const Bar = ({ pct, color, h = 4 }: { pct: number; color: string; h?: number }) => (
  <div style={{ height: h, background: T.bgRaised, borderRadius: 99, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}60`, transition: 'width 700ms cubic-bezier(.4,0,.2,1)' }} />
  </div>
)

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E")`

const GridBg = () => (
  <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    {/* Orb azul topo esquerdo */}
    <div style={{ position: 'absolute', top: -150, left: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', filter: 'blur(1px)', animation: 'orbFloat 14s ease-in-out infinite' }}/>
    {/* Orb violeta baixo direito */}
    <div style={{ position: 'absolute', bottom: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)', filter: 'blur(1px)', animation: 'orbFloat 20s ease-in-out infinite reverse' }}/>
    {/* Dot grid */}
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }}/>
  </div>
)

// ── Card Shell ─────────────────────────────────────────────────
const Card = ({ children, style, accentColor }: { children: React.ReactNode; style?: React.CSSProperties; accentColor?: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -999, y: -999 })
  const [hov, setHov] = useState(false)

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPos({ x: -999, y: -999 }) }}
      style={{
        background: 'rgba(10,10,18,0.92)',
        border: `1px solid ${hov && accentColor ? `${accentColor}30` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        height: '100%',
        boxSizing: 'border-box' as const,
        position: 'relative' as const,
        backdropFilter: 'blur(20px)',
        boxShadow: hov ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor || '#3b82f6'}15` : '0 2px 16px rgba(0,0,0,0.3)',
        transition: 'border-color 0.2s, box-shadow 0.25s',
        ...style,
      }}
    >
      {/* Grain */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1, backgroundImage:GRAIN, backgroundSize:'160px 160px', mixBlendMode:'overlay' as const, opacity:0.6 }}/>
      {/* Spotlight mouse */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2, borderRadius:'inherit',
        background: `radial-gradient(240px circle at ${pos.x}px ${pos.y}px, ${accentColor ? `${accentColor}18` : 'rgba(59,130,246,0.12)'}, transparent 65%)`,
        transition: hov ? 'none' : 'background 0.4s',
      }}/>
      {/* Linha topo colorida */}
      {accentColor && (
        <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, zIndex:3,
          background:`linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
          opacity: hov ? 1 : 0.6, transition:'opacity 0.2s',
        }}/>
      )}
      <div style={{ position:'relative', zIndex:4 }}>{children}</div>
    </div>
  )
}

const CardHead = ({ icon: Icon, title, badge, badgeColor = T.accent, color = T.text3 }: {
  icon: React.ElementType; title: string; badge?: string; badgeColor?: string; color?: string
}) => (
  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
    <Icon size={12} style={{ color, flexShrink: 0 }}/>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
    {badge && <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${badgeColor}18`, color: badgeColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, border: `1px solid ${badgeColor}25` }}>{badge}</span>}
  </div>
)

const CardBody = ({ children, p = '12px 16px' }: { children: React.ReactNode; p?: string }) => (
  <div style={{ padding: p }}>{children}</div>
)

// ── KPI Card ───────────────────────────────────────────────────
const KpiCard = ({ label, value, delta, pos, color, icon: Icon, loading, index = 0 }: {
  label: string; value: string; delta: string; pos: boolean; color: string; icon: React.ElementType; loading?: boolean; index?: number
}) => {
  const [hov, setHov] = useState(false)
  return (
    <GlowingEffect color={color} spread={40} blur={16}>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      style={{
        background: 'rgba(10,10,18,0.92)',
        border: `1px solid ${hov ? `${color}30` : 'rgba(255,255,255,0.055)'}`,
        borderRadius: 16,
        padding: '20px 22px',
        position: 'relative' as const,
        overflow: 'hidden',
        height: '100%',
        boxSizing: 'border-box' as const,
        backdropFilter: 'blur(20px)',
        boxShadow: hov ? `0 0 0 1px ${color}15, 0 8px 32px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.22)',
        transition: 'all 200ms ease',
        cursor: 'default',
      }}
    >
      {/* Grain */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: GRAIN, backgroundSize: '160px 160px', mixBlendMode: 'overlay' as const, opacity: 0.7 }}/>
      {/* Glow radial colorido — igual BossFlow */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${color}22 0%, transparent 65%)`, opacity: 1, pointerEvents: 'none', zIndex: 1 }}/>
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${color}0a 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 1 }}/>
      {/* Linha topo colorida */}
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg, transparent, ${color}80, transparent)`, opacity: 1, transition: 'opacity 200ms', zIndex: 2 }}/>

      <div style={{ position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
          <motion.div
            animate={{ rotate: hov ? 10 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon size={14} style={{ color }}/>
          </motion.div>
        </div>

        {loading ? <Sk h={30} mb={12}/> : (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#dcdcf0', lineHeight: 1, marginBottom: 14, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: pos ? T.green : T.red, fontFamily: "'DM Sans', sans-serif" }}>
          {pos ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{delta}</span>
        </div>
      </div>
    </motion.div>
    </GlowingEffect>
  )
}

// ── Sortable Wrapper ───────────────────────────────────────────
const SW = ({ id, editMode, visible, onToggle, children, span = 1, className }: {
  id: string; editMode: boolean; visible: boolean; onToggle: () => void; children: React.ReactNode; span?: number; className?: string
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className={className}
      suppressHydrationWarning
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: `span ${span}`,
        opacity: isDragging ? 0.4 : visible ? 1 : 0.25,
        position: 'relative' as const,
        minWidth: 0,
      }}
      {...attributes}
    >
      {editMode && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, display: 'flex', gap: 3 }}>
          <button onClick={onToggle} style={{ width: 26, height: 26, borderRadius: 7, background: visible ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${visible ? 'rgba(59,130,246,0.3)' : T.border}`, color: visible ? T.accent : T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            {visible ? <Eye size={11}/> : <EyeOff size={11}/>}
          </button>
          <div {...listeners} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', backdropFilter: 'blur(4px)' }}>
            <GripVertical size={11}/>
          </div>
        </div>
      )}
      {(visible || editMode) ? children : null}
    </div>
  )
}

// ── Countdown ring ─────────────────────────────────────────────
const Ring = ({ n }: { n: number }) => {
  const pct = ((300 - n) / 300) * 100
  return (
    <div title={`Atualiza em ${n}s`} style={{ width: 18, height: 18, flexShrink: 0 }}>
      <svg width="18" height="18" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="9" cy="9" r="7" fill="none" stroke={T.borderSub} strokeWidth="1.5"/>
        <circle cx="9" cy="9" r="7" fill="none" stroke={T.accent} strokeWidth="1.5" strokeDasharray={`${2*Math.PI*7}`} strokeDashoffset={`${2*Math.PI*7*(1-pct/100)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}/>
      </svg>
    </div>
  )
}

// ── Tooltip ────────────────────────────────────────────────────
const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: T.bgBase, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 11, fontFamily: T.mono, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
      <p style={{ color: T.text2, marginBottom: 6, fontFamily: T.sans, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }}/>
          <span style={{ color: T.text3, minWidth: 50 }}>{p.name}</span>
          <span style={{ color: T.text1, fontWeight: 600 }}>{toBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Activity Item ──────────────────────────────────────────────
const ActivityItem = ({ type, name, value, time, source, index = 0 }: {
  type: 'venda' | 'lead' | 'pix'; name: string; value?: number; time: string; source?: string; index?: number
}) => {
  const cfg = {
    venda: { color: T.green,  dot: T.green,  label: 'Venda paga'  },
    lead:  { color: '#A78BFA', dot: '#A78BFA', label: 'Novo lead'  },
    pix:   { color: T.yellow, dot: T.yellow, label: 'PIX gerado'   },
  }[type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: `1px solid ${T.borderSub}` }}
    >
      {/* Dot simples */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}`, flexShrink: 0 }}/>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {source && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#93C5FD', fontFamily: T.mono, flexShrink: 0, border: '1px solid rgba(59,130,246,0.2)' }}>{source}</span>}
        </div>
        <span style={{ fontSize: 10, color: T.text3 }}>{cfg.label}</span>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {value !== undefined && <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: cfg.color, letterSpacing: '-0.02em', marginBottom: 1 }}>{toBRL(value)}</div>}
        <div style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{time}</div>
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────
function useIsMobile() {
  const [mob, setMob] = useState(false)
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 769)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mob
}

export default function OverviewPage() {
  const { active: workspace } = useWorkspaceStore()
  const isMobile = useIsMobile()
  const [period, setPeriod]     = useState<Period>('hoje')
  const [editMode, setEditMode] = useState(false)
  const [compact, setCompact]   = useState(false)
  const [widgets, setWidgets]   = useState<Widget[]>(DEFAULT_WIDGETS)
  const [nextRefresh, setNextRefresh] = useState(300)
  const [refreshing, setRefreshing]   = useState(false)
  const [nota, setNota]               = useState('')
  const [notaSalva, setNotaSalva]     = useState(false)

  // Loading states
  const [lKpi, setLKpi]     = useState(true)
  const [lBcs, setLBcs]     = useState(true)
  const [lCamp, setLCamp]   = useState(true)
  const [lMeta, setLMeta]   = useState(true)
  const [lFeed, setLFeed]   = useState(true)
  const [lChart, setLChart] = useState(true)

  // Data
  const [kpi, setKpi]             = useState<any>(null)
  const [bcs, setBcs]             = useState<any[]>([])
  const [metaAccs, setMetaAccs]   = useState<any[]>([])
  const [metaConns, setMetaConns] = useState<any[]>([])
  const [criativos, setCriativos] = useState<any[]>([])
  const [melhor, setMelhor]       = useState<any>(null)
  const [meta, setMeta]           = useState<any>(null)
  const [feed, setFeed]           = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  useEffect(() => {
    if (!workspace?.id) return
    const s = localStorage.getItem(`tiotrack_layout_v2_${workspace.id}`)
    if (s) { try { setWidgets(JSON.parse(s)) } catch {} }
    const c = localStorage.getItem(`tiotrack_compact_${workspace.id}`)
    if (c) setCompact(c === 'true')
  }, [workspace?.id])

  const save = (nw: Widget[]) => { setWidgets(nw); if (workspace?.id) localStorage.setItem(`tiotrack_layout_v2_${workspace.id}`, JSON.stringify(nw)) }
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) { const o = widgets.findIndex(w => w.id === active.id); const n = widgets.findIndex(w => w.id === over.id); save(arrayMove(widgets, o, n)) }
  }
  const toggle = (id: WidgetId) => save(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  const toggleCompact = () => { const n = !compact; setCompact(n); if (workspace?.id) localStorage.setItem(`tiotrack_compact_${workspace.id}`, String(n)) }

  const loadKpi = useCallback(async (wid: string, p: Period) => {
    setLKpi(true)
    const diff = p === 'hoje' ? 1 : p === '7d' ? 7 : 30
    const from = diasAtras(diff), prev = diasAtras(diff * 2), h = hoje()
    const [sR, pR, vR, pvR] = await Promise.all([
      supabase.from('ad_spend_daily').select('spend,conversion_value').eq('workspace_id', wid).gte('dia', from).lte('dia', h),
      supabase.from('ad_spend_daily').select('spend,conversion_value').eq('workspace_id', wid).gte('dia', prev).lt('dia', from),
      supabase.from('conversions').select('valor').eq('workspace_id', wid).eq('status', 'paid').gte('dia', from).lte('dia', h),
      supabase.from('conversions').select('valor').eq('workspace_id', wid).eq('status', 'paid').gte('dia', prev).lt('dia', from),
    ])
    const ts = sR.data?.reduce((s: number, r: any) => s + (r.spend ?? 0), 0) ?? 0
    const tr = vR.data?.reduce((s: number, r: any) => s + (r.valor ?? 0), 0) ?? sR.data?.reduce((s: number, r: any) => s + (r.conversion_value ?? 0), 0) ?? 0
    const ps = pR.data?.reduce((s: number, r: any) => s + (r.spend ?? 0), 0) ?? 0
    const pr = pvR.data?.reduce((s: number, r: any) => s + (r.valor ?? 0), 0) ?? 0
    const pct = (c: number, p2: number) => p2 > 0 ? Math.round(((c - p2) / p2) * 100) : 0
    const ro = ts > 0 ? tr / ts : 0, pro = ps > 0 ? pr / ps : 0
    setKpi({ receita: tr, gasto: ts, lucro: tr - ts, roas: ro, dR: pct(tr, pr), dG: pct(ts, ps), dL: pct(tr - ts, pr - ps), dRo: Math.round((ro - pro) * 100) / 100 })
    setLKpi(false)
  }, [])

  const loadBcs = useCallback(async (wid: string) => {
    setLBcs(true)
    const [{ data: tk }, { data: ma }, { data: mc }] = await Promise.all([
      supabase.from('advertiser_accounts').select('advertiser_id,nome,balance,status,bc_configs(apelido)').eq('workspace_id', wid),
      (supabase as any).from('meta_ad_accounts').select('account_id,nome,balance,currency,status').eq('workspace_id', wid),
      (supabase as any).from('meta_connections').select('id,fb_user_id,fb_user_name,updated_at').eq('workspace_id', wid),
    ])
    setBcs((tk ?? []).map((a: any) => ({ nome: a.bc_configs?.apelido ?? 'BC', adv: `#${a.advertiser_id?.slice(-4)}`, balance: a.balance ?? 0, warn: (a.balance ?? 0) < 100 })))
    setMetaAccs(ma ?? [])
    setMetaConns(mc ?? [])
    setLBcs(false)
  }, [])

  const loadCamp = useCallback(async (wid: string) => {
    setLCamp(true)
    const { data } = await supabase.from('ad_spend_daily').select('campaign_name,spend,conversion_value').eq('workspace_id', wid).gte('dia', diasAtras(7)).not('campaign_name', 'is', null)
    const map: Record<string, { s: number; r: number }> = {}
    ;(data ?? []).forEach((r: any) => { if (!r.campaign_name) return; if (!map[r.campaign_name]) map[r.campaign_name] = { s: 0, r: 0 }; map[r.campaign_name].s += r.spend ?? 0; map[r.campaign_name].r += r.conversion_value ?? 0 })
    const camps = Object.entries(map).map(([nome, v]) => ({ nome, spend: v.s, roas: v.s > 0 ? v.r / v.s : 0, score: calcScore(v.s > 0 ? v.r / v.s : 0) })).filter(c => c.spend > 0).sort((a, b) => b.roas - a.roas)
    setCriativos(camps.slice(0, 6)); setMelhor(camps[0] ?? null)
    setLCamp(false)
  }, [])

  const loadMeta = useCallback(async (wid: string) => {
    setLMeta(true)
    const h = hoje(), im = new Date(); im.setDate(1)
    const [pr, mr, hr] = await Promise.all([
      supabase.from('user_prefs').select('meta_mensal_brl').eq('workspace_id', wid).single(),
      supabase.from('conversions').select('valor').eq('workspace_id', wid).eq('status', 'paid').gte('dia', im.toISOString().split('T')[0]),
      supabase.from('conversions').select('valor').eq('workspace_id', wid).eq('status', 'paid').eq('dia', h),
    ])
    setMeta({
      metaMensal: pr.data?.meta_mensal_brl ?? 0,
      receitaMes: mr.data?.reduce((s: number, r: any) => s + (r.valor ?? 0), 0) ?? 0,
      receitaHoje: hr.data?.reduce((s: number, r: any) => s + (r.valor ?? 0), 0) ?? 0,
      diasRestantes: diasRestantesNoMes(),
    })
    setLMeta(false)
  }, [])

  const loadFeed = useCallback(async (wid: string, p: Period = 'hoje') => {
    setLFeed(true)
    const diff = p === 'hoje' ? 1 : p === '7d' ? 7 : 30
    const from = diasAtras(diff)
    const h    = hoje()
    const fromTs = new Date(); fromTs.setDate(fromTs.getDate() - diff)
    const [{ data: vendas }, { data: pendentes }, { data: leads }] = await Promise.all([
      supabase.from('conversions').select('id,created_at,customer_name,valor,utm_source').eq('workspace_id', wid).eq('status', 'paid').gte('dia', from).lte('dia', h).order('created_at', { ascending: false }).limit(10),
      supabase.from('conversions').select('id,created_at,customer_name,valor').eq('workspace_id', wid).eq('status', 'pending').gte('dia', from).lte('dia', h).order('created_at', { ascending: false }).limit(10),
      (supabase as any).from('leads').select('id,created_at,first_name,last_name,utm_source').eq('workspace_id', wid).gte('created_at', fromTs.toISOString()).order('created_at', { ascending: false }).limit(10),
    ])
    const items: any[] = [
      ...(vendas ?? []).map((v: any) => ({ ...v, _type: 'venda', _ts: new Date(v.created_at).getTime() })),
      ...(pendentes ?? []).map((v: any) => ({ ...v, _type: 'pix', _ts: new Date(v.created_at).getTime() })),
      ...((leads as any) ?? []).map((l: any) => ({ ...l, _type: 'lead', _ts: new Date(l.created_at).getTime() })),
    ].sort((a, b) => b._ts - a._ts).slice(0, 12)
    setFeed(items)
    setLFeed(false)
  }, [])

  const loadChart = useCallback(async (wid: string) => {
    setLChart(true)
    const [{ data: sp }, { data: sal }] = await Promise.all([
      supabase.from('ad_spend_daily').select('dia,spend').eq('workspace_id', wid).gte('dia', diasAtras(13)).lte('dia', hoje()).order('dia', { ascending: true }),
      supabase.from('conversions').select('dia,valor').eq('workspace_id', wid).eq('status', 'paid').gte('dia', diasAtras(13)).lte('dia', hoje()),
    ])
    const map: Record<string, { g: number; r: number }> = {}
    for (let i = 13; i >= 0; i--) { const d = diasAtras(i); map[d] = { g: 0, r: 0 } }
    ;(sp ?? []).forEach((r: any) => { if (map[r.dia]) map[r.dia].g += r.spend ?? 0 })
    ;(sal ?? []).forEach((r: any) => { if (r.dia && map[r.dia]) map[r.dia].r += r.valor ?? 0 })
    setChartData(Object.entries(map).map(([dia, v]) => ({ dia: fmtDia(dia), Receita: Math.round(v.r), Gasto: Math.round(v.g) })))
    setLChart(false)
  }, [])

  const loadAll = useCallback((wid: string, p: Period, silent = false) => {
    if (!silent) setRefreshing(true)
    Promise.all([loadKpi(wid, p), loadBcs(wid), loadCamp(wid), loadMeta(wid), loadFeed(wid, p), loadChart(wid)])
      .finally(() => setRefreshing(false))
  }, [loadKpi, loadBcs, loadCamp, loadMeta, loadFeed, loadChart])

  useEffect(() => { if (workspace?.id) loadAll(workspace.id, period) }, [workspace?.id, period])

  useEffect(() => {
    if (!workspace?.id) return
    setNextRefresh(300)
    const c = setInterval(() => setNextRefresh(n => n <= 1 ? 300 : n - 1), 1000)
    const r = setInterval(() => { if (workspace?.id) loadAll(workspace.id, period, true) }, 300000)
    return () => { clearInterval(c); clearInterval(r) }
  }, [workspace?.id, period])

  const handleRefresh = () => { if (!workspace?.id) return; setNextRefresh(300); loadAll(workspace.id, period, true) }

  async function salvarNota() {
    if (!workspace?.id || !nota.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('operation_log').insert({ workspace_id: workspace.id, user_id: user.id, dia: hoje(), conteudo: nota, tipo: 'observacao' })
    setNota(''); setNotaSalva(true); setTimeout(() => setNotaSalva(false), 2000)
  }

  // Alertas — ignora contas com saldo 0 (inativas)
  const alertas = [
    ...bcs.filter(b => b.warn && b.balance > 0).map(b => ({ tipo: 'warn', msg: `${b.nome} — saldo baixo (${toBRL(b.balance)})`, plat: 'tiktok' })),
    ...metaAccs.filter(a => (a.balance ?? 0) > 0 && (a.balance ?? 0) < 20).map(a => ({ tipo: 'warn', msg: `${a.nome} — saldo baixo`, plat: 'meta' })),
    ...(meta?.metaMensal > 0 && meta.receitaMes / meta.metaMensal < 0.3 && diaAtual() > 15 ? [{ tipo: 'danger', msg: `Meta do mês em risco — apenas ${Math.round(meta.receitaMes / meta.metaMensal * 100)}% atingido`, plat: 'geral' }] : []),
    ...metaConns.filter((c: any) => { const dias = c.updated_at ? Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000) : 0; return dias > 45 }).map((c: any) => ({ tipo: 'warn', msg: `Token Meta (${c.fb_user_name}) expira em breve`, plat: 'meta' })),
  ]

  const metaPct      = meta?.metaMensal ? Math.min(Math.round(meta.receitaMes / meta.metaMensal * 100), 100) : 0
  const metaStatus   = metaPct >= 100 ? { l: 'Meta batida! 🎉', c: T.green } : metaPct >= 70 ? { l: 'No ritmo ✓', c: T.accent } : { l: 'Atenção', c: T.yellow }
  const metaDiaria   = meta?.metaMensal && diasNoMes() > 0 ? meta.metaMensal / diasNoMes() : 0
  const diaStatus    = metaDiaria > 0 ? Math.min(Math.round((meta?.receitaHoje ?? 0) / metaDiaria * 100), 100) : 0
  const diaSt        = diaStatus >= 100 ? { l: 'Meta batida! 🎉', c: T.green } : diaStatus >= 60 ? { l: 'No ritmo', c: T.accent } : { l: 'Abaixo', c: T.yellow }
  const ritmo        = diaAtual() > 0 ? (meta?.receitaMes ?? 0) / diaAtual() : 0
  const projecao     = ritmo * diasNoMes()
  const projPct      = meta?.metaMensal > 0 ? Math.min(Math.round(projecao / meta.metaMensal * 100), 150) : 0
  const projSt       = projecao >= (meta?.metaMensal ?? 0) ? { l: 'Vai bater a meta', c: T.green } : projecao >= (meta?.metaMensal ?? 0) * 0.8 ? { l: 'Próximo da meta', c: T.yellow } : { l: 'Abaixo da meta', c: T.red }
  const totalTk      = bcs.reduce((s: number, b: any) => s + (b.balance ?? 0), 0)
  const totalMeta    = metaAccs.reduce((s: number, a: any) => s + (a.balance ?? 0), 0)
  const maxRoas      = criativos[0]?.roas || 1
  const vendas       = feed.filter(f => f._type === 'venda')

  const KPI = [
    { id: 'kpi_receita' as WidgetId, label: 'Receita',      value: toBRL(kpi?.receita ?? 0), delta: `${(kpi?.dR ?? 0) >= 0 ? '+' : ''}${kpi?.dR ?? 0}% vs anterior`, pos: (kpi?.dR ?? 0) >= 0, color: T.green,  icon: TrendingUp   },
    { id: 'kpi_gasto'   as WidgetId, label: 'Gasto em Ads', value: toBRL(kpi?.gasto ?? 0),   delta: `${(kpi?.dG ?? 0) >= 0 ? '+' : ''}${kpi?.dG ?? 0}% vs anterior`, pos: (kpi?.dG ?? 0) <= 0, color: T.red,    icon: TrendingDown },
    { id: 'kpi_lucro'   as WidgetId, label: 'Lucro',        value: toBRL(kpi?.lucro ?? 0),   delta: `${(kpi?.dL ?? 0) >= 0 ? '+' : ''}${kpi?.dL ?? 0}% vs anterior`, pos: (kpi?.dL ?? 0) >= 0, color: T.accent, icon: TrendingUp   },
    { id: 'kpi_roas'    as WidgetId, label: 'ROAS',         value: `${(kpi?.roas ?? 0).toFixed(2)}x`, delta: `${(kpi?.dRo ?? 0) >= 0 ? '+' : ''}${kpi?.dRo ?? 0}x vs anterior`, pos: (kpi?.dRo ?? 0) >= 0, color: T.purple, icon: Zap },
  ]
  const getW = (id: WidgetId) => widgets.find(w => w.id === id)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bgBase, position: 'relative' }}>
      <GridBg/>

      {/* Topbar */}
      <div style={{ height: 50, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0, background: 'rgba(7,8,18,0.92)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.04em', fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>Overview</span>
        {alertas.length > 0 && (
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(244,63,94,0.12)', color: T.red, fontFamily: T.mono, fontWeight: 700, border: '1px solid rgba(244,63,94,0.2)' }}>
            {alertas.length} alerta{alertas.length > 1 ? 's' : ''}
          </span>
        )}
        <div style={{ flex: 1 }}/>
        <Ring n={nextRefresh}/>
        {!isMobile && <button onClick={toggleCompact} style={{ width: 30, height: 30, borderRadius: 8, background: compact ? T.accentGlow : 'rgba(255,255,255,0.04)', border: `1px solid ${compact ? T.borderGlow : T.border}`, color: compact ? T.accentLight : T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 160ms' }}>
          {compact ? <Maximize2 size={12}/> : <Minimize2 size={12}/>}
        </button>}
        {!isMobile && <button onClick={() => setEditMode(e => !e)} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: editMode ? T.accentGlow : 'rgba(255,255,255,0.04)', border: `1px solid ${editMode ? T.borderGlow : T.border}`, color: editMode ? T.accentLight : T.text2, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontWeight: 500, transition: 'all 160ms' }}>
          {editMode ? <><Check size={11}/> Salvar</> : <><Settings2 size={11}/> Editar</>}
        </button>}
        {(['hoje', '7d', '30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: period === p ? T.accentGlow : 'transparent', border: `1px solid ${period === p ? T.borderGlow : T.border}`, color: period === p ? T.accentLight : T.text2, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 600 : 400, transition: 'all 160ms' }}>
            {p === 'hoje' ? 'Hoje' : p}
          </button>
        ))}
        <button onClick={handleRefresh} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '12px 16px' : '16px 20px', position: 'relative', zIndex: 1 }}>
        {editMode && (
          <div style={{ marginBottom: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', fontSize: 12, color: T.accentLight, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GripVertical size={14}/> Arraste pra reorganizar · 👁 mostrar/ocultar
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: compact ? 8 : 10,
              alignItems: 'start',
            }}>

              {widgets.map(widget => {
                const w = getW(widget.id)

                // KPIs
                if (['kpi_receita','kpi_gasto','kpi_lucro','kpi_roas'].includes(widget.id)) {
                  const cfg = KPI.find(k => k.id === widget.id)!
                  return (
                    <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)}>
                      <KpiCard label={cfg.label} value={cfg.value} delta={cfg.delta} pos={cfg.pos} color={cfg.color} icon={cfg.icon} loading={lKpi} index={KPI.indexOf(cfg)}/>
                    </SW>
                  )
                }

                // Gráfico
                if (widget.id === 'grafico_receita') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 4}>
                    <Card accentColor="#34d399">
                      <CardHead icon={BarChart2} title="Receita vs Gasto — 14 dias" badge="14d" badgeColor={T.text3} color={T.accent}/>
                      <CardBody p="12px 16px 16px">
                        {lChart ? <Sk h={compact ? 90 : 150}/> : (
                          <ResponsiveContainer width="100%" height={compact ? 90 : 150}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.2}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.red} stopOpacity={0.12}/><stop offset="100%" stopColor={T.red} stopOpacity={0}/></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={T.borderSub} vertical={false}/>
                              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false}/>
                              <YAxis tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={40}/>
                              <RTooltip content={<CT/>}/>
                              <Area type="monotone" dataKey="Receita" stroke={T.green} fill="url(#gR)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: T.green }}/>
                              <Area type="monotone" dataKey="Gasto" stroke={T.red} fill="url(#gG)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: T.red }}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Activity Feed
                if (widget.id === 'activity_feed') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 4}>
                    <Card accentColor="#60a5fa">
                      <CardHead icon={Activity} title="Atividade em tempo real" badge="ao vivo" badgeColor={T.green} color={T.green}/>
                      <CardBody p="0 16px 4px">
                        {lFeed ? <>{[1,2,3,4].map(i => <Sk key={i} h={52} r={8} mb={4}/>)}</> : feed.length === 0 ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '20px 0' }}>Nenhuma atividade ainda.</p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0 24px' }}>
                            {feed.map((item: any, i: number) => {
                              const name = item._type === 'lead'
                                ? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.username || 'Lead'
                                : item.customer_name || 'Cliente'
                              return (
                                <ActivityItem
                                  key={item.id ?? i}
                                  type={item._type}
                                  name={name}
                                  value={item.valor}
                                  time={timeAgo(item.created_at)}
                                  source={item.utm_source}
                                  index={i}
                                />
                              )
                            })}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Melhor campanha
                if (widget.id === 'melhor_campanha') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card accentColor="#fbbf24">
                      <CardHead icon={Trophy} title="Melhor campanha" badge="7d" badgeColor={T.green} color={T.yellow}/>
                      <CardBody>
                        {lCamp ? <Sk h={80}/> : !melhor ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>Sem dados ainda.</p>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                              <ScoreBadge score={melhor.score}/>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{melhor.nome}</div>
                                <div style={{ fontSize: 10, color: T.text3 }}>Maior ROAS nos últimos 7 dias</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: melhor.roas >= 1.5 ? T.green : T.red, letterSpacing: '-0.03em' }}>{melhor.roas.toFixed(2)}x</div>
                                <div style={{ fontSize: 9, color: T.text3 }}>ROAS</div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {[
                                { l: 'Gasto', v: toBRL(melhor.spend) },
                                { l: 'Score', v: `${melhor.score} — ${melhor.score==='S'?'Excelente':melhor.score==='A'?'Muito bom':melhor.score==='B'?'Bom':melhor.score==='C'?'Regular':'Pausar'}`, c: (SCORE[melhor.score]??SCORE.D).color },
                              ].map(({ l, v, c }) => (
                                <div key={l} style={{ background: T.bgRaised, borderRadius: 10, padding: '10px 12px' }}>
                                  <div style={{ fontSize: 10, color: T.text3, marginBottom: 4 }}>{l}</div>
                                  <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: c ?? T.text1 }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Top 3
                if (widget.id === 'top3_campanhas') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card accentColor="#a78bfa">
                      <CardHead icon={BarChart2} title="Top 3 campanhas" badge="ROAS" badgeColor={T.accent} color={T.accent}/>
                      <CardBody>
                        {lCamp ? <>{[1,2,3].map(i => <Sk key={i} h={36}/>)}</> : criativos.slice(0,3).length === 0 ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>Sem dados ainda.</p>
                        ) : criativos.slice(0,3).map((c: any, i: number) => (
                          <div key={i} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono, minWidth: 16 }}>{String(i+1).padStart(2,'0')}</span>
                              <ScoreBadge score={c.score} sm/>
                              <span style={{ fontSize: 12, color: T.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                              <span style={{ fontFamily: T.mono, fontSize: 12, color: c.roas >= 1.5 ? T.green : T.red, fontWeight: 700 }}>{c.roas.toFixed(2)}x</span>
                            </div>
                            <div style={{ paddingLeft: 24 }}>
                              <Bar pct={maxRoas > 0 ? (c.roas / maxRoas) * 100 : 0} color={c.roas >= 1.5 ? T.green : T.yellow} h={3}/>
                            </div>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // CPV
                if (widget.id === 'cpv_medio') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)}>
                    <Card>
                      <CardHead icon={Percent} title="CPV médio" color={T.purple}/>
                      <CardBody>
                        {lKpi || lFeed ? <Sk h={60}/> : (
                          <div>
                            <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text1, letterSpacing: '-0.03em', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                              {kpi?.gasto > 0 && vendas.length > 0 ? toBRL(kpi.gasto / vendas.length) : '—'}
                            </div>
                            <div style={{ fontSize: 11, color: T.text3, marginBottom: 12 }}>custo por venda paga</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <div style={{ background: T.bgRaised, borderRadius: 8, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: T.text3, marginBottom: 2 }}>Vendas</div>
                                <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.text1 }}>{vendas.length}</div>
                              </div>
                              <div style={{ background: T.bgRaised, borderRadius: 8, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: T.text3, marginBottom: 2 }}>ROAS</div>
                                <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: (kpi?.roas ?? 0) >= 1.5 ? T.green : T.red }}>{(kpi?.roas ?? 0).toFixed(2)}x</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Projeção
                if (widget.id === 'projecao_mes') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)}>
                    <Card>
                      <CardHead icon={TrendingUp} title="Projeção" color={T.accent}/>
                      <CardBody>
                        {lMeta ? <Sk h={80}/> : meta?.metaMensal > 0 ? (
                          <div>
                            <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: projSt.c, letterSpacing: '-0.03em', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{toBRL(projecao)}</div>
                            <div style={{ fontSize: 11, color: T.text3, marginBottom: 12 }}>{toBRL(ritmo)}/dia de ritmo</div>
                            <Bar pct={projPct} color={projSt.c} h={4}/>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                              <span style={{ fontSize: 10, color: projSt.c, fontWeight: 600 }}>{projSt.l}</span>
                              <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{projPct}%</span>
                            </div>
                          </div>
                        ) : <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>Configure a meta.</p>}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Meta dia
                if (widget.id === 'meta_dia') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)}>
                    <Card>
                      <CardHead icon={Calendar} title="Meta do dia" badge={`${diaAtual()}/${diasNoMes()}`} badgeColor={T.text3} color={T.accent}/>
                      <CardBody>
                        {lMeta ? <Sk h={80}/> : meta?.metaMensal > 0 ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: diaSt.c, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{toBRL(meta?.receitaHoje ?? 0)}</div>
                              <div style={{ fontSize: 11, color: T.text3 }}>de {toBRL(metaDiaria)}</div>
                            </div>
                            <div style={{ fontSize: 11, color: T.text3, marginBottom: 12 }}>receita hoje</div>
                            <Bar pct={diaStatus} color={diaSt.c} h={4}/>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                              <span style={{ fontSize: 10, color: diaSt.c, fontWeight: 600 }}>{diaSt.l}</span>
                              <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{diaStatus}%</span>
                            </div>
                          </div>
                        ) : <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>Configure a meta.</p>}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Saldo TikTok
                if (widget.id === 'saldo_bcs') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={Zap} title="Saldo TikTok Ads" badge={toBRL(totalTk)} badgeColor={bcs.some(b=>b.warn&&b.balance>0)?T.yellow:T.green} color={T.text2}/>
                      <CardBody>
                        {lBcs ? <>{[1,2].map(i=><Sk key={i} h={34}/>)}</> : bcs.length === 0 ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '12px 0' }}>Nenhuma BC conectada.</p>
                        ) : bcs.map((b: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < bcs.length-1 ? `1px solid ${T.borderSub}` : 'none' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.warn && b.balance > 0 ? T.yellow : b.balance > 0 ? T.green : T.text3, boxShadow: b.balance > 0 ? `0 0 5px ${b.warn?T.yellow:T.green}` : 'none', flexShrink: 0 }}/>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: T.text1 }}>{b.nome}</div>
                              <div style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{b.adv}</div>
                            </div>
                            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: b.warn&&b.balance>0?T.yellow:T.text1 }}>{toBRL(b.balance)}</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Saldo Meta
                if (widget.id === 'saldo_meta') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={TrendingUp} title="Saldo Meta Ads" badge={toBRL(totalMeta)} badgeColor={metaAccs.some(a=>(a.balance??0)>0&&(a.balance??0)<20)?T.yellow:T.green} color={'#1877F2'}/>
                      <CardBody>
                        {lBcs ? <>{[1,2].map(i=><Sk key={i} h={34}/>)}</> : metaAccs.filter(a=>(a.balance??0)>0).length===0 ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '12px 0' }}>Nenhuma conta com saldo.</p>
                        ) : metaAccs.filter(a=>(a.balance??0)>0).slice(0,5).map((a: any, i: number, arr) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i<arr.length-1?`1px solid ${T.borderSub}`:'none' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: (a.balance??0)<20?T.yellow:T.green, boxShadow: `0 0 5px ${(a.balance??0)<20?T.yellow:T.green}`, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, color: T.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
                            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: (a.balance??0)<20?T.yellow:T.text1 }}>{a.balance!==null?toBRL(a.balance):'—'}</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Alertas
                if (widget.id === 'alertas') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={Bell} title="Alertas" badge={alertas.length>0?`${alertas.length} ativo${alertas.length>1?'s':''}`:'Tudo OK'} badgeColor={alertas.length>0?T.red:T.green} color={alertas.length>0?T.red:T.green}/>
                      <CardBody>
                        {alertas.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}` }}/>
                            <span style={{ fontSize: 12, color: T.green, fontWeight: 500 }}>Nenhum alerta ativo</span>
                          </div>
                        ) : alertas.map((a: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: i<alertas.length-1?`1px solid ${T.borderSub}`:'none' }}>
                            <AlertTriangle size={12} style={{ color: a.tipo==='danger'?T.red:T.yellow, marginTop: 1, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, color: a.tipo==='danger'?T.red:T.yellow, lineHeight: 1.5 }}>{a.msg}</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Diário
                if (widget.id === 'diario_rapido') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={BookOpen} title="Diário rápido" badge="hoje" badgeColor={T.text3} color={T.accent}/>
                      <CardBody>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && salvarNota()}
                            placeholder="O que aconteceu hoje? (Enter pra salvar)"
                            style={{ flex: 1, height: 36, padding: '0 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 9, color: T.text1, fontSize: 12, outline: 'none', fontFamily: T.sans, transition: 'border-color 160ms' }}
                          />
                          <button onClick={salvarNota} disabled={!nota.trim()} style={{ height: 36, padding: '0 16px', borderRadius: 9, background: notaSalva ? T.green : T.accent, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 300ms', flexShrink: 0 }}>
                            {notaSalva ? '✓' : 'Salvar'}
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: T.text3, marginTop: 8 }}>Salvo em Relatórios → Diário de operação.</p>
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Tokens
                if (widget.id === 'token_expiry') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={Key} title="Status dos tokens" color={T.accent}/>
                      <CardBody>
                        {lBcs ? <Sk h={60}/> : (
                          <div>
                            {bcs.length === 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.borderSub}` }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.text3 }}/>
                                <span style={{ fontSize: 12, color: T.text3 }}>Nenhuma BC TikTok</span>
                              </div>
                            ) : bcs.slice(0,3).map((b: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${T.borderSub}` }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 4px ${T.green}` }}/>
                                <span style={{ fontSize: 12, color: T.text1, flex: 1 }}>TikTok — {b.nome}</span>
                                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: T.green, fontFamily: T.mono }}>ativo</span>
                              </div>
                            ))}
                            {metaConns.length === 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.text3 }}/>
                                <span style={{ fontSize: 12, color: T.text3 }}>Nenhuma conta Meta</span>
                              </div>
                            ) : metaConns.map((c: any, i: number) => {
                              const dias = c.updated_at ? Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000) : 0
                              const restam = Math.max(0, 60 - dias)
                              const st = restam > 15 ? { c: T.green, l: 'ativo' } : restam > 0 ? { c: T.yellow, l: `${restam}d` } : { c: T.red, l: 'expirado' }
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: `1px solid ${T.borderSub}` }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.c, boxShadow: `0 0 4px ${st.c}` }}/>
                                  <span style={{ fontSize: 12, color: T.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Meta — {c.fb_user_name}</span>
                                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${st.c}15`, color: st.c, fontFamily: T.mono }}>{st.l}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Score
                if (widget.id === 'score_criativos') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 2}>
                    <Card>
                      <CardHead icon={TrendingUp} title="Score de campanhas" badge="7d" badgeColor={T.purple} color={T.purple}/>
                      <CardBody>
                        {lCamp ? <>{[1,2,3].map(i=><Sk key={i} h={32}/>)}</> : criativos.length===0 ? (
                          <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>Sem dados ainda.</p>
                        ) : criativos.map((c: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i<criativos.length-1?`1px solid ${T.borderSub}`:'none' }}>
                            <ScoreBadge score={c.score} sm/>
                            <span style={{ fontSize: 12, color: T.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: c.roas>=1.5?T.green:T.red }}>{c.roas.toFixed(2)}x</div>
                              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.text3 }}>{toBRL(c.spend)}</div>
                            </div>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </SW>
                )

                // Meta mês
                if (widget.id === 'meta_mes') return (
                  <SW key={widget.id} id={widget.id} editMode={editMode} visible={w.visible} onToggle={() => toggle(widget.id)} span={isMobile ? 2 : 4}>
                    {lMeta ? <Sk h={80} r={14}/> : meta?.metaMensal > 0 ? (
                      <Card>
                        <CardBody p="18px 20px">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                              <p style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}>Meta do mês</p>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.text1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{toBRL(meta.receitaMes)}</span>
                                <span style={{ fontSize: 13, color: T.text3 }}>de {toBRL(meta.metaMensal)}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${metaStatus.c}15`, color: metaStatus.c, fontFamily: T.mono, fontWeight: 700, border: `1px solid ${metaStatus.c}30` }}>{metaStatus.l}</span>
                              <p style={{ fontSize: 11, color: T.text3, marginTop: 8 }}>{meta.diasRestantes} dias restantes</p>
                            </div>
                          </div>
                          <Bar pct={metaPct} color={metaStatus.c} h={5}/>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                            <span style={{ fontSize: 11, color: T.text3 }}>{metaPct}% da meta</span>
                            <span style={{ fontSize: 11, color: T.text3 }}>Precisa de <span style={{ fontFamily: T.mono, color: T.text2, fontWeight: 600 }}>{meta.diasRestantes>0?toBRL(Math.round((meta.metaMensal-meta.receitaMes)/meta.diasRestantes)):'—'}/dia</span></span>
                          </div>
                        </CardBody>
                      </Card>
                    ) : !lMeta && (
                      <div style={{ background: T.bgSurface, border: `1px dashed ${T.border}`, borderRadius: 14, padding: '18px', textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: T.text3 }}>Configure sua meta em <span style={{ color: T.accent }}>Configurações</span>.</p>
                      </div>
                    )}
                  </SW>
                )

                return null
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <style>{`
        @keyframes sk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes orbFloat { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(12px,-16px) scale(1.06) } }
        @keyframes shimmerSweep { 0%,100% { background-position: 200% center } 50% { background-position: -200% center } }

      `}</style>
    </div>
  )
}
