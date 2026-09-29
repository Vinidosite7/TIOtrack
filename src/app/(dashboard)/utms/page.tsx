'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import {
  H, Panel, PanelHead, PageHeader, PeriodSegment, RefreshBtn, BarRow, Empty, MiniStat,
  brl, num, PERIOD_LABEL, type Period,
} from '@/components/hawk/ui'

type GroupBy = 'utm_source' | 'utm_campaign' | 'utm_medium' | 'utm_content'
const GROUPS: { key: GroupBy; label: string }[] = [
  { key: 'utm_source', label: 'Origem' }, { key: 'utm_campaign', label: 'Campanha' }, { key: 'utm_medium', label: 'Meio' }, { key: 'utm_content', label: 'Criativo' },
]
const EV_LIMIT = 20000
const DAYS: Record<Period, number> = { hoje: 1, '7d': 7, '30d': 30 }
const decode = (s: string | null | undefined) => { try { return s ? decodeURIComponent(s) : null } catch { return s || null } }
const pct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0).replace('.', ',')}%`

type Ev = { session_id: string | null; event_name: string; utm_source: string | null; utm_campaign: string | null; utm_medium: string | null; utm_content: string | null }
type Conv = { id: string; valor: number; status: string; session_id: string | null; click_id: string | null; customer_name: string | null; produto: string | null; created_at: string; utm_source: string | null; utm_campaign: string | null; utm_medium: string | null; utm_content: string | null }

const isCheckout = (n: string) => /checkout|initiate|add_payment|pix/i.test(n)
const isEngaged = (n: string) => /click|lead|scroll|view_content|telegram/i.test(n)

export default function FunilPage() {
  const { active } = useWorkspaceStore()
  const [period, setPeriod] = useState<Period>('7d')
  const [groupBy, setGroupBy] = useState<GroupBy>('utm_source')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [events, setEvents] = useState<Ev[]>([])
  const [convs, setConvs] = useState<Conv[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!active?.id) return
    setLoading(true)
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (DAYS[period] - 1))
    const [ev, cv] = await Promise.all([
      supabase.from('traffic_events').select('session_id,event_name,utm_source,utm_campaign,utm_medium,utm_content').eq('workspace_id', active.id).eq('action', 'allow').gte('created_at', since.toISOString()).limit(EV_LIMIT),
      supabase.from('conversions').select('id,valor,status,session_id,click_id,customer_name,produto,created_at,utm_source,utm_campaign,utm_medium,utm_content').eq('workspace_id', active.id).gte('dia', since.toISOString().slice(0, 10)).order('created_at', { ascending: false }),
    ])
    setEvents((ev.data || []) as Ev[])
    setConvs((cv.data || []) as Conv[])
    setLoading(false); setRefreshing(false)
  }, [active?.id, period])
  useEffect(() => { load() }, [load])

  // ── funil por sessão ────────────────────────────────────────
  const funnel = useMemo(() => {
    const sess: Record<string, { n: number; engaged: boolean; checkout: boolean }> = {}
    for (const e of events) {
      if (!e.session_id) continue
      const s = (sess[e.session_id] ||= { n: 0, engaged: false, checkout: false })
      s.n++
      if (isEngaged(e.event_name)) s.engaged = true
      if (isCheckout(e.event_name)) { s.checkout = true; s.engaged = true }
    }
    const list = Object.values(sess)
    const visitors = list.length
        const paid = convs.filter(c => c.status === 'paid')
    const pending = convs.filter(c => c.status === 'pending')
    // Só entra no funil a venda que casou com uma sessão rastreada — senão a etapa final passaria do topo
    const paidInFunnel = new Set(paid.map(c => c.session_id).filter((id): id is string => !!id && !!sess[id]))
    for (const id of paidInFunnel) { sess[id].checkout = true; sess[id].engaged = true }
    const checkout = list.filter(s => s.checkout).length
    const unmatched = paid.length - paid.filter(c => c.session_id && sess[c.session_id]).length
    return {
      stages: [
        { label: 'Visitantes', sub: 'sessões reais', v: visitors },
        { label: 'Engajados', sub: '2+ eventos ou clique', v: list.filter(s => s.engaged || s.n > 1).length },
        { label: 'Checkout', sub: 'iniciaram pagamento', v: checkout },
        { label: 'Compraram', sub: `${num(paid.length)} vendas no total · ${num(unmatched)} sem sessão`, v: paidInFunnel.size },
      ],
      paid, pending,
    }
  }, [events, convs])

  // ── quebra por UTM ──────────────────────────────────────────
  const rows = useMemo(() => {
    const keyOf = (x: any) => decode(x[groupBy]) || '(sem UTM)'
    const m: Record<string, { key: string; sessions: Set<string>; checkout: Set<string>; vendas: number; pend: number; receita: number; sales: Conv[] }> = {}
    const get = (k: string) => (m[k] ||= { key: k, sessions: new Set(), checkout: new Set(), vendas: 0, pend: 0, receita: 0, sales: [] })
    const buyers = new Set(convs.filter(c => c.status === 'paid' && c.session_id).map(c => c.session_id as string))
    for (const e of events) {
      if (!e.session_id) continue
      const g = get(keyOf(e)); g.sessions.add(e.session_id)
      if (isCheckout(e.event_name)) g.checkout.add(e.session_id)
    }
    for (const c of convs) {
      const g = get(keyOf(c))
      if (c.status === 'paid') { g.vendas++; g.receita += c.valor; g.sales.push(c) }
      if (c.status === 'pending') g.pend++
    }
    const q = search.trim().toLowerCase()
    return Object.values(m)
      .map(g => ({ ...g, s: g.sessions.size, ck: g.checkout.size, conv: pct([...g.sessions].filter(id => buyers.has(id)).length, g.sessions.size), rps: g.sessions.size ? g.receita / g.sessions.size : 0 }))
      .filter(g => !q || g.key.toLowerCase().includes(q))
      .sort((a, b) => b.receita - a.receita || b.s - a.s)
  }, [events, convs, groupBy, search])

  const quality = useMemo(() => {
    const total = convs.length || 0
    const withUtm = convs.filter(c => c.utm_source || c.utm_campaign).length
    const withSession = convs.filter(c => c.session_id || c.click_id).length
    return { total, withUtm: pct(withUtm, total), withSession: pct(withSession, total) }
  }, [convs])

  const maxS = Math.max(1, ...funnel.stages.map(s => s.v))
  const groupLabel = GROUPS.find(g => g.key === groupBy)!.label
  const maxReceita = rows[0]?.receita || 1

  return (
    <div className="shell-page">
      <PageHeader title="Funil & UTMs" sub={`Do clique à venda paga · ${PERIOD_LABEL[period].toLowerCase()}`}
        right={<>
          <PeriodSegment value={period} onChange={setPeriod} />
          <RefreshBtn spinning={refreshing} onClick={() => { setRefreshing(true); load() }} />
        </>} />

      {/* Funil */}
      <Panel style={{ marginBottom: 12 }}>
        <PanelHead title="Funil de conversão" sub="Tráfego real (permitido) → vendas confirmadas" dot
          right={events.length >= EV_LIMIT ? <span className="tt-badge">amostra de {num(EV_LIMIT)} eventos</span> : undefined} />
        <div className="hk-funnel" style={{ padding: 18 }}>
          {funnel.stages.map((s, i) => {
            const prev = i > 0 ? funnel.stages[i - 1].v : s.v
            return (
              <div key={s.label} className="tt-inset" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: H.sub, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  {i > 0 && <span className="tt-chip">{fmtPct(pct(s.v, prev))}</span>}
                </div>
                <div className="tt-num" style={{ fontSize: 'clamp(26px, 2.6vw, 36px)', lineHeight: 1, background: 'linear-gradient(180deg,#fff,#b9bcf7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{loading ? '—' : num(s.v)}</div>
                <div style={{ height: 70, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${Math.max(6, (s.v / maxS) * 100)}%`, borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(180deg, rgba(242,243,255,.9) 0%, rgba(126,132,220,.85) 100%)', opacity: 1 - i * 0.14, transition: 'height .6s ease' }} />
                </div>
                <div className="tt-cap">{s.sub}{i > 0 && ` · ${fmtPct(pct(s.v, funnel.stages[0].v))} do topo`}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      <div className="hk-split">
        {/* Tabela UTM */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '6px 18px 0', flexWrap: 'wrap' }}>
            <div className="tt-tabbar no-scrollbar" style={{ borderBottom: 0 }}>
              {GROUPS.map(g => <button key={g.key} className="tt-tab" data-active={groupBy === g.key} onClick={() => { setGroupBy(g.key); setOpen(null) }}>{g.label}</button>)}
            </div>
            <div style={{ position: 'relative', width: 240, marginBottom: 6 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: 12, color: H.muted }} />
              <input className="tt-input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar ${groupLabel.toLowerCase()}...`} />
            </div>
          </div>
          <div style={{ height: 1, background: H.line }} />
          <div style={{ overflowX: 'auto' }}>
            <table className="tt-table" style={{ minWidth: 820 }}>
              <thead><tr>
                <th style={{ width: 28 }} />
                {[groupLabel, 'Sessões', 'Checkout', 'Vendas', 'Conv.', 'R$/sessão', 'Receita'].map((h, i) => <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const isOpen = open === r.key
                  return (
                    <Fragment key={r.key}>
                      <tr onClick={() => setOpen(isOpen ? null : r.key)} style={{ cursor: 'pointer', background: isOpen ? 'rgba(163,167,242,.05)' : undefined }}>
                        <td style={{ paddingRight: 0, color: H.muted }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td style={{ maxWidth: 300 }}>
                          <div style={{ color: r.key === '(sem UTM)' ? H.muted : H.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.key}</div>
                          <div style={{ height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', marginTop: 7, overflow: 'hidden', maxWidth: 220 }}>
                            <div style={{ width: `${(r.receita / maxReceita) * 100}%`, height: '100%', background: 'linear-gradient(90deg, rgba(163,167,242,.4), #dcdefd)' }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', color: H.sub }}>{num(r.s)}</td>
                        <td style={{ textAlign: 'right', color: H.sub }}>{num(r.ck)}</td>
                        <td style={{ textAlign: 'right', color: H.text }}>{num(r.vendas)}{r.pend > 0 && <span style={{ color: H.amber, fontSize: 10.5, marginLeft: 5 }}>+{r.pend}</span>}</td>
                        <td style={{ textAlign: 'right', color: r.conv >= 2 ? H.green : r.conv > 0 ? H.sub : H.muted, fontWeight: 600 }}>{r.s ? fmtPct(r.conv) : '—'}</td>
                        <td style={{ textAlign: 'right', color: H.sub }}>{r.s ? brl(r.rps, 2) : '—'}</td>
                        <td style={{ textAlign: 'right', color: H.text, fontWeight: 700 }}>{brl(r.receita)}</td>
                      </tr>
                      {isOpen && (
                        <tr><td colSpan={8} style={{ padding: 0, background: 'rgba(9,11,22,.35)' }}>
                          {r.sales.length === 0 ? <Empty pad={18}>Nenhuma venda paga atribuída.</Empty> : r.sales.slice(0, 6).map(c => (
                            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr auto', gap: 12, padding: '9px 18px 9px 46px', borderBottom: `1px solid ${H.lineSoft}`, fontSize: 12 }}>
                              <span className="tt-mono" style={{ color: H.muted, fontSize: 11 }}>{new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              <span style={{ color: H.sub }}>{c.customer_name || 'Cliente'}</span>
                              <span style={{ color: H.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.produto || '—'}</span>
                              <span style={{ color: H.text, fontWeight: 600 }}>{brl(c.valor, 2)}</span>
                            </div>
                          ))}
                        </td></tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 && <Empty pad={40}>{search ? 'Nada nesse filtro.' : 'Sem tráfego nem vendas com UTM nesse período.'}</Empty>}
        </Panel>

        {/* Qualidade da atribuição */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel>
            <PanelHead title="Qualidade da atribuição" sub={`${num(quality.total)} conversões no período`} />
            <div style={{ padding: '6px 18px 16px' }}>
              <BarRow label="Vendas com UTM" value={fmtPct(quality.withUtm)} ratio={quality.withUtm / 100} sub="utm_source ou utm_campaign preenchido" />
              <BarRow label="Vendas ligadas a sessão" value={fmtPct(quality.withSession)} ratio={quality.withSession / 100} sub="session_id ou click_id (sck) casado" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <MiniStat label="Pagas" value={num(funnel.paid.length)} tone="good" />
                <MiniStat label="PIX pendente" value={num(funnel.pending.length)} tone={funnel.pending.length ? 'warn' : undefined} />
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHead title={`Top ${groupLabel.toLowerCase()} por R$/sessão`} sub="mínimo de 20 sessões" />
            <div style={{ padding: '6px 18px 14px' }}>
              {(() => {
                const top = rows.filter(r => r.s >= 20).sort((a, b) => b.rps - a.rps).slice(0, 5)
                if (!top.length) return <Empty pad={24}>Volume insuficiente ainda.</Empty>
                return top.map(r => <BarRow key={r.key} label={r.key} sub={`${num(r.s)} sessões · ${fmtPct(r.conv)} conv.`} value={brl(r.rps, 2)} ratio={r.rps / (top[0].rps || 1)} />)
              })()}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
