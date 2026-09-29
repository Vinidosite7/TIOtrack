'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Search, CircleDollarSign, Clock, Ticket, Percent, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import {
  H, Panel, PanelHead, KpiCard, PageHeader, PeriodSegment, RefreshBtn, BarRow, StatusPill, Pager, Empty,
  brl, num, pctDelta, PERIOD_LABEL, type Period,
} from '@/components/hawk/ui'
import { HawkBars, SeriesLegend, dayBuckets, type SeriesDef } from '@/components/hawk/charts'

type Conversion = { id: string; created_at: string; dia: string | null; customer_name: string | null; valor: number; status: string; produto: string | null; utm_source: string | null; utm_campaign: string | null; payment_method: string | null; payment_platform: string | null }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const DAYS: Record<Period, number> = { hoje: 1, '7d': 7, '30d': 30 }
const fmtTime = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const decode = (s: string | null) => { try { return s ? decodeURIComponent(s) : '' } catch { return s || '' } }
const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
  paid: { label: 'Pago', tone: 'good' }, pending: { label: 'Pendente', tone: 'warn' }, refunded: { label: 'Reembolso', tone: 'bad' },
  chargeback: { label: 'Chargeback', tone: 'bad' }, cancelled: { label: 'Cancelado', tone: 'neutral' },
}
const SERIES: SeriesDef[] = [{ key: 'receita', label: 'Pago', tone: 'light' }, { key: 'pix', label: 'Pendente', tone: 'dim' }]
const PER_PAGE = 25

export default function VendasPage() {
  const { active } = useWorkspaceStore()
  const [period, setPeriod] = useState<Period>('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [all, setAll] = useState<Conversion[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [platform, setPlatform] = useState('todas')
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(0)

  const r = useMemo(() => {
    const n = DAYS[period], today = new Date()
    const from = addDays(today, -(n - 1)), prevTo = addDays(from, -1)
    return { from: iso(from), to: iso(today), prevFrom: iso(addDays(prevTo, -(n - 1))), prevTo: iso(prevTo), days: n }
  }, [period])

  const load = useCallback(async () => {
    if (!active?.id) return
    setLoading(true)
    const { data } = await supabase.from('conversions').select('*').eq('workspace_id', active.id).gte('dia', r.prevFrom).lte('dia', r.to).order('created_at', { ascending: false })
    setAll((data || []) as Conversion[])
    setLoading(false); setRefreshing(false)
  }, [active?.id, r])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [search, status, platform, period])

  const cur = useMemo(() => all.filter(c => c.dia && c.dia >= r.from && c.dia <= r.to), [all, r])
  const prev = useMemo(() => all.filter(c => c.dia && c.dia >= r.prevFrom && c.dia <= r.prevTo), [all, r])
  const platforms = useMemo(() => Array.from(new Set(cur.map(c => (c.payment_platform || '').trim()).filter(Boolean))).sort(), [cur])

  const base = useMemo(() => cur.filter(c => {
    const q = search.trim().toLowerCase()
    const mq = !q || `${c.customer_name || ''} ${c.produto || ''} ${c.payment_platform || ''} ${decode(c.utm_source)} ${decode(c.utm_campaign)}`.toLowerCase().includes(q)
    return mq && (platform === 'todas' || c.payment_platform === platform)
  }), [cur, search, platform])
  const filtered = useMemo(() => status === 'todos' ? base : base.filter(c => c.status === status), [base, status])

  const k = useMemo(() => {
    const agg = (list: Conversion[]) => {
      const paid = list.filter(c => c.status === 'paid'), pend = list.filter(c => c.status === 'pending')
      const loss = list.filter(c => c.status === 'refunded' || c.status === 'chargeback')
      const s = (l: Conversion[]) => l.reduce((a, c) => a + Number(c.valor || 0), 0)
      const receita = s(paid)
      return { paid, pend, loss, receita, pix: s(pend), perdas: s(loss), ticket: paid.length ? receita / paid.length : 0, conv: paid.length + pend.length ? paid.length / (paid.length + pend.length) : 0 }
    }
    return { c: agg(base), p: agg(prev) }
  }, [base, prev])

  const chart = useMemo(() => {
    if (period === 'hoje') {
      const hours = Array.from({ length: new Date().getHours() + 1 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}h`, receita: 0, pix: 0 }))
      for (const c of base) { const h = new Date(c.created_at).getHours(); if (!hours[h]) continue; if (c.status === 'paid') hours[h].receita += c.valor; if (c.status === 'pending') hours[h].pix += c.valor }
      return hours
    }
    const days = dayBuckets(r.from, r.days).map(d => ({ ...d, receita: 0, pix: 0 }))
    const idx = Object.fromEntries(days.map((d, i) => [d.dia, i]))
    for (const c of base) { const i = idx[c.dia || '']; if (i == null) continue; if (c.status === 'paid') days[i].receita += c.valor; if (c.status === 'pending') days[i].pix += c.valor }
    return days
  }, [base, r, period])

  const bySource = useMemo(() => {
    const m: Record<string, { v: number; n: number }> = {}
    for (const c of k.c.paid) { const key = decode(c.utm_source) || 'Sem origem'; m[key] ||= { v: 0, n: 0 }; m[key].v += c.valor; m[key].n++ }
    return Object.entries(m).sort((a, b) => b[1].v - a[1].v)
  }, [k])
  const byPlatform = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of k.c.paid) { const key = c.payment_platform || '—'; m[key] = (m[key] || 0) + c.valor }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [k])

  function exportCSV() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['Data', 'Cliente', 'Produto', 'Valor', 'Status', 'Fonte', 'Campanha', 'Plataforma', 'Pagamento'], ...filtered.map(c => [fmtTime(c.created_at), c.customer_name, c.produto, c.valor, c.status, decode(c.utm_source), decode(c.utm_campaign), c.payment_platform, c.payment_method])]
    const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `vendas-${period}-${r.to}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const counts: Record<string, number> = { todos: base.length }
  for (const c of base) counts[c.status] = (counts[c.status] || 0) + 1
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  return (
    <div className="shell-page">
      <PageHeader title="Vendas" sub={`${active?.nome || 'Workspace'} · ${PERIOD_LABEL[period].toLowerCase()} · comparado ao período anterior`}
        right={<>
          <PeriodSegment value={period} onChange={setPeriod} />
          <button className="tt-btn" onClick={exportCSV}><Download size={14} /> Exportar</button>
          <RefreshBtn spinning={refreshing} onClick={() => { setRefreshing(true); load() }} />
        </>} />

      <div className="hk-5" style={{ marginBottom: 12 }}>
        <KpiCard icon={CircleDollarSign} label="Receita paga" value={brl(k.c.receita)} delta={pctDelta(k.c.receita, k.p.receita)} progress={Math.max(k.c.receita, k.p.receita) ? k.c.receita / Math.max(k.c.receita, k.p.receita) : 0} loading={loading} hint={`${k.c.paid.length} vendas aprovadas`} />
        <KpiCard icon={Clock} label="PIX pendente" value={brl(k.c.pix)} foot={`${k.c.pend.length} cobranças abertas`} progress={k.c.receita + k.c.pix ? k.c.pix / (k.c.receita + k.c.pix) : 0} loading={loading} />
        <KpiCard icon={Ticket} label="Ticket médio" value={brl(k.c.ticket, 2)} delta={pctDelta(k.c.ticket, k.p.ticket)} progress={Math.max(k.c.ticket, k.p.ticket) ? k.c.ticket / Math.max(k.c.ticket, k.p.ticket) : 0} loading={loading} />
        <KpiCard icon={Percent} label="Conversão de PIX" value={`${(k.c.conv * 100).toFixed(1).replace('.', ',')}%`} delta={pctDelta(k.c.conv, k.p.conv)} progress={k.c.conv} loading={loading} hint="Pagas ÷ (pagas + pendentes)" />
        <KpiCard icon={RotateCcw} label="Reembolso / CB" value={brl(k.c.perdas)} delta={pctDelta(k.c.perdas, k.p.perdas)} invert progress={k.c.receita ? Math.min(1, k.c.perdas / k.c.receita) : 0} loading={loading} hint={`${k.c.loss.length} ocorrências`} />
      </div>

      <div className="hk-row2" style={{ marginBottom: 12 }}>
        <Panel>
          <PanelHead title="Caixa por tempo" sub={period === 'hoje' ? 'Por hora' : `Últimos ${r.days} dias`} right={<SeriesLegend series={SERIES} hidden={hidden} onToggle={key => setHidden(h => ({ ...h, [key]: !h[key] }))} />} />
          <div style={{ padding: '14px 10px 10px 0' }}><HawkBars data={chart} series={SERIES} hidden={hidden} height={290} empty="Sem vendas nesse período." /></div>
        </Panel>
        <Panel>
          <div className="hk-geo" style={{ padding: '16px 18px', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="tt-h">Receita por origem</h2>
              <div className="tt-cap" style={{ marginTop: 3 }}>utm_source das vendas pagas</div>
              <div style={{ marginTop: 10 }}>
                {bySource.length === 0 && <Empty pad={30}>Sem vendas pagas.</Empty>}
                {bySource.slice(0, 6).map(([name, v]) => <BarRow key={name} label={name} sub={`${v.n} venda${v.n === 1 ? '' : 's'}`} value={brl(v.v)} right={`${k.c.receita ? ((v.v / k.c.receita) * 100).toFixed(0) : 0}%`} ratio={v.v / (bySource[0]?.[1].v || 1)} />)}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 className="tt-h">Por plataforma</h2>
              <div className="tt-cap" style={{ marginTop: 3 }}>checkout de origem</div>
              <div style={{ marginTop: 10 }}>
                {byPlatform.length === 0 && <Empty pad={30}>—</Empty>}
                {byPlatform.slice(0, 6).map(([name, v]) => <BarRow key={name} label={name} value={brl(v)} right={`${k.c.receita ? ((v / k.c.receita) * 100).toFixed(0) : 0}%`} ratio={v / (byPlatform[0]?.[1] || 1)} />)}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '6px 18px 0', flexWrap: 'wrap' }}>
          <div className="tt-tabbar no-scrollbar" style={{ borderBottom: 0 }}>
            {['todos', 'paid', 'pending', 'refunded', 'chargeback'].map(s => (
              <button key={s} className="tt-tab" data-active={status === s} onClick={() => setStatus(s)}>
                {s === 'todos' ? 'Todas' : STATUS[s].label}
                <span className="tt-chip" style={{ height: 18, padding: '0 6px' }}>{counts[s] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: H.line }} />
        <div style={{ display: 'flex', gap: 8, padding: '12px 18px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 1 340px', minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: 12, color: H.muted }} />
            <input className="tt-input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, produto, UTM ou plataforma..." />
          </div>
          <select className="tt-select" style={{ width: 200 }} value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="todas">Todas as plataformas</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="tt-cap" style={{ marginLeft: 'auto', alignSelf: 'center' }}>{num(filtered.length)} registros · {brl(filtered.filter(c => c.status === 'paid').reduce((s, c) => s + c.valor, 0))} pagos</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table" style={{ minWidth: 960 }}>
            <thead><tr>{['Data', 'Cliente / Produto', 'Valor', 'Status', 'Origem', 'Campanha', 'Pagamento'].map(h => <th key={h} style={{ textAlign: h === 'Valor' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map(c => (
                <tr key={c.id}>
                  <td className="tt-mono" style={{ color: H.muted, fontSize: 11.5, whiteSpace: 'nowrap' }}>{fmtTime(c.created_at)}</td>
                  <td><div style={{ color: H.text, fontWeight: 600 }}>{c.customer_name || 'Cliente'}</div><div style={{ color: H.muted, fontSize: 11, marginTop: 3 }}>{c.produto || 'Produto não informado'}</div></td>
                  <td style={{ textAlign: 'right', color: H.text, fontWeight: 700 }}>{brl(c.valor, 2)}</td>
                  <td><StatusPill tone={STATUS[c.status]?.tone || 'neutral'}>{STATUS[c.status]?.label || c.status}</StatusPill></td>
                  <td>{decode(c.utm_source) ? <span className="tt-chip">{decode(c.utm_source)}</span> : <span style={{ color: H.muted }}>—</span>}</td>
                  <td style={{ color: H.sub, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decode(c.utm_campaign) || '—'}</td>
                  <td style={{ color: H.sub }}>{[c.payment_platform, c.payment_method].filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <Empty pad={40}>Nenhuma venda encontrada.</Empty>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px' }}>
          <span className="tt-cap">{filtered.length ? `${page * PER_PAGE + 1}–${Math.min(filtered.length, (page + 1) * PER_PAGE)} de ${num(filtered.length)}` : ''}</span>
          <Pager page={page} pages={pages} onChange={setPage} />
        </div>
      </Panel>
    </div>
  )
}
