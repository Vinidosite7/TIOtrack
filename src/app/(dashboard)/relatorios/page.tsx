'use client'
import { GridBg, sharedStyles } from '@/components/ui/shared'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, Percent,
  BookOpen, Plus, CheckCircle, X,
  BarChart2, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { T } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'

// ── Tipos ──────────────────────────────────────────────────────
type Period = 'hoje' | '7d' | '14d' | '30d'

type DaySummary = {
  id: string
  dia: string
  receita_bruta: number | null
  gasto_ads: number | null
  custo_produto: number | null
  lucro_liquido: number | null
  margem: number | null
  roas: number | null
  vendas_count: number | null
}

type OpLog = {
  id: string
  dia: string
  titulo: string | null
  conteudo: string
  tipo: string | null
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────
function diasAtras(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function hoje() { return new Date().toISOString().split('T')[0] }
function toBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtDia(s: string) {
  const [, m, d] = s.split('-')
  return `${d}/${m}`
}
function fmtDiaLong(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ── KPI card ───────────────────────────────────────────────────
function KPI({ label, value, sub, color, icon: Icon, trend, index = 0 }: {
  label: string; value: string; sub?: string
  color: string; icon: React.ElementType; trend?: number; index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}80, transparent)` }}/>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {sub && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{sub}</span>}
        {trend !== undefined && (
          <span style={{
            fontSize: 10, display: 'flex', alignItems: 'center', gap: 2,
            color: trend >= 0 ? T.green : T.red,
          }}>
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Custom tooltip do gráfico ──────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0D1017', border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
    }}>
      <p style={{ color: T.text2, marginBottom: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: T.text2, minWidth: 70 }}>{p.name}</span>
          <span style={{ color: T.text1, fontWeight: 500 }}>
            {typeof p.value === 'number' && p.name !== 'ROAS' && p.name !== 'Margem'
              ? toBRL(p.value)
              : p.name === 'ROAS' ? `${Number(p.value).toFixed(2)}x`
              : p.name === 'Margem' ? `${Number(p.value).toFixed(1)}%`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Op Log Entry ───────────────────────────────────────────────
const TIPO_CFG: Record<string, { color: string; label: string }> = {
  decisao:    { color: T.accent,  label: '🎯 Decisão'   },
  observacao: { color: T.text2,   label: '👁 Observação' },
  problema:   { color: T.red,     label: '⚠️ Problema'   },
  resultado:  { color: T.green,   label: '✅ Resultado'  },
}

function OpLogEntry({ log, onDelete }: { log: OpLog; onDelete: (id: string) => void }) {
  const cfg = TIPO_CFG[log.tipo ?? ''] ?? { color: T.text3, label: '📝 Nota' }
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.borderSub}`,
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', gap: 10,
    }}>
      <div style={{
        width: 2, borderRadius: 2, background: cfg.color, flexShrink: 0, alignSelf: 'stretch',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>
            {fmtDiaLong(log.dia)}
          </span>
          <button onClick={() => onDelete(log.id)} style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'rgba(239,68,68,0.06)', border: 'none',
            color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <X size={10} />
          </button>
        </div>
        {log.titulo && (
          <p style={{ fontSize: 12, fontWeight: 500, color: T.text1, marginBottom: 3 }}>{log.titulo}</p>
        )}
        <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.5 }}>{log.conteudo}</p>
      </div>
    </div>
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

export default function RelatoriosPage() {
  const { active: workspace } = useWorkspaceStore()
  const isMobile = useIsMobile()

  const [period, setPeriod]     = useState<Period>('14d')
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summaries, setSummaries] = useState<DaySummary[]>([])
  const [logs, setLogs]         = useState<OpLog[]>([])

  // Form novo log
  const [showForm, setShowForm]   = useState(false)
  const [logTitulo, setLogTitulo] = useState('')
  const [logConteudo, setLogConteudo] = useState('')
  const [logTipo, setLogTipo]     = useState('observacao')
  const [logDia, setLogDia]       = useState(hoje())
  const [savingLog, setSavingLog] = useState(false)

  // Aba do gráfico
  const [chartTab, setChartTab] = useState<'dre' | 'roas' | 'vendas'>('dre')

  async function load(wid: string, p: Period) {
    setLoading(true)
    const n = p === 'hoje' ? 1 : p === '7d' ? 7 : p === '14d' ? 14 : 30
    const from = diasAtras(n)

    const [sumRes, logRes] = await Promise.all([
      supabase
        .from('daily_summary')
        .select('*')
        .eq('workspace_id', wid)
        .gte('dia', from)
        .lte('dia', hoje())
        .order('dia', { ascending: true }),
      supabase
        .from('operation_log')
        .select('*')
        .eq('workspace_id', wid)
        .gte('dia', from)
        .order('dia', { ascending: false })
        .limit(50),
    ])

    setSummaries((sumRes.data as DaySummary[]) ?? [])
    setLogs((logRes.data as OpLog[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { if (workspace?.id) load(workspace.id, period) }, [workspace?.id, period])

  // Totais do período
  const totais = useMemo(() => {
    const receita  = summaries.reduce((s, r) => s + (r.receita_bruta ?? 0), 0)
    const gasto    = summaries.reduce((s, r) => s + (r.gasto_ads ?? 0), 0)
    const custo    = summaries.reduce((s, r) => s + (r.custo_produto ?? 0), 0)
    const lucro    = summaries.reduce((s, r) => s + (r.lucro_liquido ?? 0), 0)
    const vendas   = summaries.reduce((s, r) => s + (r.vendas_count ?? 0), 0)
    const roas     = gasto > 0 ? receita / gasto : 0
    const margem   = receita > 0 ? (lucro / receita) * 100 : 0
    return { receita, gasto, custo, lucro, vendas, roas, margem }
  }, [summaries])

  // Dados do gráfico
  const chartData = useMemo(() => summaries.map(s => ({
    dia:     fmtDia(s.dia),
    diaFull: fmtDiaLong(s.dia),
    Receita: s.receita_bruta ?? 0,
    Gasto:   s.gasto_ads ?? 0,
    Lucro:   s.lucro_liquido ?? 0,
    ROAS:    s.roas ?? 0,
    Margem:  s.margem != null ? s.margem * 100 : 0,
    Vendas:  s.vendas_count ?? 0,
  })), [summaries])

  async function handleSaveLog() {
    if (!workspace?.id || !logConteudo.trim()) return
    setSavingLog(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newLog } = await supabase
      .from('operation_log')
      .insert({
        workspace_id: workspace.id,
        user_id:      user.id,
        dia:          logDia,
        titulo:       logTitulo || null,
        conteudo:     logConteudo,
        tipo:         logTipo,
      })
      .select('*')
      .single()

    if (newLog) setLogs(l => [newLog as OpLog, ...l])
    setLogTitulo(''); setLogConteudo(''); setLogTipo('observacao'); setLogDia(hoje())
    setShowForm(false)
    setSavingLog(false)
  }

  async function handleDeleteLog(id: string) {
    await supabase.from('operation_log').delete().eq('id', id)
    setLogs(l => l.filter(x => x.id !== id))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
    borderRadius: 7, color: T.text1, fontSize: 12, outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#070812', position: 'relative' }}>

      {/* Topbar */}
      <div style={{
        height: 48, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.text1 }}>Relatórios</span>
        <div style={{ flex: 1 }} />
        {(['hoje','7d','14d','30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            height: 26, padding: '0 10px', borderRadius: 6,
            background: period === p ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}`,
            color: period === p ? T.accent : T.text2,
            fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>{p === 'hoje' ? 'Hoje' : p === '7d' ? '7d' : p === '14d' ? '14d' : '30d'}</button>
        ))}
        <button onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }} style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
          color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{ height: 90, background: T.bgSurface, borderRadius: 10, border: `1px solid ${T.border}`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i*80}ms` }} />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <KPI label="Receita bruta"  value={toBRL(totais.receita)} color={T.green}  icon={DollarSign}  sub={`${summaries.length} dias`} />
              <KPI label="Gasto em Ads"   value={toBRL(totais.gasto)}   color={T.red}    icon={TrendingDown} sub="TikTok Ads" />
              <KPI label="Custo produto"  value={toBRL(totais.custo)}   color={T.yellow} icon={ShoppingCart} sub="estimado" />
              <KPI label="Lucro líquido"  value={toBRL(totais.lucro)}   color={totais.lucro >= 0 ? T.accent : T.red} icon={TrendingUp} />
              <KPI label="ROAS geral"     value={`${totais.roas.toFixed(2)}x`}           color={totais.roas >= 1.5 ? T.green : T.red} icon={BarChart2} sub="receita/gasto" />
              <KPI label="Margem líquida" value={`${totais.margem.toFixed(1)}%`}         color={totais.margem >= 15 ? T.green : T.yellow} icon={Percent} />
              <KPI label="Vendas"         value={String(totais.vendas)} color={T.text1}  icon={ShoppingCart} sub="no período" />
              <KPI label="Ticket médio"   value={totais.vendas > 0 ? toBRL(totais.receita / totais.vendas) : '—'} color={T.text1} icon={DollarSign} />
            </div>

            {/* Gráfico */}
            <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
              {/* Tabs do gráfico */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {[
                  { key: 'dre',    label: 'DRE' },
                  { key: 'roas',   label: 'ROAS & Margem' },
                  { key: 'vendas', label: 'Vendas' },
                ].map(t => (
                  <button key={t.key} onClick={() => setChartTab(t.key as any)} style={{
                    height: 26, padding: '0 10px', borderRadius: 6,
                    background: chartTab === t.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: `1px solid ${chartTab === t.key ? 'rgba(59,130,246,0.3)' : T.border}`,
                    color: chartTab === t.key ? T.accent : T.text3,
                    fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  }}>{t.label}</button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                {chartTab === 'dre' ? (
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.green} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.red} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.accent} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderSub} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={48} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Receita" stroke={T.green}  fill="url(#gReceita)" strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="Gasto"   stroke={T.red}    fill="url(#gGasto)"   strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="Lucro"   stroke={T.accent} fill="url(#gLucro)"   strokeWidth={1.5} dot={false} />
                  </AreaChart>
                ) : chartTab === 'roas' ? (
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRoas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.accent} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gMargem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.yellow} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={T.yellow} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderSub} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} width={36} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="ROAS"   stroke={T.accent} fill="url(#gRoas)"   strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="Margem" stroke={T.yellow} fill="url(#gMargem)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderSub} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} width={28} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="Vendas" fill={T.accent} radius={[3,3,0,0]} opacity={0.85} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Layout 2 colunas: DRE diário + Diário de operação */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>

              {/* DRE diário */}
              <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <BarChart2 size={12} style={{ color: T.accent }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DRE por dia</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.borderSub}` }}>
                        {['Dia','Receita','Gasto','Lucro','ROAS','Margem'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', fontSize: 9, color: T.text3, fontWeight: 500, textTransform: 'uppercase', textAlign: h === 'Dia' ? 'left' : 'right', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...summaries].reverse().map(s => {
                        const lucro = s.lucro_liquido ?? 0
                        const roas  = s.roas ?? 0
                        const margem = s.margem != null ? s.margem * 100 : null
                        return (
                          <tr key={s.id} style={{ borderBottom: `1px solid ${T.borderSub}` }}>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: T.text2, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{fmtDia(s.dia)}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: T.green,  fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{toBRL(s.receita_bruta ?? 0)}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: T.red,    fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{toBRL(s.gasto_ads ?? 0)}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: lucro >= 0 ? T.accent : T.red, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{toBRL(lucro)}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: roas >= 1.5 ? T.text1 : T.red, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{roas.toFixed(2)}x</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: (margem ?? 0) >= 15 ? T.green : T.yellow, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                              {margem != null ? `${margem.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                      {summaries.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: T.text3 }}>Nenhum dado no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diário de operação */}
              <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <BookOpen size={12} style={{ color: T.accent }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diário de operação</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setShowForm(s => !s)} style={{
                    height: 22, padding: '0 8px', borderRadius: 5,
                    background: showForm ? 'rgba(255,255,255,0.04)' : T.accent,
                    border: 'none', color: '#fff', fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  }}>
                    {showForm ? <X size={10} /> : <Plus size={10} />}
                    {showForm ? 'Cancelar' : 'Novo'}
                  </button>
                </div>

                {/* Form novo log */}
                {showForm && (
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.borderSub}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4 }}>Tipo</label>
                        <select value={logTipo} onChange={e => setLogTipo(e.target.value)} style={{ ...inputStyle, height: 32 }}>
                          {Object.entries(TIPO_CFG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4 }}>Data</label>
                        <input type="date" value={logDia} onChange={e => setLogDia(e.target.value)} style={{ ...inputStyle, height: 32, colorScheme: 'dark' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4 }}>Título (opcional)</label>
                      <input value={logTitulo} onChange={e => setLogTitulo(e.target.value)} placeholder="Ex: Pausei campanha X" style={{ ...inputStyle, height: 32 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4 }}>Nota</label>
                      <textarea value={logConteudo} onChange={e => setLogConteudo(e.target.value)} placeholder="O que aconteceu hoje na operação?" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                    </div>
                    <button onClick={handleSaveLog} disabled={savingLog || !logConteudo.trim()} style={{
                      height: 32, borderRadius: 7, background: T.accent, border: 'none',
                      color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <CheckCircle size={12} /> {savingLog ? 'Salvando...' : 'Salvar nota'}
                    </button>
                  </div>
                )}

                {/* Lista de logs */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                  {logs.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center' }}>
                      <BookOpen size={22} style={{ color: T.text3, marginBottom: 8 }} />
                      <p style={{ fontSize: 11, color: T.text3 }}>Nenhuma nota no período. Documente suas decisões!</p>
                    </div>
                  ) : logs.map(log => (
                    <OpLogEntry key={log.id} log={log} onDelete={handleDeleteLog} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{sharedStyles + '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@media(max-width:768px){.rel-kpis{grid-template-columns:repeat(2,1fr)!important}}'}</style>
    </div>
  )
}
