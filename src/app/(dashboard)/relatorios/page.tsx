'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, Percent, BookOpen,
  Plus, CheckCircle, X, BarChart2, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { SpotlightCard, GlowCorner } from '@/components/ui/aceternity'

const T = {
  bg: 'rgba(8,8,14,0.92)', border: 'rgba(255,255,255,0.055)',
  text: '#dcdcf0', sub: '#8a8aaa', muted: '#4a4a6a',
  green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  blue: '#3b82f6', cyan: '#22d3ee',
  mono: "'JetBrains Mono', monospace",
  sans: "'DM Sans', sans-serif",
  display: "'Syne', sans-serif",
}
const cardStyle: React.CSSProperties = {
  background: T.bg, border: `1px solid ${T.border}`,
  backdropFilter: 'blur(14px)',
  boxShadow: '0 4px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
  borderRadius: 16, overflow: 'hidden',
}
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
})

type Period = 'hoje' | '7d' | '14d' | '30d'
type DaySummary = { id: string; dia: string; receita_bruta: number|null; gasto_ads: number|null; custo_produto: number|null; lucro_liquido: number|null; margem: number|null; roas: number|null; vendas_count: number|null }
type OpLog = { id: string; dia: string; titulo: string|null; conteudo: string; tipo: string|null; created_at: string }

const toBRL     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje      = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const fmtDia    = (s: string) => { const [,m,d] = s.split('-'); return `${d}/${m}` }
const fmtDiaLong = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const TIPO_CFG: Record<string, { color: string; label: string }> = {
  decisao:    { color: '#3b82f6', label: '🎯 Decisão'    },
  observacao: { color: T.sub,    label: '👁 Observação'  },
  problema:   { color: T.red,    label: '⚠️ Problema'    },
  resultado:  { color: T.green,  label: '✅ Resultado'   },
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,10,18,0.97)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.75)' }}>
      <p style={{ color: T.muted, marginBottom: 8, fontFamily: T.sans }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }}/>
          <span style={{ color: T.muted, minWidth: 60, fontFamily: T.sans }}>{p.name}</span>
          <span style={{ color: p.color, fontWeight: 600, fontFamily: T.mono }}>
            {p.name === 'ROAS' ? `${Number(p.value).toFixed(2)}x` : p.name === 'Margem' ? `${Number(p.value).toFixed(1)}%` : toBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RelatoriosPage() {
  const { active: workspace } = useWorkspaceStore()
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod]     = useState<Period>('7d')
  const [summaries, setSummaries] = useState<DaySummary[]>([])
  const [logs, setLogs]         = useState<OpLog[]>([])
  const [chartTab, setChartTab] = useState<'dre' | 'roas' | 'vendas'>('dre')
  const [showForm, setShowForm] = useState(false)
  const [logTipo, setLogTipo]   = useState('observacao')
  const [logTitulo, setLogTitulo] = useState('')
  const [logConteudo, setLogConteudo] = useState('')
  const [logDia, setLogDia]     = useState(hoje())
  const [savingLog, setSavingLog] = useState(false)

  async function load(wid: string, p: Period) {
    setLoading(true)
    const n    = p === 'hoje' ? 0 : p === '7d' ? 7 : p === '14d' ? 14 : 30
    const from = p === 'hoje' ? hoje() : diasAtras(n)
    const [sumRes, logRes] = await Promise.all([
      supabase.from('daily_summary').select('*').eq('workspace_id', wid).gte('dia', from).lte('dia', hoje()).order('dia', { ascending: true }),
      supabase.from('operation_log').select('*').eq('workspace_id', wid).gte('dia', from).order('dia', { ascending: false }).limit(50),
    ])
    setSummaries((sumRes.data as DaySummary[]) ?? [])
    setLogs((logRes.data as OpLog[]) ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { if (workspace?.id) load(workspace.id, period) }, [workspace?.id, period])

  const totais = useMemo(() => {
    const receita = summaries.reduce((s, r) => s + (r.receita_bruta ?? 0), 0)
    const gasto   = summaries.reduce((s, r) => s + (r.gasto_ads ?? 0), 0)
    const custo   = summaries.reduce((s, r) => s + (r.custo_produto ?? 0), 0)
    const lucro   = summaries.reduce((s, r) => s + (r.lucro_liquido ?? 0), 0)
    const vendas  = summaries.reduce((s, r) => s + (r.vendas_count ?? 0), 0)
    const roas    = gasto > 0 ? receita / gasto : 0
    const margem  = receita > 0 ? (lucro / receita) * 100 : 0
    return { receita, gasto, custo, lucro, vendas, roas, margem }
  }, [summaries])

  const chartData = useMemo(() => summaries.map(s => ({
    dia: fmtDia(s.dia), diaFull: fmtDiaLong(s.dia),
    Receita: s.receita_bruta ?? 0, Gasto: s.gasto_ads ?? 0,
    Lucro: s.lucro_liquido ?? 0, ROAS: s.roas ?? 0,
    Margem: s.margem != null ? s.margem * 100 : 0, Vendas: s.vendas_count ?? 0,
  })), [summaries])

  async function handleSaveLog() {
    if (!workspace?.id || !logConteudo.trim()) return
    setSavingLog(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newLog } = await supabase.from('operation_log').insert({ workspace_id: workspace.id, user_id: user.id, dia: logDia, titulo: logTitulo || null, conteudo: logConteudo, tipo: logTipo }).select('*').single()
    if (newLog) setLogs(l => [newLog as OpLog, ...l])
    setLogTitulo(''); setLogConteudo(''); setLogTipo('observacao'); setLogDia(hoje()); setShowForm(false); setSavingLog(false)
  }

  async function handleDeleteLog(id: string) {
    await supabase.from('operation_log').delete().eq('id', id)
    setLogs(l => l.filter(x => x.id !== id))
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none', fontFamily: T.sans, boxSizing: 'border-box', transition: 'border-color 0.15s' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>Relatórios</h1>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, marginTop: 4 }}>{summaries.length} dias com dados</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['hoje', '7d', '14d', '30d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ height: 30, padding: '0 12px', borderRadius: 8, background: period === p ? 'rgba(59,130,246,0.12)' : 'transparent', border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}`, color: period === p ? '#60a5fa' : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 600 : 400, transition: 'all 0.15s' }}>
              {p === 'hoje' ? 'Hoje' : p}
            </button>
          ))}
          <button onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Receita bruta',  value: toBRL(totais.receita), color: T.green,  icon: DollarSign,   sub: `${summaries.length} dias` },
          { label: 'Gasto em Ads',   value: toBRL(totais.gasto),   color: T.red,    icon: TrendingDown, sub: 'TikTok + Meta' },
          { label: 'Lucro líquido',  value: toBRL(totais.lucro),   color: totais.lucro >= 0 ? T.blue : T.red, icon: TrendingUp, sub: '' },
          { label: 'ROAS geral',     value: `${totais.roas.toFixed(2)}x`, color: totais.roas >= 1.5 ? T.green : T.red, icon: BarChart2, sub: 'receita/gasto' },
          { label: 'Margem líquida', value: `${totais.margem.toFixed(1)}%`, color: totais.margem >= 15 ? T.green : T.amber, icon: Percent, sub: '' },
          { label: 'Custo produto',  value: toBRL(totais.custo),   color: T.amber,  icon: ShoppingCart, sub: 'estimado' },
          { label: 'Vendas',         value: String(totais.vendas), color: T.text,   icon: ShoppingCart, sub: 'no período' },
          { label: 'Ticket médio',   value: totais.vendas > 0 ? toBRL(totais.receita / totais.vendas) : '—', color: T.text, icon: DollarSign, sub: '' },
        ].map(({ label, value, color, icon: Icon, sub }, i) => (
          <motion.div key={label} {...fadeUp(0.04 + i * 0.04)}>
            <SpotlightCard spotlightColor={`${color}12`} style={{ ...cardStyle, height: '100%' }}>
              <div style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
                <GlowCorner color={`${color}18`} position="bottom-right"/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.display }}>{label}</span>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={12} style={{ color }}/>
                  </div>
                </div>
                {loading ? (
                  <div style={{ height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>
                ) : (
                  <p style={{ fontSize: 18, fontWeight: 700, fontFamily: T.display, color, letterSpacing: '-0.02em', position: 'relative', zIndex: 1, margin: 0 }}>{value}</p>
                )}
                {sub && <p style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: T.sans, position: 'relative', zIndex: 1 }}>{sub}</p>}
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* Gráfico */}
      <motion.div {...fadeUp(0.2)}>
        <SpotlightCard style={cardStyle}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: T.display, fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Evolução do período</h2>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[{ key: 'dre', label: 'DRE' }, { key: 'roas', label: 'ROAS' }, { key: 'vendas', label: 'Vendas' }].map(t => (
                  <button key={t.key} onClick={() => setChartTab(t.key as any)}
                    style={{ height: 28, padding: '0 12px', borderRadius: 8, background: chartTab === t.key ? 'rgba(59,130,246,0.12)' : 'transparent', border: `1px solid ${chartTab === t.key ? 'rgba(59,130,246,0.3)' : T.border}`, color: chartTab === t.key ? '#60a5fa' : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ height: 200, borderRadius: 8, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                {chartTab === 'dre' ? (
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRe" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.15}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                      <linearGradient id="gGa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={0.12}/><stop offset="95%" stopColor={T.red} stopOpacity={0}/></linearGradient>
                      <linearGradient id="gLu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.12}/><stop offset="95%" stopColor={T.blue} stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44}/>
                    <RTooltip content={<ChartTip/>}/>
                    <Area type="monotone" dataKey="Receita" stroke={T.green} fill="url(#gRe)" strokeWidth={1.5} dot={false}/>
                    <Area type="monotone" dataKey="Gasto"   stroke={T.red}   fill="url(#gGa)" strokeWidth={1.5} dot={false}/>
                    <Area type="monotone" dataKey="Lucro"   stroke={T.blue}  fill="url(#gLu)" strokeWidth={1.5} dot={false}/>
                  </AreaChart>
                ) : chartTab === 'roas' ? (
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.15}/><stop offset="95%" stopColor={T.blue} stopOpacity={0}/></linearGradient>
                      <linearGradient id="gMa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.amber} stopOpacity={0.12}/><stop offset="95%" stopColor={T.amber} stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} width={36}/>
                    <RTooltip content={<ChartTip/>}/>
                    <Area type="monotone" dataKey="ROAS"   stroke={T.blue}  fill="url(#gRo)" strokeWidth={1.5} dot={false}/>
                    <Area type="monotone" dataKey="Margem" stroke={T.amber} fill="url(#gMa)" strokeWidth={1.5} dot={false}/>
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} width={28}/>
                    <RTooltip content={<ChartTip/>}/>
                    <Bar dataKey="Vendas" fill={T.blue} radius={[4, 4, 0, 0]} opacity={0.85}/>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </SpotlightCard>
      </motion.div>

      {/* DRE + Diário */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>

        {/* DRE diário */}
        <motion.div {...fadeUp(0.28)}>
          <SpotlightCard style={cardStyle}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={13} style={{ color: '#60a5fa' }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.display }}>DRE por dia</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {['Dia', 'Receita', 'Gasto', 'Lucro', 'ROAS', 'Margem'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', fontSize: 9, color: T.muted, fontWeight: 600, textTransform: 'uppercase' as const, textAlign: h === 'Dia' ? 'left' : 'right', letterSpacing: '0.06em', fontFamily: T.display }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...summaries].reverse().map(s => {
                    const lucro  = s.lucro_liquido ?? 0
                    const roas   = s.roas ?? 0
                    const margem = s.margem != null ? s.margem * 100 : null
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: T.sub, fontFamily: T.mono, whiteSpace: 'nowrap' }}>{fmtDia(s.dia)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: T.green,  fontFamily: T.mono, textAlign: 'right' }}>{toBRL(s.receita_bruta ?? 0)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: T.red,    fontFamily: T.mono, textAlign: 'right' }}>{toBRL(s.gasto_ads ?? 0)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: lucro >= 0 ? T.blue : T.red, fontFamily: T.mono, textAlign: 'right', fontWeight: 600 }}>{toBRL(lucro)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: roas >= 1.5 ? T.green : T.red, fontFamily: T.mono, textAlign: 'right' }}>{roas.toFixed(2)}x</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: (margem ?? 0) >= 15 ? T.green : T.amber, fontFamily: T.mono, textAlign: 'right' }}>{margem != null ? `${margem.toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                  {summaries.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: T.muted, fontFamily: T.sans }}>Nenhum dado no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Diário de operação */}
        <motion.div {...fadeUp(0.32)}>
          <SpotlightCard style={cardStyle}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={13} style={{ color: '#60a5fa' }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.display }}>Diário de operação</span>
              <div style={{ flex: 1 }}/>
              <button onClick={() => setShowForm(s => !s)}
                style={{ height: 26, padding: '0 12px', borderRadius: 8, background: showForm ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.12)', border: `1px solid ${showForm ? T.border : 'rgba(59,130,246,0.3)'}`, color: showForm ? T.muted : '#60a5fa', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: T.sans }}>
                {showForm ? <><X size={11}/> Cancelar</> : <><Plus size={11}/> Novo</>}
              </button>
            </div>

            {showForm && (
              <div style={{ padding: 16, borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.display, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Tipo</label>
                    <select value={logTipo} onChange={e => setLogTipo(e.target.value)} style={{ ...inp, height: 34 }}>
                      {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.display, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Data</label>
                    <input type="date" value={logDia} onChange={e => setLogDia(e.target.value)} style={{ ...inp, height: 34, colorScheme: 'dark' as any }}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.display, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Título</label>
                  <input value={logTitulo} onChange={e => setLogTitulo(e.target.value)} placeholder="Ex: Pausei campanha X" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.display, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Nota</label>
                  <textarea value={logConteudo} onChange={e => setLogConteudo(e.target.value)} placeholder="O que aconteceu hoje na operação?" rows={3} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.5 }}/>
                </div>
                <button onClick={handleSaveLog} disabled={savingLog || !logConteudo.trim()}
                  style={{ height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: T.sans, opacity: savingLog || !logConteudo.trim() ? 0.5 : 1 }}>
                  <CheckCircle size={13}/> {savingLog ? 'Salvando...' : 'Salvar nota'}
                </button>
              </div>
            )}

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <BookOpen size={24} style={{ color: T.muted, margin: '0 auto 8px', display: 'block' }}/>
                  <p style={{ fontSize: 12, color: T.muted, fontFamily: T.sans }}>Nenhuma nota. Documente suas decisões!</p>
                </div>
              ) : logs.map(log => {
                const cfg = TIPO_CFG[log.tipo ?? ''] ?? { color: T.muted, label: '📝 Nota' }
                return (
                  <div key={log.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <div style={{ width: 2, borderRadius: 2, background: cfg.color, flexShrink: 0, alignSelf: 'stretch' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, fontFamily: T.display }}>{cfg.label}</span>
                        <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>{fmtDia(log.dia)}</span>
                        {log.titulo && <span style={{ fontSize: 11, color: T.sub, fontFamily: T.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.titulo}</span>}
                        <button onClick={() => handleDeleteLog(log.id)}
                          style={{ marginLeft: 'auto', color: T.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, borderRadius: 4, flexShrink: 0, transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = T.red}
                          onMouseLeave={e => e.currentTarget.style.color = T.muted}>
                          <X size={11}/>
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: T.sub, fontFamily: T.sans, lineHeight: 1.5, margin: 0 }}>{log.conteudo}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes sk   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 768px) {
          .rel-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
