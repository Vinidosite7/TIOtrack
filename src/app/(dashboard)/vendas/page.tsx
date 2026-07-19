'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp, TrendingDown, Search, X, Download,
  ChevronLeft, ChevronRight, ShoppingCart, Clock,
  CheckCircle, RotateCcw, AlertTriangle, RefreshCw,
  Target, Radio, ArrowRight,
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
}
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.46, delay, ease: [0.16, 1, 0.3, 1] as const },
})

// ─── Types ────────────────────────────────────────────────────
type Period = 'hoje' | '7d' | '30d'
type StatusFilter = 'todos' | 'paid' | 'pending' | 'refunded' | 'chargeback'
type PlatformFilter = 'todas' | string

type Conversion = {
  id: string; created_at: string; dia: string | null
  customer_name: string | null; valor: number; status: string
  produto: string | null; utm_source: string | null
  utm_campaign: string | null; utm_medium: string | null
  utm_content: string | null; payment_method: string | null
  payment_platform: string | null
}

type RevenueSignalProps = {
  label: string
  value: string
  detail: string
  color: string
  icon: React.ElementType
}

// ─── Helpers ──────────────────────────────────────────────────
const toBRL    = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
const cleanLabel = (s: string | null | undefined) => (s || '').trim().toLowerCase()
const niceLabel = (s: string | null | undefined) => {
  const v = cleanLabel(s)
  if (!v) return ''
  if (v === 'tiktok' || v === 'tt') return 'TikTok'
  if (v === 'facebook' || v === 'fb' || v === 'meta' || v === 'instagram') return 'Meta'
  if (v === 'kwai') return 'Kwai'
  if (v === 'sharkbot') return 'SharkBot'
  if (v === 'manual') return 'Manual'
  return v.charAt(0).toUpperCase() + v.slice(1)
}

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

function RevenueSignal({ label, value, detail, color, icon: Icon }: RevenueSignalProps) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${T.border}`,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color}/>
        </div>
        <span style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, color: T.text, fontFamily: "'Syne', sans-serif", fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>{detail}</p>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function VendasPage() {
  const { active: workspace } = useWorkspaceStore()

  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [chartData, setChartData]     = useState<any[]>([])
  const [period, setPeriod]           = useState<Period>('7d')
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('todas')
  const [page, setPage]               = useState(1)
  const [refreshing, setRefreshing]   = useState(false)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const PER_PAGE = 15

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 820)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

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
    const days = p === 'hoje' ? 1 : diff
    for (let i = days - 1; i >= 0; i--) {
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
      dia: fmtDia(dia), receita: v.receita, pix: v.pix,
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

  const platforms = Array.from(new Set(conversions.map(c => cleanLabel(c.payment_platform)).filter(Boolean))).sort()

  // Filtros
  const filtered = conversions.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || (
      c.customer_name?.toLowerCase().includes(q) ||
      c.produto?.toLowerCase().includes(q) ||
      c.payment_platform?.toLowerCase().includes(q) ||
      decodeUtm(c.utm_source)?.toLowerCase().includes(q) ||
      decodeUtm(c.utm_campaign)?.toLowerCase().includes(q)
    )
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchPlatform = platformFilter === 'todas' || cleanLabel(c.payment_platform) === platformFilter
    return matchSearch && matchStatus && matchPlatform
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const receita  = filtered.filter(c => c.status === 'paid').reduce((s, c) => s + (c.valor ?? 0), 0)
  const pix      = filtered.filter(c => c.status === 'pending').reduce((s, c) => s + (c.valor ?? 0), 0)
  const reemb    = filtered.filter(c => c.status === 'refunded' || c.status === 'chargeback').reduce((s, c) => s + (c.valor ?? 0), 0)
  const totalVendas = filtered.filter(c => c.status === 'paid').length
  const pendingCount = filtered.filter(c => c.status === 'pending').length
  const problemCount = filtered.filter(c => c.status === 'refunded' || c.status === 'chargeback').length
  const ticketMedio = totalVendas > 0 ? receita / totalVendas : 0
  const captureRate = filtered.length > 0 ? Math.round((totalVendas / filtered.length) * 100) : 0
  const chartHasData = chartData.some(d => (d.receita ?? 0) > 0 || (d.pix ?? 0) > 0)
  const sourceMap = filtered.reduce((acc: Record<string, number>, c) => {
    const source = niceLabel(decodeUtm(c.utm_source)) || niceLabel(c.payment_platform) || 'Sem origem'
    const platform = niceLabel(c.payment_platform)
    const label = platform && platform !== source ? `${source} · ${platform}` : source
    acc[label] = (acc[label] ?? 0) + (c.status === 'paid' ? c.valor ?? 0 : 0)
    return acc
  }, {})
  const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0]

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
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 88px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>Vendas</h1>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
            {period === 'hoje' ? 'Hoje' : period === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
            {' · '}{conversions.length} registros
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {[
          { label: 'Receita',    value: receita,      color: T.green,  icon: TrendingUp,   format: toBRL },
          { label: 'PIX Gerado', value: pix,          color: T.amber,  icon: Clock,        format: toBRL },
          { label: 'Reembolsos', value: reemb,        color: T.red,    icon: TrendingDown, format: toBRL },
          { label: 'Vendas',     value: totalVendas,  color: T.blue,   icon: ShoppingCart, format: (v: number) => `${Math.round(v)}` },
        ].map(({ label, value, color, icon: Icon, format }, i) => (
          <motion.div key={label} {...fadeUp(0.06 + i * 0.06)}>
            <SpotlightCard spotlightColor={`${color}14`} style={{ ...cardStyle, borderRadius: 14, height: '100%' }}>
              <div style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                <GlowCorner color={`${color}20`} position="bottom-right"/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Syne', sans-serif" }}>{label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} style={{ color }} strokeWidth={2}/>
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: T.text, position: 'relative', zIndex: 1, letterSpacing: '-0.02em' }}>
                  {loading ? '—' : <AnimNum value={value} format={format}/>}
                </p>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {!loading && (
        <motion.div {...fadeUp(0.18)} style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.15fr repeat(3, minmax(0, 0.75fr))',
          gap: 12,
        }}>
          <div style={{
            padding: 18,
            borderRadius: 14,
            background: 'linear-gradient(145deg, rgba(16,185,129,0.12), rgba(59,130,246,0.07) 58%, rgba(10,10,18,0.22))',
            border: `1px solid ${T.border}`,
            minHeight: 132,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 10, color: T.green, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 10 }}>
                Caixa em tempo real
              </p>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: isMobile ? 19 : 22, lineHeight: 1.12, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>
                {receita > 0 ? `${toBRL(receita)} confirmados no filtro atual.` : 'Aguardando as primeiras vendas confirmadas.'}
              </h2>
              <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
                {pix > 0
                  ? `${toBRL(pix)} ainda esta em PIX pendente.`
                  : pendingCount > 0
                    ? `${pendingCount} venda${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''} para acompanhar.`
                    : 'Quando o checkout enviar eventos, esta tela vira o lado financeiro do ROAS.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: T.green, padding: '3px 9px', borderRadius: 999, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{captureRate}% captura</span>
              <span style={{ fontSize: 11, color: problemCount > 0 ? T.red : T.muted, padding: '3px 9px', borderRadius: 999, background: problemCount > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.035)', border: `1px solid ${T.border}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{problemCount} reversões</span>
            </div>
          </div>

          <RevenueSignal icon={Target} label="Ticket médio" value={ticketMedio > 0 ? toBRL(ticketMedio) : '—'} detail="média das vendas pagas no filtro" color={T.blue}/>
          <RevenueSignal icon={Clock} label="PIX pendente" value={`${pendingCount}`} detail={pix > 0 ? `${toBRL(pix)} aguardando confirmação` : 'sem pendências no filtro'} color={T.amber}/>
          <RevenueSignal icon={Radio} label="Origem forte" value={topSource ? topSource[0] : '—'} detail={topSource ? `${toBRL(topSource[1])} em receita paga` : 'sem origem de venda ainda'} color={T.cyan}/>
        </motion.div>
      )}

      {/* Chart */}
      <motion.div {...fadeUp(0.22)}>
        <SpotlightCard style={{ ...cardStyle, borderRadius: 14 }}>
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
            ) : !chartHasData ? (
              <div style={{
                height: 160,
                borderRadius: 12,
                border: `1px dashed ${T.border}`,
                background: 'linear-gradient(180deg, rgba(16,185,129,0.06), rgba(10,10,18,0.02))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 18,
              }}>
                <div>
                  <p style={{ fontSize: 13, color: T.text, fontFamily: "'Syne', sans-serif", fontWeight: 800, marginBottom: 6 }}>Sem receita neste período</p>
                  <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.45, maxWidth: 420, fontFamily: "'DM Sans', sans-serif" }}>
                    Assim que o webhook do checkout enviar vendas pagas ou PIX gerados, o gráfico mostra a curva diária.
                  </p>
                </div>
              </div>
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
        <SpotlightCard style={{ ...cardStyle, borderRadius: 14, overflow: 'hidden' }}>
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

            {/* Plataforma */}
            <select value={platformFilter} onChange={e => { setPlatformFilter(e.target.value); setPage(1) }}
              style={{ height: 30, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: platformFilter === 'todas' ? 'rgba(255,255,255,0.025)' : 'rgba(34,211,238,0.10)', color: platformFilter === 'todas' ? T.muted : T.cyan, border: `1px solid ${platformFilter === 'todas' ? T.border : 'rgba(34,211,238,0.28)'}`, outline: 'none' }}>
              <option value="todas">Todas plataformas</option>
              {platforms.map(p => <option key={p} value={p}>{niceLabel(p)}</option>)}
            </select>

            <span style={{ fontSize: 11, color: T.muted, marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif" }}>{filtered.length} registros</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>)}
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '52px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {search ? <Search size={22} style={{ color: T.blue }}/> : <ShoppingCart size={22} style={{ color: T.blue }}/>}
              </div>
              <div>
                <p style={{ fontSize: 17, color: T.text, fontFamily: "'Syne', sans-serif", fontWeight: 800, marginBottom: 6 }}>
                  {search || statusFilter !== 'todos' || platformFilter !== 'todas' ? 'Nada encontrado nesse filtro' : 'Nenhuma venda recebida ainda'}
                </p>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, maxWidth: 440, fontFamily: "'DM Sans', sans-serif" }}>
                  {search || statusFilter !== 'todos' || platformFilter !== 'todas'
                    ? 'Limpe a busca ou troque o status para voltar à lista completa.'
                    : 'Conecte o webhook do checkout para o TioTrack receber vendas, PIX pendente, reembolso e UTMs automaticamente.'}
                </p>
              </div>
              {(search || statusFilter !== 'todos' || platformFilter !== 'todas') ? (
                <button onClick={() => { setSearch(''); setStatusFilter('todos'); setPlatformFilter('todas'); setPage(1) }}
                  style={{ height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Limpar filtros <X size={12}/>
                </button>
              ) : (
                <button onClick={() => { window.location.href = '/integracoes' }}
                  style={{ height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: T.green, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Ver integrações <ArrowRight size={12}/>
                </button>
              )}
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: st.color, fontFamily: "'Syne', sans-serif", flexShrink: 0, minWidth: 80, textAlign: 'right' }}>{toBRL(c.valor ?? 0)}</span>
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
