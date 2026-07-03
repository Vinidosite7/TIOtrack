'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, animate as fmAnimate } from 'framer-motion'
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  Zap, GripVertical, Eye, EyeOff, Settings2, Check,
  Trophy, Minimize2, Maximize2,
  BookOpen, Bell, Key, BarChart2, Percent, Activity,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'

// ─── Tokens (igual BossFlow) ──────────────────────────────────
const T = {
  bg:        '#0b0f14',
  card:      'rgba(15,22,35,0.98)',
  border:    'rgba(148,163,184,0.08)',
  borderMid: 'rgba(148,163,184,0.14)',
  text:      '#e2e8f0',
  sub:       '#94a3b8',
  muted:     '#475569',
  green:     '#10b981',
  red:       '#ef4444',
  blue:      '#3b82f6',
  amber:     '#f59e0b',
  purple:    '#7c6ef7',
  cyan:      '#22d3ee',
  mono:      "'JetBrains Mono', monospace",
  sans:      "'DM Sans', sans-serif",
  display:   "'Syne', sans-serif",
}

const cardBase: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
  overflow: 'hidden',
  position: 'relative',
}

// ─── Types ────────────────────────────────────────────────────
type Period   = 'hoje' | '7d' | '30d'
type WidgetId = 'kpi_receita' | 'kpi_gasto' | 'kpi_lucro' | 'kpi_roas'
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

// ─── Helpers ──────────────────────────────────────────────────
const toBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje  = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const diasNoMes = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 0).getDate() }
const diaAtual  = () => new Date().getDate()
const calcScore = (r: number) => r >= 3.5 ? 'S' : r >= 2.5 ? 'A' : r >= 1.5 ? 'B' : r >= 0.8 ? 'C' : 'D'
const fmtDia    = (s: string) => { const [,m,d] = s.split('-'); return `${d}/${m}` }
const timeAgo   = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`
  if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}

const SCORE: Record<string, { bg: string; color: string }> = {
  S: { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  A: { bg: 'rgba(16,185,129,0.12)',  color: '#34D399' },
  B: { bg: 'rgba(245,158,11,0.12)',  color: '#FCD34D' },
  C: { bg: 'rgba(244,63,94,0.10)',   color: '#FB7185' },
  D: { bg: 'rgba(100,100,120,0.08)', color: '#64748B' },
}

// ─── Animated Number (igual BossFlow) ─────────────────────────
function AnimNum({ value, format }: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(format(0))
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current; prev.current = value
    const ctrl = fmAnimate(from, value, {
      duration: 0.9, ease: 'easeOut',
      onUpdate: v => setDisplay(format(v)),
    })
    return ctrl.stop
  }, [value])
  return <span>{display}</span>
}

// ─── Skeleton ─────────────────────────────────────────────────
const Sk = ({ h = 40, r = 8, mb = 6 }: { h?: number; r?: number; mb?: number }) => (
  <div style={{
    height: h, borderRadius: r, marginBottom: mb,
    background: `linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)`,
    backgroundSize: '200% 100%', animation: 'sk 1.4s ease-in-out infinite',
  }}/>
)

// ─── GlowCorner (igual BossFlow) ──────────────────────────────
function GlowCorner({ color }: { color: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: -24, right: -24,
      width: 130, height: 130, borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: 'blur(18px)', pointerEvents: 'none', zIndex: 0,
    }}/>
  )
}

// ─── SpotlightCard (igual BossFlow, sem Tailwind) ─────────────
function SCard({ children, style = {}, glowColor = 'rgba(124,110,247,0.12)' }: {
  children: React.ReactNode; style?: React.CSSProperties; glowColor?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -999, y: -999 })
  const [hov, setHov] = useState(false)

  const onMove = useCallback((e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  useEffect(() => {
    const el = ref.current; if (!el) return
    const enter = () => setHov(true)
    const leave = () => { setHov(false); setPos({ x: -999, y: -999 }) }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
    }
  }, [onMove])

  return (
    <div ref={ref} style={{
      ...cardBase,
      border: `1px solid ${hov ? 'rgba(148,163,184,0.16)' : T.border}`,
      transition: 'border-color 0.2s',
      height: '100%',
      boxSizing: 'border-box',
      ...style,
    }}>
      {/* Spotlight */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit',
        background: `radial-gradient(280px circle at ${pos.x}px ${pos.y}px, ${glowColor}, transparent 68%)`,
        transition: hov ? 'none' : 'background 0.4s',
      }}/>
      {/* Grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.045'/%3E%3C/svg%3E")`,
        backgroundSize: '140px 140px', mixBlendMode: 'overlay' as const, opacity: 0.75,
      }}/>
      <div style={{ position: 'relative', zIndex: 3 }}>{children}</div>
    </div>
  )
}

// ─── KPI Card (estrutura exata BossFlow) ──────────────────────
function KpiCard({ label, value, delta, pos: isPos, color, icon: Icon, loading, index = 0 }: {
  label: string; value: number; format: (v: number) => string; delta: string
  pos: boolean; color: string; icon: React.ElementType; loading?: boolean; index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <SCard glowColor={`${color}16`} style={{ height: '100%' }}>
        <div style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
          <GlowCorner color={`${color}22`}/>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.display }}>
              {label}
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: `${color}14`, border: `1px solid ${color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 14px ${color}20`,
            }}>
              <Icon size={14} style={{ color }} strokeWidth={2}/>
            </div>
          </div>

          {/* Value */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 10 }}>
            {loading ? <Sk h={32} mb={0}/> : (
              <p style={{
                fontSize: 24, fontWeight: 700, fontFamily: T.display,
                color, textShadow: `0 0 28px ${color}55`,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                <AnimNum value={value} format={v => toBRL(v)}/>
              </p>
            )}
          </div>

          {/* Delta */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
              background: isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isPos ? T.green : T.red,
              border: `1px solid ${isPos ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {isPos ? '↑' : '↓'} {delta}
            </span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>vs anterior</span>
          </div>
        </div>
      </SCard>
    </motion.div>
  )
}

// ─── ROAS Card (sem toBRL) ────────────────────────────────────
function RoasCard({ value, delta, loading, index }: {
  value: number; delta: string; loading?: boolean; index?: number
}) {
  const color = T.purple
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay: (index ?? 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <SCard glowColor={`${color}16`} style={{ height: '100%' }}>
        <div style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
          <GlowCorner color={`${color}22`}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.display }}>ROAS</span>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${color}20` }}>
              <Zap size={14} style={{ color }} strokeWidth={2}/>
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 10 }}>
            {loading ? <Sk h={32} mb={0}/> : (
              <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Syne', sans-serif", color, textShadow: `0 0 32px ${color}66`, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimNum value={value} format={v => `${v.toFixed(2)}x`}/>
              </p>
            )}
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600, background: 'rgba(124,110,247,0.12)', color, border: `1px solid rgba(124,110,247,0.25)` }}>
              {delta}
            </span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>vs anterior</span>
          </div>
        </div>
      </SCard>
    </motion.div>
  )
}

// ─── Card Head ────────────────────────────────────────────────
function CardHead({ icon: Icon, title, badge, badgeColor = T.blue, color = T.muted }: {
  icon: React.ElementType; title: string; badge?: string; badgeColor?: string; color?: string
}) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Icon size={13} style={{ color, flexShrink: 0 }}/>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.display }}>
        {title}
      </span>
      {badge && (
        <span style={{
          marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 20,
          background: `${badgeColor}15`, color: badgeColor,
          fontFamily: T.mono, fontWeight: 600, border: `1px solid ${badgeColor}25`,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Floating orbs background (igual BossFlow) ────────────────
function PageBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -180, left: -60, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.055) 0%, transparent 70%)', animation: 'orbA 12s ease-in-out infinite', filter: 'blur(1px)' }}/>
      <div style={{ position: 'absolute', bottom: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', animation: 'orbB 18s ease-in-out infinite reverse', filter: 'blur(1px)' }}/>
      <div style={{ position: 'absolute', top: '30%', right: '5%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,110,247,0.035) 0%, transparent 70%)', animation: 'orbA 28s ease-in-out infinite' }}/>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 130% 100% at 50% -10%, transparent 35%, rgba(11,15,20,0.65) 100%)' }}/>
    </div>
  )
}

// ─── Sortable Widget Wrapper ───────────────────────────────────
function SW({ id, editMode, visible, onToggle, children, span = 1 }: {
  id: string; editMode: boolean; visible: boolean; onToggle: () => void
  children: React.ReactNode; span?: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      suppressHydrationWarning
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        transition, gridColumn: `span ${span}`, opacity: isDragging ? 0.5 : 1,
        position: 'relative', minWidth: 0,
      }}
    >
      {editMode && (
        <div style={{
          position: 'absolute', top: 6, right: 6, zIndex: 20,
          display: 'flex', gap: 4,
        }}>
          <button {...attributes} {...listeners} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GripVertical size={11}/>
          </button>
          <button onClick={onToggle} style={{ width: 24, height: 24, borderRadius: 6, background: visible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${visible ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: visible ? T.green : T.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {visible ? <Eye size={10}/> : <EyeOff size={10}/>}
          </button>
        </div>
      )}
      {visible || editMode ? children : null}
    </div>
  )
}

// ─── Ring counter ─────────────────────────────────────────────
function Ring({ n }: { n: number }) {
  const pct = (n / 300) * 100
  const r = 9, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
      <svg width="24" height="24" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
        <circle cx="12" cy="12" r={r} fill="none" stroke={T.blue} strokeWidth="2" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round"/>
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: T.muted, fontFamily: T.mono }}>{n}</span>
    </div>
  )
}

// ─── Activity Item ────────────────────────────────────────────
function ActivityItem({ type, name, value, time, source, index }: {
  type: string; name: string; value?: number; time: string; source?: string; index: number
}) {
  const isVenda = type === 'venda'
  const isPix   = type === 'pix'
  const color   = isVenda ? T.green : isPix ? T.amber : T.blue
  const label   = isVenda ? 'Venda paga' : isPix ? 'PIX gerado' : 'Lead'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: T.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {source && (
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: T.muted, fontFamily: T.mono, flexShrink: 0 }}>{source}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>{label}</span>
      </div>
      {value !== undefined && (
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: T.mono, flexShrink: 0 }}>{toBRL(value)}</span>
      )}
      <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, flexShrink: 0 }}>{time}</span>
    </motion.div>
  )
}

// ─── Chart Tooltip ────────────────────────────────────────────
function CT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,22,35,0.98)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontFamily: T.mono }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }}/>
          <span style={{ fontSize: 12, color: T.sub, fontFamily: T.sans }}>{p.dataKey}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: p.color, fontFamily: T.mono }}>{toBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Bar ──────────────────────────────────────────────────────
const Bar = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}60`, transition: 'width 700ms cubic-bezier(.4,0,.2,1)' }}/>
  </div>
)

const ScoreBadge = ({ score }: { score: string }) => {
  const s = SCORE[score] ?? SCORE.D
  return <span style={{ width: 22, height: 22, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: T.mono, background: s.bg, color: s.color, flexShrink: 0 }}>{score}</span>
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const { active: workspace } = useWorkspaceStore()

  const [period, setPeriod]     = useState<Period>('hoje')
  const [editMode, setEditMode] = useState(false)
  const [compact, setCompact]   = useState(false)
  const [widgets, setWidgets]   = useState<Widget[]>(DEFAULT_WIDGETS)
  const [nextRefresh, setNextRefresh] = useState(300)
  const [refreshing, setRefreshing]   = useState(false)

  const [lKpi, setLKpi]   = useState(true)
  const [lFeed, setLFeed] = useState(true)
  const [lChart, setLChart] = useState(true)
  const [lCamp, setLCamp] = useState(true)
  const [lMeta, setLMeta] = useState(true)
  const [lBcs, setLBcs]   = useState(true)

  const [kpi, setKpi]         = useState<any>(null)
  const [feed, setFeed]       = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [criativos, setCriativos] = useState<any[]>([])
  const [melhor, setMelhor]   = useState<any>(null)
  const [meta, setMeta]       = useState<any>(null)
  const [bcs, setBcs]         = useState<any[]>([])
  const [metaAccs, setMetaAccs] = useState<any[]>([])
  const [metaConns, setMetaConns] = useState<any[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!workspace?.id) return
    const s = localStorage.getItem(`tiotrack_layout_v2_${workspace.id}`)
    if (s) { try { setWidgets(JSON.parse(s)) } catch {} }
    const c = localStorage.getItem(`tiotrack_compact_${workspace.id}`)
    if (c) setCompact(c === 'true')
  }, [workspace?.id])

  const save = (nw: Widget[]) => {
    setWidgets(nw)
    if (workspace?.id) localStorage.setItem(`tiotrack_layout_v2_${workspace.id}`, JSON.stringify(nw))
  }
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const o = widgets.findIndex(w => w.id === active.id)
      const n = widgets.findIndex(w => w.id === over.id)
      save(arrayMove(widgets, o, n))
    }
  }
  const toggle = (id: WidgetId) => save(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w))

  const loadKpi = useCallback(async (wid: string, p: Period) => {
    setLKpi(true)
    const diff = p === 'hoje' ? 0 : p === '7d' ? 7 : 30
    const from = p === 'hoje' ? hoje() : diasAtras(diff), prev = diasAtras(diff === 0 ? 1 : diff * 2), h = hoje()
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

  const loadFeed = useCallback(async (wid: string, p: Period) => {
    setLFeed(true)
    const diff = p === 'hoje' ? 0 : p === '7d' ? 7 : 30
    const from = diasAtras(diff), h = hoje()
    const fromTs = new Date(); fromTs.setDate(fromTs.getDate() - diff)
    const [{ data: vendas }, { data: pendentes }] = await Promise.all([
      supabase.from('conversions').select('id,created_at,customer_name,valor,utm_source').eq('workspace_id', wid).eq('status', 'paid').gte('dia', from).lte('dia', h).order('created_at', { ascending: false }).limit(10),
      supabase.from('conversions').select('id,created_at,customer_name,valor').eq('workspace_id', wid).eq('status', 'pending').gte('dia', from).lte('dia', h).order('created_at', { ascending: false }).limit(6),
    ])
    const items = [
      ...(vendas ?? []).map((v: any) => ({ ...v, _type: 'venda', _ts: new Date(v.created_at).getTime() })),
      ...(pendentes ?? []).map((v: any) => ({ ...v, _type: 'pix', _ts: new Date(v.created_at).getTime() })),
    ].sort((a, b) => b._ts - a._ts).slice(0, 12)
    setFeed(items); setLFeed(false)
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

  const loadCamp = useCallback(async (wid: string) => {
    setLCamp(true)
    const { data } = await supabase.from('ad_spend_daily').select('campaign_name,spend,conversion_value').eq('workspace_id', wid).gte('dia', diasAtras(7)).not('campaign_name', 'is', null)
    const map: Record<string, { s: number; r: number }> = {}
    ;(data ?? []).forEach((r: any) => { if (!r.campaign_name) return; if (!map[r.campaign_name]) map[r.campaign_name] = { s: 0, r: 0 }; map[r.campaign_name].s += r.spend ?? 0; map[r.campaign_name].r += r.conversion_value ?? 0 })
    const camps = Object.entries(map).map(([nome, v]) => ({ nome, spend: v.s, roas: v.s > 0 ? v.r / v.s : 0, score: calcScore(v.s > 0 ? v.r / v.s : 0) })).filter(c => c.spend > 0).sort((a, b) => b.roas - a.roas)
    setCriativos(camps.slice(0, 6)); setMelhor(camps[0] ?? null); setLCamp(false)
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
    })
    setLMeta(false)
  }, [])

  const loadBcs = useCallback(async (wid: string) => {
    setLBcs(true)
    const [{ data: tk }, { data: ma }, { data: mc }] = await Promise.all([
      supabase.from('advertiser_accounts').select('advertiser_id,nome,balance,bc_configs(apelido)').eq('workspace_id', wid),
      (supabase as any).from('meta_ad_accounts').select('account_id,nome,balance,currency,status').eq('workspace_id', wid),
      (supabase as any).from('meta_connections').select('id,fb_user_id,fb_user_name,updated_at').eq('workspace_id', wid),
    ])
    setBcs((tk ?? []).map((a: any) => ({ nome: a.bc_configs?.apelido ?? 'BC', adv: `#${a.advertiser_id?.slice(-4)}`, balance: a.balance ?? 0, warn: (a.balance ?? 0) < 100 })))
    setMetaAccs(ma ?? []); setMetaConns(mc ?? []); setLBcs(false)
  }, [])

  const loadAll = useCallback((wid: string, p: Period, silent = false) => {
    if (!silent) setRefreshing(true)
    Promise.all([loadKpi(wid, p), loadFeed(wid, p), loadChart(wid), loadCamp(wid), loadMeta(wid), loadBcs(wid)])
      .finally(() => setRefreshing(false))
  }, [loadKpi, loadFeed, loadChart, loadCamp, loadMeta, loadBcs])

  useEffect(() => { if (workspace?.id) loadAll(workspace.id, period) }, [workspace?.id, period])

  useEffect(() => {
    if (!workspace?.id) return
    setNextRefresh(300)
    const c = setInterval(() => setNextRefresh(n => n <= 1 ? 300 : n - 1), 1000)
    const r = setInterval(() => { if (workspace?.id) loadAll(workspace.id, period, true) }, 300000)
    return () => { clearInterval(c); clearInterval(r) }
  }, [workspace?.id, period])

  // Derived
  const alertas = [
    ...bcs.filter(b => b.warn && b.balance > 0).map(b => ({ msg: `${b.nome} — saldo baixo (${toBRL(b.balance)})` })),
    ...metaAccs.filter(a => (a.balance ?? 0) > 0 && (a.balance ?? 0) < 20).map(a => ({ msg: `${a.nome} — saldo baixo` })),
    ...(meta?.metaMensal > 0 && meta.receitaMes / meta.metaMensal < 0.3 && diaAtual() > 15
      ? [{ msg: `Meta em risco — ${Math.round(meta.receitaMes / meta.metaMensal * 100)}% atingido` }] : []),
  ]

  const metaPct  = meta?.metaMensal ? Math.min(Math.round(meta.receitaMes / meta.metaMensal * 100), 100) : 0
  const ritmo    = diaAtual() > 0 ? (meta?.receitaMes ?? 0) / diaAtual() : 0
  const projecao = ritmo * diasNoMes()
  const metaDiaria = meta?.metaMensal && diasNoMes() > 0 ? meta.metaMensal / diasNoMes() : 0
  const diaStatus  = metaDiaria > 0 ? Math.min(Math.round((meta?.receitaHoje ?? 0) / metaDiaria * 100), 100) : 0
  const totalTk    = bcs.reduce((s: number, b: any) => s + (b.balance ?? 0), 0)
  const totalMeta  = metaAccs.reduce((s: number, a: any) => s + (a.balance ?? 0), 0)
  const maxRoas    = criativos[0]?.roas || 1

  const getW = (id: WidgetId) => widgets.find(w => w.id === id)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg, position: 'relative' }}>
      <PageBg/>

      {/* ── Topbar ── */}
      <div style={{
        height: 50, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8,
        background: 'rgba(11,15,20,0.95)', backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em', fontFamily: T.display }}>
          Overview
        </span>
        {alertas.length > 0 && (
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: T.red, fontFamily: T.mono, fontWeight: 700, border: '1px solid rgba(239,68,68,0.2)' }}>
            {alertas.length} alerta{alertas.length > 1 ? 's' : ''}
          </span>
        )}
        <div style={{ flex: 1 }}/>
        <Ring n={nextRefresh}/>
        {!isMobile && (
          <button onClick={() => setCompact(c => !c)} style={{ width: 30, height: 30, borderRadius: 8, background: compact ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${compact ? 'rgba(59,130,246,0.25)' : T.border}`, color: compact ? '#60a5fa' : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 160ms' }}>
            {compact ? <Maximize2 size={12}/> : <Minimize2 size={12}/>}
          </button>
        )}
        {!isMobile && (
          <button onClick={() => setEditMode(e => !e)} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: editMode ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editMode ? 'rgba(59,130,246,0.25)' : T.border}`, color: editMode ? '#60a5fa' : T.sub, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontWeight: 500 }}>
            {editMode ? <><Check size={11}/> Salvar</> : <><Settings2 size={11}/> Editar</>}
          </button>
        )}
        {(['hoje', '7d', '30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: period === p ? 'rgba(59,130,246,0.1)' : 'transparent', border: `1px solid ${period === p ? 'rgba(59,130,246,0.25)' : T.border}`, color: period === p ? '#60a5fa' : T.sub, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 600 : 400, transition: 'all 160ms' }}>
            {p === 'hoje' ? 'Hoje' : p}
          </button>
        ))}
        <button onClick={() => { if (workspace?.id) { setNextRefresh(300); loadAll(workspace.id, period, true) } }} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '12px 16px' : '16px 20px', position: 'relative', zIndex: 1 }}>
        {editMode && (
          <div style={{ marginBottom: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GripVertical size={14}/> Arraste pra reorganizar · 👁 mostrar/ocultar
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
              gap: compact ? 10 : 12,
              alignItems: 'start',
            }}>

              {/* KPIs */}
              <SW id="kpi_receita" editMode={editMode} visible={getW('kpi_receita').visible} onToggle={() => toggle('kpi_receita')}>
                <KpiCard label="Receita" value={kpi?.receita ?? 0} format={toBRL} delta={`${(kpi?.dR ?? 0) >= 0 ? '+' : ''}${kpi?.dR ?? 0}%`} pos={(kpi?.dR ?? 0) >= 0} color={T.green} icon={TrendingUp} loading={lKpi} index={0}/>
              </SW>
              <SW id="kpi_gasto" editMode={editMode} visible={getW('kpi_gasto').visible} onToggle={() => toggle('kpi_gasto')}>
                <KpiCard label="Gasto em Ads" value={kpi?.gasto ?? 0} format={toBRL} delta={`${(kpi?.dG ?? 0) >= 0 ? '+' : ''}${kpi?.dG ?? 0}%`} pos={(kpi?.dG ?? 0) <= 0} color={T.red} icon={TrendingDown} loading={lKpi} index={1}/>
              </SW>
              <SW id="kpi_lucro" editMode={editMode} visible={getW('kpi_lucro').visible} onToggle={() => toggle('kpi_lucro')}>
                <KpiCard label="Lucro" value={kpi?.lucro ?? 0} format={toBRL} delta={`${(kpi?.dL ?? 0) >= 0 ? '+' : ''}${kpi?.dL ?? 0}%`} pos={(kpi?.dL ?? 0) >= 0} color={T.blue} icon={TrendingUp} loading={lKpi} index={2}/>
              </SW>
              <SW id="kpi_roas" editMode={editMode} visible={getW('kpi_roas').visible} onToggle={() => toggle('kpi_roas')}>
                <RoasCard value={kpi?.roas ?? 0} delta={`${(kpi?.dRo ?? 0) >= 0 ? '+' : ''}${kpi?.dRo ?? 0}x`} loading={lKpi} index={3}/>
              </SW>

              {/* Gráfico */}
              <SW id="grafico_receita" editMode={editMode} visible={getW('grafico_receita').visible} onToggle={() => toggle('grafico_receita')} span={isMobile ? 2 : 4}>
                <SCard>
                  <CardHead icon={BarChart2} title="Receita vs Gasto — 14 dias" badge="14d" badgeColor={T.muted} color={T.blue}/>
                  <div style={{ padding: '12px 20px 20px' }}>
                    {lChart ? <Sk h={compact ? 90 : 150}/> : (
                      <ResponsiveContainer width="100%" height={compact ? 90 : 150}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.2}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                            <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.red} stopOpacity={0.12}/><stop offset="100%" stopColor={T.red} stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" vertical={false}/>
                          <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                          <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={40}/>
                          <RTooltip content={<CT/>}/>
                          <Area type="monotone" dataKey="Receita" stroke={T.green} fill="url(#gR)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: T.green }}/>
                          <Area type="monotone" dataKey="Gasto" stroke={T.red} fill="url(#gG)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: T.red }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Activity Feed */}
              <SW id="activity_feed" editMode={editMode} visible={getW('activity_feed').visible} onToggle={() => toggle('activity_feed')} span={isMobile ? 2 : 4}>
                <SCard glowColor="rgba(16,185,129,0.08)">
                  <CardHead icon={Activity} title="Atividade em tempo real" badge="ao vivo" badgeColor={T.green} color={T.green}/>
                  <div style={{ padding: '0 20px 8px' }}>
                    {lFeed ? <>{[1,2,3,4].map(i => <Sk key={i} h={52} r={8} mb={4}/>)}</> :
                     feed.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '24px 0', fontFamily: T.sans }}>Nenhuma atividade ainda.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: '0 32px' }}>
                        {feed.map((item: any, i: number) => (
                          <ActivityItem
                            key={item.id ?? i}
                            type={item._type}
                            name={item.customer_name || 'Cliente'}
                            value={item.valor}
                            time={timeAgo(item.created_at)}
                            source={item.utm_source}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Melhor campanha */}
              <SW id="melhor_campanha" editMode={editMode} visible={getW('melhor_campanha').visible} onToggle={() => toggle('melhor_campanha')} span={isMobile ? 2 : 2}>
                <SCard glowColor="rgba(245,158,11,0.08)">
                  <CardHead icon={Trophy} title="Melhor campanha" badge="7d" badgeColor={T.green} color={T.amber}/>
                  <div style={{ padding: '16px 20px' }}>
                    {lCamp ? <Sk h={80}/> : !melhor ? (
                      <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Sem dados de campanhas.</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <ScoreBadge score={melhor.score}/>
                          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{melhor.nome}</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                          {[['ROAS', `${melhor.roas.toFixed(2)}x`, T.amber], ['Gasto', toBRL(melhor.spend), T.red], ['Score', melhor.score, T.blue]].map(([l, v, c]: any) => (
                            <div key={l}>
                              <p style={{ fontSize: 9, color: T.muted, fontFamily: T.display, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{l}</p>
                              <p style={{ fontSize: 15, fontWeight: 700, color: c, fontFamily: T.display }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        <Bar pct={Math.min((melhor.roas / 4) * 100, 100)} color={T.amber}/>
                      </>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Top 3 campanhas */}
              <SW id="top3_campanhas" editMode={editMode} visible={getW('top3_campanhas').visible} onToggle={() => toggle('top3_campanhas')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={BarChart2} title="Top campanhas" badge="ROAS" badgeColor={T.blue} color={T.blue}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {lCamp ? <>{[1,2,3].map(i => <Sk key={i} h={36} mb={6}/>)}</> :
                     criativos.length === 0 ? <p style={{ fontSize: 13, color: T.muted, padding: '12px 0', fontFamily: T.sans }}>Sem dados.</p> :
                     criativos.slice(0, 5).map((c: any, i: number) => (
                      <div key={c.nome} style={{ padding: '8px 0', borderBottom: i < 4 ? `1px solid ${T.border}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, width: 16 }}>#{i+1}</span>
                          <ScoreBadge score={c.score}/>
                          <span style={{ fontSize: 12, color: T.text, fontFamily: T.sans, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.amber, fontFamily: T.mono }}>{c.roas.toFixed(2)}x</span>
                        </div>
                        <div style={{ paddingLeft: 24 }}>
                          <Bar pct={(c.roas / maxRoas) * 100} color={SCORE[c.score]?.color ?? T.muted}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </SCard>
              </SW>

              {/* Meta do mês */}
              <SW id="meta_mes" editMode={editMode} visible={getW('meta_mes').visible} onToggle={() => toggle('meta_mes')} span={isMobile ? 2 : 2}>
                <SCard glowColor="rgba(124,110,247,0.08)">
                  <CardHead icon={Percent} title="Meta do mês" color={T.purple}/>
                  <div style={{ padding: '16px 20px' }}>
                    {lMeta ? <Sk h={80}/> : !meta?.metaMensal ? (
                      <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Defina uma meta nas configurações.</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 22, fontWeight: 700, color: metaPct >= 100 ? T.green : T.purple, fontFamily: T.display }}>{metaPct}%</p>
                            <p style={{ fontSize: 12, color: T.muted, fontFamily: T.sans }}>{toBRL(meta.receitaMes)} de {toBRL(meta.metaMensal)}</p>
                          </div>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: metaPct >= 100 ? 'rgba(16,185,129,0.12)' : 'rgba(124,110,247,0.12)', color: metaPct >= 100 ? T.green : T.purple, fontFamily: T.sans, fontWeight: 600 }}>
                            {metaPct >= 100 ? '🎉 Batida!' : diaAtual() > 15 && metaPct < 50 ? 'Atenção' : 'No ritmo'}
                          </span>
                        </div>
                        <Bar pct={metaPct} color={metaPct >= 100 ? T.green : T.purple}/>
                      </>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Projeção */}
              <SW id="projecao_mes" editMode={editMode} visible={getW('projecao_mes').visible} onToggle={() => toggle('projecao_mes')}>
                <SCard>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 10, color: T.muted, fontFamily: T.display, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Projeção</p>
                    {lMeta ? <Sk h={28} mb={6}/> : (
                      <p style={{ fontSize: 20, fontWeight: 700, color: projecao >= (meta?.metaMensal ?? 0) ? T.green : T.amber, fontFamily: T.display, marginBottom: 4 }}>{toBRL(projecao)}</p>
                    )}
                    <p style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>
                      {meta?.metaMensal > 0 ? `${Math.round(projecao / meta.metaMensal * 100)}% da meta` : 'Sem meta definida'}
                    </p>
                  </div>
                </SCard>
              </SW>

              {/* Meta do dia */}
              <SW id="meta_dia" editMode={editMode} visible={getW('meta_dia').visible} onToggle={() => toggle('meta_dia')}>
                <SCard>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 10, color: T.muted, fontFamily: T.display, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Hoje</p>
                    {lMeta ? <Sk h={28} mb={6}/> : (
                      <p style={{ fontSize: 20, fontWeight: 700, color: diaStatus >= 100 ? T.green : diaStatus >= 60 ? T.blue : T.amber, fontFamily: T.display, marginBottom: 4 }}>{toBRL(meta?.receitaHoje ?? 0)}</p>
                    )}
                    <p style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>
                      {metaDiaria > 0 ? `Meta: ${toBRL(metaDiaria)}/dia` : 'Sem meta'}
                    </p>
                    {metaDiaria > 0 && <div style={{ marginTop: 8 }}><Bar pct={diaStatus} color={diaStatus >= 100 ? T.green : T.blue}/></div>}
                  </div>
                </SCard>
              </SW>

              {/* Saldo TikTok */}
              <SW id="saldo_bcs" editMode={editMode} visible={getW('saldo_bcs').visible} onToggle={() => toggle('saldo_bcs')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={Key} title="Saldo TikTok BCs" color={T.cyan}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {lBcs ? <Sk h={60}/> : bcs.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, padding: '8px 0', fontFamily: T.sans }}>Nenhuma BC conectada.</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 18, fontWeight: 700, color: T.cyan, fontFamily: T.display, marginBottom: 10 }}>{toBRL(totalTk)}</p>
                        {bcs.filter(b => b.balance > 0).map((b: any) => (
                          <div key={b.adv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
                            <div>
                              <p style={{ fontSize: 12, color: T.text, fontFamily: T.sans }}>{b.nome}</p>
                              <p style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>{b.adv}</p>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: b.warn ? T.amber : T.green, fontFamily: T.mono }}>{toBRL(b.balance)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Saldo Meta */}
              <SW id="saldo_meta" editMode={editMode} visible={getW('saldo_meta').visible} onToggle={() => toggle('saldo_meta')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={Bell} title="Saldo Meta Ads" color={T.blue}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {lBcs ? <Sk h={60}/> : metaAccs.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, padding: '8px 0', fontFamily: T.sans }}>Nenhuma conta conectada.</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 18, fontWeight: 700, color: T.blue, fontFamily: T.display, marginBottom: 10 }}>{toBRL(totalMeta)}</p>
                        {metaAccs.filter(a => a.balance > 0).map((a: any) => (
                          <div key={a.account_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
                            <p style={{ fontSize: 12, color: T.text, fontFamily: T.sans }}>{a.nome}</p>
                            <span style={{ fontSize: 12, fontWeight: 600, color: (a.balance ?? 0) < 20 ? T.amber : T.green, fontFamily: T.mono }}>{toBRL(a.balance)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Alertas */}
              <SW id="alertas" editMode={editMode} visible={getW('alertas').visible} onToggle={() => toggle('alertas')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={AlertTriangle} title="Alertas" badgeColor={alertas.length > 0 ? T.red : T.green} badge={alertas.length > 0 ? `${alertas.length}` : '✓'} color={T.amber}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {alertas.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                        <span style={{ color: T.green }}>✅</span>
                        <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Tudo em dia</p>
                      </div>
                    ) : alertas.map((a: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < alertas.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                        <AlertTriangle size={12} style={{ color: T.amber, flexShrink: 0, marginTop: 2 }}/>
                        <p style={{ fontSize: 12, color: T.sub, fontFamily: T.sans, lineHeight: 1.5 }}>{a.msg}</p>
                      </div>
                    ))}
                  </div>
                </SCard>
              </SW>

              {/* Token expiry */}
              <SW id="token_expiry" editMode={editMode} visible={getW('token_expiry').visible} onToggle={() => toggle('token_expiry')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={Key} title="Status dos tokens" color={T.muted}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {lBcs ? <Sk h={40}/> : metaConns.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Nenhum token Meta.</p>
                    ) : metaConns.map((c: any) => {
                      const dias = c.updated_at ? Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000) : 0
                      const ok = dias <= 45
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                          <p style={{ fontSize: 12, color: T.text, fontFamily: T.sans }}>{c.fb_user_name}</p>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ok ? T.green : T.red, fontFamily: T.mono }}>{ok ? 'OK' : 'Expirando'}</span>
                        </div>
                      )
                    })}
                  </div>
                </SCard>
              </SW>

              {/* Score criativos */}
              <SW id="score_criativos" editMode={editMode} visible={getW('score_criativos').visible} onToggle={() => toggle('score_criativos')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={BarChart2} title="Score campanhas" badge="7d" badgeColor={T.muted} color={T.muted}/>
                  <div style={{ padding: '8px 20px 16px' }}>
                    {lCamp ? <Sk h={80}/> : criativos.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Sem campanhas.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['S','A','B','C','D'].map(s => {
                          const count = criativos.filter(c => c.score === s).length
                          const sc = SCORE[s]
                          return count > 0 ? (
                            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 10, background: sc.bg, border: `1px solid ${sc.color}25` }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: sc.color, fontFamily: T.display }}>{count}</span>
                              <span style={{ fontSize: 9, color: sc.color, fontFamily: T.mono }}>{s}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </SCard>
              </SW>

              {/* Diário rápido */}
              <SW id="diario_rapido" editMode={editMode} visible={getW('diario_rapido').visible} onToggle={() => toggle('diario_rapido')} span={isMobile ? 2 : 2}>
                <SCard>
                  <CardHead icon={BookOpen} title="Diário rápido" color={T.muted}/>
                  <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      placeholder="Observações do dia..."
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.text, resize: 'none', outline: 'none', fontFamily: T.sans, minHeight: 72, boxSizing: 'border-box' }}
                    />
                  </div>
                </SCard>
              </SW>

            </div>
          </SortableContext>
        </DndContext>
      </div>

      <style>{`
        @keyframes sk    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes shimmerSweep { 0%,100%{background-position:200% center} 50%{background-position:-200% center} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes orbA  { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(22px,-28px) scale(1.07)} 60%{transform:translate(-14px,18px) scale(0.95)} }
        @keyframes orbB  { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-24px,22px) scale(1.09)} 70%{transform:translate(16px,-12px) scale(0.94)} }
      `}</style>
    </div>
  )
}
