'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDollarSign, Wallet, Receipt, Target, Crosshair, RefreshCw, Search, Pause, Play, Bot, UserRound,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import {
  H, Panel, PanelHead, KpiCard, TrafficPulseCard, Gauge, MeterRow, WorldMap, Pager, Empty,
  brl, num, short, pctDelta, flag, countryName, timeHMS,
} from '@/components/hawk/ui'

type Period = 'hoje' | '7d' | '30d'
type Ev = {
  id: string; created_at: string; session_id: string | null; action: string; event_name: string; path: string | null
  ip: string | null; country: string | null; device_type: string | null; reason: string | null; risk_score: number | null
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const PERIOD_DAYS: Record<Period, number> = { hoje: 1, '7d': 7, '30d': 30 }
const PERIOD_LABEL: Record<Period, string> = { hoje: 'Hoje', '7d': '7 dias', '30d': '30 dias' }
const EV_COLS = 'id,created_at,session_id,action,event_name,path,ip,country,device_type,reason,risk_score,utm_source,utm_medium,utm_campaign,utm_content'

function ranges(p: Period) {
  const today = new Date()
  const n = PERIOD_DAYS[p]
  const from = addDays(today, -(n - 1))
  const prevTo = addDays(from, -1)
  const prevFrom = addDays(prevTo, -(n - 1))
  return { from: iso(from), to: iso(today), prevFrom: iso(prevFrom), prevTo: iso(prevTo), days: n }
}

function eventLabel(e: Ev, firstOfSession: boolean) {
  const n = (e.event_name || '').toLowerCase()
  if (n.includes('checkout')) return 'Checkout'
  if (n.includes('purchase') || n.includes('compra')) return 'Compra'
  if (n.includes('click')) return 'Clique'
  if (n.includes('lead')) return 'Lead'
  if (firstOfSession) return 'Entrada'
  return 'Navegação'
}

function actionLabel(a: string) {
  return a === 'block' ? 'Bloqueado' : a === 'redirect' ? 'Redirecionado' : a === 'challenge' ? 'Desafiado' : 'Permitido'
}

export default function OverviewPage() {
  const { active } = useWorkspaceStore()
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [spend, setSpend] = useState<{ dia: string; spend: number }[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [series, setSeries] = useState({ receita: true, gasto: true })
  const [prodPage, setProdPage] = useState(0)

  // logs
  const [q, setQ] = useState('')
  const [fCountry, setFCountry] = useState('todos')
  const [fSource, setFSource] = useState('todas')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const buffer = useRef<Ev[]>([])
  const [buffered, setBuffered] = useState(0)
  const [, setTick] = useState(0)

  const r = useMemo(() => ranges(period), [period])

  const load = useCallback(async () => {
    if (!active?.id) return
    setLoading(true)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [tk, meta, conv, ev] = await Promise.all([
      supabase.from('ad_spend_daily').select('dia,spend').eq('workspace_id', active.id).gte('dia', r.prevFrom).lte('dia', r.to),
      (supabase as any).from('meta_ad_spend_daily').select('dia,spend').eq('workspace_id', active.id).gte('dia', r.prevFrom).lte('dia', r.to),
      supabase.from('conversions').select('id,created_at,dia,valor,status,produto').eq('workspace_id', active.id).gte('dia', r.prevFrom).lte('dia', r.to),
      supabase.from('traffic_events').select(EV_COLS).eq('workspace_id', active.id).gte('created_at', since).order('created_at', { ascending: false }).limit(1500),
    ])
    setSpend([...(tk.data || []), ...((meta as any)?.data || [])].map((x: any) => ({ dia: x.dia, spend: Number(x.spend || 0) })))
    setSales(conv.data || [])
    setEvents((ev.data || []) as Ev[])
    setLoading(false)
    setRefreshing(false)
  }, [active?.id, r])

  useEffect(() => { load() }, [load])

  // realtime + pausa
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => {
    if (!active?.id) return
    const ch = supabase.channel(`hk-overview-${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_events', filter: `workspace_id=eq.${active.id}` }, (payload: any) => {
        const row = payload.new as Ev
        if (pausedRef.current) { buffer.current.unshift(row); setBuffered(buffer.current.length); return }
        setEvents(prev => [row, ...prev].slice(0, 1500))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active?.id])
  // re-render a cada 15s para a janela "ativos agora / últimos 30 min" andar sozinha
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 15000); return () => clearInterval(t) }, [])

  function togglePause() {
    if (paused && buffer.current.length) {
      const rows = buffer.current
      buffer.current = []
      setBuffered(0)
      setEvents(prev => [...rows, ...prev].slice(0, 1500))
    }
    setPaused(p => !p)
  }

  // ── números ─────────────────────────────────────────────────
  const k = useMemo(() => {
    const inCur = (d?: string | null) => !!d && d >= r.from && d <= r.to
    const inPrev = (d?: string | null) => !!d && d >= r.prevFrom && d <= r.prevTo
    const sum = (rows: any[], f: string) => rows.reduce((s, x) => s + Number(x[f] || 0), 0)
    const paidCur = sales.filter(s => s.status === 'paid' && inCur(s.dia))
    const paidPrev = sales.filter(s => s.status === 'paid' && inPrev(s.dia))
    const lossCur = sales.filter(s => (s.status === 'refunded' || s.status === 'chargeback') && inCur(s.dia))
    const lossPrev = sales.filter(s => (s.status === 'refunded' || s.status === 'chargeback') && inPrev(s.dia))
    const bruto = sum(paidCur, 'valor'), brutoP = sum(paidPrev, 'valor')
    const liquido = bruto - sum(lossCur, 'valor'), liquidoP = brutoP - sum(lossPrev, 'valor')
    const gasto = sum(spend.filter(s => inCur(s.dia)), 'spend'), gastoP = sum(spend.filter(s => inPrev(s.dia)), 'spend')
    const roas = gasto > 0 ? bruto / gasto : 0, roasP = gastoP > 0 ? brutoP / gastoP : 0
    const cpa = paidCur.length ? gasto / paidCur.length : 0, cpaP = paidPrev.length ? gastoP / paidPrev.length : 0
    const ratio = (a: number, b: number) => Math.max(a, b) > 0 ? a / Math.max(a, b) : 0
    return {
      bruto, liquido, gasto, roas, cpa, vendas: paidCur.length,
      d: { bruto: pctDelta(bruto, brutoP), liquido: pctDelta(liquido, liquidoP), gasto: pctDelta(gasto, gastoP), roas: pctDelta(roas, roasP), cpa: pctDelta(cpa, cpaP) },
      p: { bruto: ratio(bruto, brutoP), liquido: bruto > 0 ? liquido / bruto : 0, gasto: ratio(gasto, gastoP), roas: Math.min(1, roas / 4), cpa: ratio(cpaP, cpa) },
      paidCur,
    }
  }, [sales, spend, r])

  // ── gráfico desempenho por tempo ────────────────────────────
  const chart = useMemo(() => {
    if (period === 'hoje') {
      const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}h`, receita: 0, gasto: 0 }))
      for (const s of k.paidCur) hours[new Date(s.created_at).getHours()].receita += Number(s.valor || 0)
      return hours.slice(0, new Date().getHours() + 1)
    }
    const days: Record<string, { label: string; receita: number; gasto: number }> = {}
    for (let i = 0; i < r.days; i++) {
      const d = iso(addDays(new Date(r.from + 'T12:00:00'), i))
      days[d] = { label: d.slice(8, 10) + '/' + d.slice(5, 7), receita: 0, gasto: 0 }
    }
    for (const s of k.paidCur) if (days[s.dia]) days[s.dia].receita += Number(s.valor || 0)
    for (const s of spend) if (days[s.dia]) days[s.dia].gasto += s.spend
    return Object.values(days)
  }, [k.paidCur, spend, r, period])

  // ── faturamento por produto ─────────────────────────────────
  const products = useMemo(() => {
    const m: Record<string, { name: string; valor: number; n: number }> = {}
    for (const s of k.paidCur) {
      const key = (s.produto || 'Sem produto').trim()
      m[key] ||= { name: key, valor: 0, n: 0 }
      m[key].valor += Number(s.valor || 0); m[key].n++
    }
    return Object.values(m).sort((a, b) => b.valor - a.valor)
  }, [k.paidCur])
  const PER = 4
  const prodPages = Math.max(1, Math.ceil(products.length / PER))
  useEffect(() => { setProdPage(0) }, [period, active?.id])

  // ── tráfego ─────────────────────────────────────────────────
  const t = useMemo(() => {
    const now = Date.now()
    const activeNow = new Set(events.filter(e => now - new Date(e.created_at).getTime() < 5 * 60 * 1000).map(e => e.session_id).filter(Boolean)).size
    const bars = Array.from({ length: 30 }, () => 0)
    for (const e of events) {
      const m = Math.floor((now - new Date(e.created_at).getTime()) / 60000)
      if (m >= 0 && m < 30) bars[29 - m]++
    }
    const byCountry: Record<string, number> = {}
    for (const e of events) if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1
    const allowed = events.filter(e => e.action === 'allow').length
    const firstSeen = new Set<string>()
    const firstIds = new Set<string>()
    for (let i = events.length - 1; i >= 0; i--) {
      const s = events[i].session_id
      if (s && !firstSeen.has(s)) { firstSeen.add(s); firstIds.add(events[i].id) }
    }
    const countries = Object.keys(byCountry).sort((a, b) => byCountry[b] - byCountry[a])
    const sources = Array.from(new Set(events.map(e => e.utm_source || 'direto'))).sort()
    return { activeNow, bars, byCountry, allowed, denied: events.length - allowed, firstIds, countries, sources }
  }, [events])

  const filteredEvents = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return events.filter(e => {
      if (fCountry !== 'todos' && e.country !== fCountry) return false
      if (fSource !== 'todas' && (e.utm_source || 'direto') !== fSource) return false
      if (!qq) return true
      return [e.ip, e.path, e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content, e.reason].some(v => v && v.toLowerCase().includes(qq))
    })
  }, [events, q, fCountry, fSource])
  const bots = filteredEvents.filter(e => e.action !== 'allow').slice(0, 7)
  const real = filteredEvents.filter(e => e.action === 'allow').slice(0, 7)
  const topCountries = t.countries.slice(0, 4)

  return (
    <div className="shell-page">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h1 className="tt-title">Visão geral</h1>
          <div className="tt-cap" style={{ marginTop: 4 }}>
            {active?.nome || 'Workspace'} · {period === 'hoje' ? 'hoje' : `${r.from.split('-').reverse().slice(0, 2).join('/')} → ${r.to.split('-').reverse().slice(0, 2).join('/')}`} · comparado ao período anterior
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tt-segment">
            {(['hoje', '7d', '30d'] as Period[]).map(p => <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</button>)}
          </div>
          <button className="tt-icon-btn" title="Atualizar" aria-label="Atualizar" onClick={() => { setRefreshing(true); load() }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
          </button>
        </div>
      </div>

      {/* Linha 1 — tráfego + KPIs */}
      <div className="hk-kpis" style={{ marginBottom: 12 }}>
        <TrafficPulseCard active={t.activeNow} bars={t.bars} loading={loading} />
        <KpiCard icon={CircleDollarSign} label="Faturamento Bruto" value={brl(k.bruto)} delta={k.d.bruto} progress={k.p.bruto} href="/vendas" loading={loading} hint={`${k.vendas} vendas pagas · vs. período anterior`} />
        <KpiCard icon={Wallet} label="Faturamento Líquido" value={brl(k.liquido)} delta={k.d.liquido} progress={k.p.liquido} href="/vendas" loading={loading} hint="Bruto − reembolsos − chargebacks" />
        <KpiCard icon={Receipt} label="Gastos" value={brl(k.gasto)} delta={k.d.gasto} progress={k.p.gasto} href="/campanhas" loading={loading} hint="TikTok + Meta · vs. período anterior" />
        <KpiCard icon={Target} label="ROAS" value={`${k.roas.toFixed(2).replace('.', ',')}x`} delta={k.d.roas} progress={k.p.roas} href="/campanhas" loading={loading} />
        <KpiCard icon={Crosshair} label="CPA" value={brl(k.cpa)} delta={k.d.cpa} invert progress={k.p.cpa} href="/campanhas" loading={loading} hint="Gasto ÷ vendas pagas (menor é melhor)" />
      </div>

      {/* Linha 2 — desempenho + produto/país */}
      <div className="hk-row2" style={{ marginBottom: 12 }}>
        <Panel>
          <PanelHead
            title="Desempenho por tempo"
            sub={period === 'hoje' ? 'Faturamento por hora (gasto só tem granularidade diária)' : `Últimos ${r.days} dias`}
            right={
              <div style={{ display: 'flex', gap: 12 }}>
                {([['receita', 'Faturamento', '#dcdefd'], ['gasto', 'Gastos', H.lavDim]] as const).map(([key, label, color]) => (
                  <button key={key} onClick={() => setSeries(s => ({ ...s, [key]: !s[key] }))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: series[key] ? H.sub : H.muted, opacity: series[key] ? 1 : 0.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{label}
                  </button>
                ))}
              </div>
            }
          />
          <div style={{ height: 300, padding: '14px 10px 10px 0' }}>
            {!loading && chart.every(c => !c.receita && !c.gasto) ? (
              <Empty pad={110}>Sem movimento nesse período.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} barGap={3} barCategoryGap={period === '7d' ? '32%' : '22%'}>
                  <defs>
                    <linearGradient id="hk-bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f2f3ff" />
                      <stop offset="100%" stopColor="#7e84dc" />
                    </linearGradient>
                    <linearGradient id="hk-bar-2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6b70a8" />
                      <stop offset="100%" stopColor="#3b3f68" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(163,167,242,.07)" vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="label" tick={{ fill: H.muted, fontSize: 10.5, fontStyle: 'italic' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tick={{ fill: H.muted, fontSize: 10.5 }} axisLine={false} tickLine={false} tickFormatter={v => short(Number(v))} width={44} />
                  <Tooltip cursor={{ fill: 'rgba(163,167,242,.06)' }} contentStyle={{ background: '#161a2c', border: `1px solid ${H.line}`, borderRadius: 10, color: H.text, fontSize: 12 }} labelStyle={{ color: H.sub }} formatter={(v: any, name: any) => [brl(Number(v)), name === 'receita' ? 'Faturamento' : 'Gastos']} />
                  {series.receita && <Bar dataKey="receita" fill="url(#hk-bar)" radius={[4, 4, 1, 1]} maxBarSize={14} />}
                  {series.gasto && <Bar dataKey="gasto" fill="url(#hk-bar-2)" radius={[4, 4, 1, 1]} maxBarSize={14} />}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="hk-geo" style={{ padding: '16px 18px 14px', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
              <h2 className="tt-h">Faturamento por produto</h2>
              <div className="tt-cap" style={{ marginTop: 3 }}>{products.length} produto{products.length === 1 ? '' : 's'} · {PERIOD_LABEL[period].toLowerCase()}</div>
              <div style={{ marginTop: 12, flex: 1 }}>
                {!loading && products.length === 0 && <Empty pad={30}>Nenhuma venda paga no período.</Empty>}
                {products.slice(prodPage * PER, prodPage * PER + PER).map(p => (
                  <div key={p.name} style={{ padding: '9px 0', borderBottom: `1px solid ${H.lineSoft}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: H.text, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{p.n} venda{p.n === 1 ? '' : 's'} × {brl(p.valor / p.n, 2)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="tt-num" style={{ fontSize: 13.5 }}>{brl(p.valor)}</div>
                        <div style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{k.bruto ? ((p.valor / k.bruto) * 100).toFixed(1).replace('.', ',') : 0}%</div>
                      </div>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', marginTop: 7, overflow: 'hidden' }}>
                      <div style={{ width: `${(p.valor / (products[0]?.valor || 1)) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, rgba(163,167,242,.4), #dcdefd)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><Pager page={prodPage} pages={prodPages} onChange={setProdPage} /></div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: H.sub, fontSize: 12, fontWeight: 600 }}>Tráfego por país</span>
                <span className="tt-cap">24h</span>
              </div>
              <div className="tt-inset" style={{ marginTop: 8, padding: 4 }}>
                {t.countries.length === 0 ? <Empty pad={70}>Sem tráfego capturado ainda.</Empty> : <WorldMap counts={t.byCountry} height={200} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, marginTop: 8 }}>
                {topCountries.map(cc => (
                  <div key={cc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 11.5, color: H.sub, padding: '4px 2px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flag(cc)} {countryName(cc)}</span>
                    <span className="tt-num" style={{ fontSize: 11.5 }}>{events.length ? Math.round((t.byCountry[cc] / events.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Linha 3 — logs */}
      <Panel>
        <PanelHead
          title="Logs"
          sub={<>Tráfego e bots · {paused ? 'pausado' : 'ao vivo'} · últimas 24h</>}
          right={
            <button className="tt-btn" onClick={togglePause} style={{ fontSize: 12 }}>
              {paused ? <Play size={13} /> : <Pause size={13} />}
              {paused ? `Retomar${buffered ? ` (+${buffered})` : ''}` : 'Pausar ao vivo'}
            </button>
          }
        />
        <div style={{ display: 'flex', gap: 8, padding: '12px 18px 0', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: 12, color: H.muted }} />
            <input className="tt-input" style={{ paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar IP, página ou UTM..." />
          </div>
          <select className="tt-select" style={{ width: 180 }} value={fCountry} onChange={e => setFCountry(e.target.value)}>
            <option value="todos">Todos os países</option>
            {t.countries.map(c => <option key={c} value={c}>{flag(c)} {countryName(c)}</option>)}
          </select>
          <select className="tt-select" style={{ width: 180 }} value={fSource} onChange={e => setFSource(e.target.value)}>
            <option value="todas">Todas as origens</option>
            {t.sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="hk-logs" style={{ padding: 18 }}>
          <div className="tt-inset" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Gauge value={filteredEvents.length} ratio={events.length ? filteredEvents.filter(e => e.action === 'allow').length / Math.max(filteredEvents.length, 1) : 0} label="requisições" />
            <div style={{ width: '100%' }}>
              <MeterRow label="Requisições" value={filteredEvents.length} total={filteredEvents.length} />
              <MeterRow label="Permitidos" value={filteredEvents.filter(e => e.action === 'allow').length} total={filteredEvents.length} />
              <MeterRow label="Negados" value={filteredEvents.filter(e => e.action !== 'allow').length} total={filteredEvents.length} />
            </div>
          </div>

          <LogColumn icon={Bot} title="Bots" count={filteredEvents.filter(e => e.action !== 'allow').length} empty="Nenhum bot ou acesso negado.">
            {bots.map(e => (
              <LogRow key={e.id} e={e}
                title={<><span style={{ color: e.action === 'challenge' ? H.amber : H.red }}>{actionLabel(e.action)}</span> <span style={{ color: H.muted }}>·</span> <span className="tt-mono" style={{ fontSize: 11 }}>{e.path || '/'}</span></>}
                line2={<span style={{ color: H.muted }}>{e.reason || `risco ${e.risk_score ?? 0}`}</span>} />
            ))}
          </LogColumn>

          <LogColumn icon={UserRound} title="Tráfego real" count={filteredEvents.filter(e => e.action === 'allow').length} empty="Nenhuma navegação real ainda.">
            {real.map(e => (
              <LogRow key={e.id} e={e}
                title={<><span>{eventLabel(e, t.firstIds.has(e.id))}</span> <span className="tt-mono" style={{ fontSize: 11, color: H.sub, fontWeight: 400 }}>{e.path || '/'}</span></>}
                line2={
                  <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                    {[e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content].filter(Boolean).length === 0
                      ? <span className="tt-chip">Direto · sem UTM</span>
                      : [e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content].filter(Boolean).map((u, i) => <span key={i} className="tt-chip">{u}</span>)}
                  </span>
                } />
            ))}
          </LogColumn>
        </div>
        <div className="tt-cap" style={{ padding: '0 18px 14px', textAlign: 'right' }}>
          Mostrando {Math.min(7, bots.length) + Math.min(7, real.length)} de {num(filteredEvents.length)} eventos · <a href="/traffic/logs" style={{ color: H.lav }}>abrir explorador</a>
        </div>
      </Panel>
    </div>
  )
}

function LogColumn({ icon: Icon, title, count, empty, children }: { icon: any; title: string; count: number; empty: string; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div className="tt-inset" style={{ overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${H.lineSoft}` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: H.text }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(163,167,242,.14)' }}><Icon size={12} color={H.lav} /></span>
          {title}
        </span>
        <span className="tt-num" style={{ fontSize: 12, color: H.sub }}>{num(count)}</span>
      </div>
      {has ? children : <Empty pad={40}>{empty}</Empty>}
    </div>
  )
}

function LogRow({ e, title, line2 }: { e: Ev; title: React.ReactNode; line2: React.ReactNode }) {
  return (
    <div className="hk-row-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '9px 14px', borderBottom: `1px solid ${H.lineSoft}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: H.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 11, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line2}</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 10.5, color: H.muted, lineHeight: 1.5 }}>
        <div title={countryName(e.country)}>{flag(e.country)} {e.country || '—'} <span className="tt-mono">{e.ip || ''}</span></div>
        <div className="tt-mono">{timeHMS(e.created_at)}</div>
      </div>
    </div>
  )
}
