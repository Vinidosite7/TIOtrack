'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp, TrendingDown, Search, X, Download,
  ChevronLeft, ChevronRight, ShoppingCart, Clock,
  CheckCircle, RotateCcw, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { SpotlightCard, GlowCorner } from '@/components/ui/aceternity'
import { useWorkspaceStore } from '@/store/workspace'

// ─── Tokens ───────────────────────────────────────────────────
const T = {
  bg: 'rgba(8,8,14,0.92)', border: 'rgba(255,255,255,0.055)',
  text: '#dcdcf0', sub: '#8a8aaa', muted: '#4a4a6a',
  green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  blue: '#3b82f6', cyan: '#22d3ee', purple: '#a78bfa',
}
const cardStyle: React.CSSProperties = {
  background: T.bg, border: `1px solid ${T.border}`,
  backdropFilter: 'blur(14px)',
  boxShadow: '0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
}
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.46, delay, ease: [0.16, 1, 0.3, 1] as const },
})

// ─── Types ────────────────────────────────────────────────────
type Period = 'hoje' | '7d' | '30d'
type StatusFilter = 'todos' | 'paid' | 'pending' | 'refunded' | 'chargeback'

type Conversion = {
  id: string; created_at: string; dia: string | null
  customer_name: string | null; valor: number; status: string
  produto: string | null; utm_source: string | null
  utm_campaign: string | null; utm_medium: string | null
  utm_content: string | null; payment_method: string | null
  payment_platform: string | null
}

// ─── Helpers ──────────────────────────────────────────────────
const toBRL    = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje     = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const fmtDia   = (s: string) => { const [,m,d] = s.split('-'); return `${d}/${m}` }
const fmtTime  = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const timeAgo  = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`
  if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}
const decodeUtm = (s: string | null) => { try { return s ? decodeURIComponent(s) : null } catch { return s } }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid:       { label: 'Pago',       color: T.green, bg: 'rgba(16,185,129,0.12)'  },
  pending:    { label: 'Pendente',   color: T.amber, bg: 'rgba(245,158,11,0.12)'  },
  refunded:   { label: 'Reembolso',  color: T.red,   bg: 'rgba(239,68,68,0.12)'   },
  chargeback: { label: 'Chargeback', color: T.red,   bg: 'rgba(239,68,68,0.12)'   },
  cancelled:  { label: 'Cancelado',  color: T.muted, bg: 'rgba(100,116,139,0.1)'  },
}

// ─── AnimatedNumber ───────────────────────────────────────────
function AnimNum({ value, format }: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(format(0))
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current; prev.current = value
    const c = animate(from, value, {
      duration: 0.85, ease: [0.16, 1, 0.3, 1] as any,
      onUpdate: v => setDisplay(format(v)),
    })
    return c.stop
  }, [value])
  return <span>{display}</span>
}

// ─── Chart tooltip ────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,10,18,0.97)', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 14px', fontSize: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.75)' }}>
      <p style={{ color: T.muted, marginBottom: 8, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: `0 0 6px ${p.color}` }}/>
          <span style={{ color: T.muted }}>{p.dataKey === 'receita' ? 'Receita' : 'PIX'}</span>
          <span style={{ color: p.color, fontWeight: 600 }}>{toBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function VendasPage() {
  const { active: workspace } = useWorkspaceStore()

  const [loading, setLoading]   = useState(true)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [chartData, setChartData]     = useState<any[]>([])
  const [period, setPeriod]           = useState<Period>('7d')
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [page, setPage]               = useState(1)
  const [refreshing, setRefreshing]   = useState(false)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const PER_PAGE = 15

  const loadData = useCallback(async (wid: string, p: Period) => {
    setLoading(true)
    const diff = p === 'hoje' ? 0 : p === '7d' ? 7 : 30
    const from = p === 'hoje' ? hoje() : diasAtras(diff), h = hoje()

    const [{ data: convs }, { data: spends }] = await Promise.all([
      supabase.from('conversions').select('*').eq('workspace_id', wid).gte('dia', from).lte('dia', h).order('created_at', { ascending: false }),
      supabase.from('ad_spend_daily').select('dia,spend').eq('workspace_id', wid).gte('dia', from).lte('dia', h),
    ])

    setConversions(convs || [])

    // Chart — dia a dia
    const map: Record<string, { receita: number; pix: number }> = {}
    for (let i = diff - 1; i >= 0; i--) {
      const d = diasAtras(i)
      map[d] = { receita: 0, pix: 0 }
    }
    ;(convs || []).forEach((c: any) => {
      if (c.dia && map[c.dia]) {
        if (c.status === 'paid') map[c.dia].receita += c.valor ?? 0
        if (c.status === 'pending') map[c.dia].pix += c.valor ?? 0
      }
    })
    setChartData(Object.entries(map).map(([dia, v]) => ({
      dia: fmtDia(dia), receita: Math.round(v.receita), pix: Math.round(v.pix),
    })))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (workspace?.id) loadData(workspace.id, period)
  }, [workspace?.id, period])

  async function handleRefresh() {
    if (!workspace?.id) return
    setRefreshing(true)
    await loadData(workspace.id, period)
    setRefreshing(false)
  }

  // Filtros
  const filtered = conversions.filter(c => {
    const matchSearch = !search || (c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.produto?.toLowerCase().includes(search.toLowerCase()) || decodeUtm(c.utm_campaign)?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const receita  = conversions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.valor ?? 0), 0)
  const pix      = conversions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.valor ?? 0), 0)
  const reemb    = conversions.filter(c => c.status === 'refunded' || c.status === 'chargeback').reduce((s, c) => s + (c.valor ?? 0), 0)
  const totalVendas = conversions.filter(c => c.status === 'paid').length

  function exportCSV() {
    const rows = [
      ['Data', 'Cliente', 'Produto', 'Valor', 'Status', 'Fonte', 'Campanha', 'Pagamento'],
      ...filtered.map(c => [
        fmtTime(c.created_at), c.customer_name || '', c.produto || '',
        c.valor, c.status, decodeUtm(c.utm_source) || '', decodeUtm(c.utm_campaign) || '',
        c.payment_method || '',
      ]),
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `vendas-${period}.csv`; a.click()
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>Vendas</h1>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
            {period === 'hoje' ? 'Hoje' : period === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
            {' · '}{conversions.length} registros
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Período */}
          {(['hoje', '7d', '30d'] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setPage(1) }}
              style={{ height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: period === p ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif", background: period === p ? 'rgba(59,130,246,0.12)' : 'transparent', color: period === p ? '#60a5fa' : T.muted, border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}` }}>
              {p === 'hoje' ? 'Hoje' : p}
            </button>
          ))}
          <button onClick={exportCSV}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            <Download size={13}/> Exportar
          </button>
          <button onClick={handleRefresh}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Receita',    value: receita,      color: T.green,  icon: TrendingUp,   format: toBRL },
          { label: 'PIX Gerado', value: pix,          color: T.amber,  icon: Clock,        format: toBRL },
          { label: 'Reembolsos', value: reemb,        color: T.red,    icon: TrendingDown, format: toBRL },
          { label: 'Vendas',     value: totalVendas,  color: T.blue,   icon: ShoppingCart, format: (v: number) => `${Math.round(v)}` },
        ].map(({ label, value, color, icon: Icon, format }, i) => (
          <motion.div key={label} {...fadeUp(0.06 + i * 0.06)}>
            <SpotlightCard spotlightColor={`${color}14`} style={{ ...cardStyle, borderRadius: 16, height: '100%' }}>
              <div style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                <GlowCorner color={`${color}20`} position="bottom-right"/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Syne', sans-serif" }}>{label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${color}20` }}>
                    <Icon size={13} style={{ color }} strokeWidth={2}/>
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color, textShadow: `0 0 22px ${color}55`, position: 'relative', zIndex: 1, letterSpacing: '-0.02em' }}>
                  {loading ? '—' : <AnimNum value={value} format={format}/>}
                </p>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div {...fadeUp(0.22)}>
        <SpotlightCard style={{ ...cardStyle, borderRadius: 16 }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Receita diária</h2>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Pago vs PIX gerado</p>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[{ color: T.green, label: 'Receita' }, { color: T.amber, label: 'PIX' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, boxShadow: `0 0 5px ${l.color}` }}/>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ height: 160, borderRadius: 8, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.green} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={T.green} stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.amber} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={T.amber} stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                  <RTooltip content={<ChartTip/>} cursor={{ fill: 'rgba(59,130,246,0.05)' }}/>
                  <Bar dataKey="receita" fill="url(#gR)" radius={[4,4,0,0]} maxBarSize={28}/>
                  <Bar dataKey="pix"     fill="url(#gP)" radius={[4,4,0,0]} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Tabela */}
      <motion.div {...fadeUp(0.3)}>
        <SpotlightCard style={{ ...cardStyle, borderRadius: 16, overflow: 'hidden' }}>
          {/* Filtros */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
              <Search size={13} style={{ color: T.muted, flexShrink: 0 }}/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar cliente, produto, campanha..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: T.text, fontFamily: "'DM Sans', sans-serif", minWidth: 0 }}/>
              {search && <button onClick={() => setSearch('')} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={13}/></button>}
            </div>

            {/* Status */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['todos', 'paid', 'pending', 'refunded'] as StatusFilter[]).map(s => {
                const cfg = STATUS[s] || { color: T.muted, bg: 'rgba(255,255,255,0.04)' }
                const active = statusFilter === s
                return (
                  <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                    style={{ height: 30, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif", background: active ? (s === 'todos' ? 'rgba(59,130,246,0.12)' : cfg.bg) : 'rgba(255,255,255,0.02)', color: active ? (s === 'todos' ? '#60a5fa' : cfg.color) : T.muted, border: `1px solid ${active ? (s === 'todos' ? 'rgba(59,130,246,0.3)' : `${cfg.color}30`) : T.border}` }}>
                    {s === 'todos' ? 'Todos' : s === 'paid' ? '✓ Pago' : s === 'pending' ? '◷ PIX' : '↩ Reembolso'}
                  </button>
                )
              })}
            </div>

            <span style={{ fontSize: 11, color: T.muted, marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif" }}>{filtered.length} registros</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>)}
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <ShoppingCart size={32} style={{ color: T.muted, margin: '0 auto 12px', display: 'block' }}/>
              <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Nenhuma venda encontrada</p>
            </div>
          ) : paginated.map((c, i) => {
            const st = STATUS[c.status] || STATUS.cancelled
            const src = decodeUtm(c.utm_source)
            const camp = decodeUtm(c.utm_campaign)
            const isPaid = c.status === 'paid'

            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: i * 0.03 }}
                style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none', overflow: 'hidden' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', transition: 'background 0.12s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${st.color}12`, border: `1px solid ${st.color}20` }}>
                    {isPaid ? <CheckCircle size={14} style={{ color: st.color }}/> : c.status === 'pending' ? <Clock size={14} style={{ color: st.color }}/> : <RotateCcw size={14} style={{ color: st.color }}/>}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customer_name || 'Cliente'}
                      </span>
                      {src && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: T.muted, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{src.toUpperCase()}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>{timeAgo(c.created_at)}</span>
                      {c.produto && <span style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>· {c.produto}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.color}25`, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{st.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: st.color, fontFamily: "'Syne', sans-serif", textShadow: `0 0 12px ${st.color}40`, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>{toBRL(c.valor ?? 0)}</span>
                  <span style={{ fontSize: 11, color: expanded === c.id ? T.blue : T.muted, flexShrink: 0, transition: 'color 0.15s' }}>{expanded === c.id ? '▲' : '▼'}</span>
                </div>
                {/* Expand panel */}
                {expanded === c.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ background: 'rgba(59,130,246,0.03)', borderTop: `1px solid ${T.border}`, padding: '12px 16px 14px 64px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 24px' }}>
                      {[
                        { l: 'Campanha',     v: decodeUtm(c.utm_campaign) },
                        { l: 'Conjunto',     v: decodeUtm((c as any).utm_content) },
                        { l: 'Ad / Criativo',v: decodeUtm((c as any).utm_term) },
                        { l: 'Source',       v: decodeUtm((c as any).utm_source) },
                        { l: 'Medium',       v: decodeUtm((c as any).utm_medium) },
                        { l: 'Pagamento',    v: (c as any).payment_method },
                        { l: 'Plataforma',   v: (c as any).payment_platform },
                        { l: 'Produto',      v: (c as any).produto },
                        { l: 'Data',         v: fmtTime(c.created_at) },
                      ].filter(x => x.v).map(({ l, v }) => (
                        <div key={l}>
                          <p style={{ fontSize: 9, color: T.muted, fontFamily: "'Syne', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</p>
                          <p style={{ fontSize: 12, color: T.sub, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Página {page} de {totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: page <= 1 ? T.muted : T.sub, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={13}/>
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: page >= totalPages ? T.muted : T.sub, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
                  <ChevronRight size={13}/>
                </motion.button>
              </div>
            </div>
          )}
        </SpotlightCard>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes sk   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 640px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
