'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Send, Fingerprint, Link2, Workflow, RefreshCcw, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import {
  H, Panel, PanelHead, KpiCard, PageHeader, PeriodSegment, RefreshBtn, BarRow, StatusPill, IconOrb, Empty, Gauge,
  brl, num, PERIOD_LABEL, type Period,
} from '@/components/hawk/ui'

const DAYS: Record<Period, number> = { hoje: 1, '7d': 7, '30d': 30 }
const pct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0).replace('.', ',')}%`

type Conv = {
  id: string; created_at: string; valor: number; status: string; produto: string | null; customer_name: string | null; customer_phone: string | null
  click_id: string | null; session_id: string | null; ttclid: string | null; fbclid: string | null; gclid: string | null
  utm_source: string | null; utm_campaign: string | null; tiktok_event_sent: boolean | null; tiktok_event_sent_at: string | null; tiktok_event_response: any
}

function delivery(c: Conv): { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } {
  const resp = c.tiktok_event_response
  const failed = resp && (resp.code && resp.code !== 0 || resp.error || resp.message && /error|fail/i.test(String(resp.message)))
  if (failed) return { label: 'Falhou', tone: 'bad' }
  if (c.tiktok_event_sent) return { label: 'Entregue', tone: 'good' }
  if (c.ttclid) return { label: 'Não enviado', tone: 'warn' }
  return { label: 'Sem ttclid', tone: 'neutral' }
}

const LAYERS = [
  { title: 'Identidade', desc: 'visitor_id · session_id · click_id do clique até a venda', icon: Fingerprint, on: true },
  { title: 'Contexto de tráfego', desc: 'UTMs + ttclid/fbclid/gclid juntos com o evento', icon: Workflow, on: true },
  { title: 'TikTok Events API', desc: 'Purchase enviado com ttclid', icon: Send, on: false, dynamic: true },
  { title: 'Meta CAPI', desc: 'Purchase com fbclid/fbc', icon: Link2, on: false },
  { title: 'Fila + retry', desc: 'Outbox com reenvio automático e log de entrega', icon: RefreshCcw, on: false },
]

export default function Signal() {
  const { active } = useWorkspaceStore()
  const [period, setPeriod] = useState<Period>('7d')
  const [rows, setRows] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!active?.id) return
    setLoading(true)
    const d = new Date(); d.setDate(d.getDate() - (DAYS[period] - 1))
    const { data } = await supabase.from('conversions')
      .select('id,created_at,valor,status,produto,customer_name,customer_phone,click_id,session_id,ttclid,fbclid,gclid,utm_source,utm_campaign,tiktok_event_sent,tiktok_event_sent_at,tiktok_event_response')
      .eq('workspace_id', active.id).gte('dia', d.toISOString().slice(0, 10)).order('created_at', { ascending: false })
    setRows((data || []) as Conv[]); setLoading(false); setRefreshing(false)
  }, [active?.id, period])
  useEffect(() => { load() }, [load])

  const s = useMemo(() => {
    const paid = rows.filter(r => r.status === 'paid')
    const n = paid.length
    const c = (f: (r: Conv) => any) => paid.filter(f).length
    const sent = c(r => r.tiktok_event_sent), withTt = c(r => r.ttclid), withFb = c(r => r.fbclid), withG = c(r => r.gclid)
    const matched = c(r => r.session_id || r.click_id), withUtm = c(r => r.utm_source || r.utm_campaign)
    const withPhone = c(r => r.customer_phone), withProduct = c(r => r.produto)
    const failed = paid.filter(r => delivery(r).tone === 'bad').length
    // Saúde: média ponderada dos sinais que mais pesam na otimização
    const health = n ? (pct(matched, n) * 0.3 + pct(Math.max(withTt, withFb), n) * 0.3 + pct(sent, Math.max(withTt, 1)) * 0.25 + pct(withPhone, n) * 0.15) : 0
    const lat = paid.filter(r => r.tiktok_event_sent_at).map(r => (new Date(r.tiktok_event_sent_at!).getTime() - new Date(r.created_at).getTime()) / 1000).filter(x => x >= 0)
    const avgLat = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null
    return { paid, n, sent, withTt, withFb, withG, matched, withUtm, withPhone, withProduct, failed, health, avgLat }
  }, [rows])

  const fmtLat = (sec: number | null) => sec == null ? '—' : sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${(sec / 3600).toFixed(1)} h`

  return (
    <div className="shell-page">
      <PageHeader title="Signal Center" sub={`Qualidade dos eventos enviados às plataformas · ${PERIOD_LABEL[period].toLowerCase()}`}
        right={<><PeriodSegment value={period} onChange={setPeriod} /><RefreshBtn spinning={refreshing} onClick={() => { setRefreshing(true); load() }} /></>} />

      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <KpiCard icon={ShieldCheck} label="Vendas pagas" value={num(s.n)} foot={brl(s.paid.reduce((a, r) => a + r.valor, 0))} progress={1} loading={loading} />
        <KpiCard icon={Send} label="Entregues ao TikTok" value={fmtPct(pct(s.sent, s.withTt))} foot={`${num(s.sent)} de ${num(s.withTt)} com ttclid`} progress={pct(s.sent, s.withTt) / 100} loading={loading} />
        <KpiCard icon={Link2} label="Casadas com sessão" value={fmtPct(pct(s.matched, s.n))} foot="session_id ou click_id" progress={pct(s.matched, s.n) / 100} loading={loading} />
        <KpiCard icon={RefreshCcw} label="Latência de envio" value={fmtLat(s.avgLat)} foot={s.failed ? `${s.failed} falha${s.failed === 1 ? '' : 's'}` : 'sem falhas'} progress={s.avgLat == null ? 0 : Math.max(0.05, 1 - Math.min(1, s.avgLat / 3600))} loading={loading} />
      </div>

      <div className="hk-logs" style={{ marginBottom: 12 }}>
        <Panel>
          <PanelHead title="Saúde do sinal" sub="Match + click IDs + entrega + dados do cliente" />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Gauge value={Math.round(s.health)} ratio={s.health / 100} label="de 100" />
            <StatusPill tone={s.health >= 75 ? 'good' : s.health >= 45 ? 'warn' : s.n ? 'bad' : 'neutral'}>
              {!s.n ? 'Sem vendas no período' : s.health >= 75 ? 'Sinal forte' : s.health >= 45 ? 'Sinal razoável' : 'Sinal fraco'}
            </StatusPill>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Cobertura de identificadores" sub="% das vendas pagas que carregam cada sinal" />
          <div style={{ padding: '6px 18px 16px' }}>
            {[['ttclid (TikTok)', s.withTt], ['fbclid (Meta)', s.withFb], ['gclid (Google)', s.withG], ['UTM', s.withUtm], ['session_id / click_id', s.matched]].map(([l, v]) => (
              <BarRow key={l as string} label={l as string} value={fmtPct(pct(v as number, s.n))} right={`${num(v as number)} vendas`} ratio={pct(v as number, s.n) / 100} />
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Dados do cliente" sub="Campos que melhoram o match na plataforma" />
          <div style={{ padding: '6px 18px 16px' }}>
            {[['Telefone', s.withPhone], ['Produto', s.withProduct], ['Nome', s.paid.filter(r => r.customer_name).length]].map(([l, v]) => (
              <BarRow key={l as string} label={l as string} value={fmtPct(pct(v as number, s.n))} ratio={pct(v as number, s.n) / 100} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="hk-split">
        <Panel>
          <PanelHead title="Últimas entregas" sub="Purchase por venda paga" />
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="tt-table" style={{ minWidth: 720 }}>
              <thead><tr>{['Venda', 'Valor', 'Sinais', 'TikTok', 'Enviado em'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {s.paid.slice(0, 15).map(r => {
                  const d = delivery(r)
                  return (
                    <tr key={r.id}>
                      <td><div style={{ color: H.text, fontWeight: 600 }}>{r.customer_name || 'Cliente'}</div><div className="tt-mono" style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></td>
                      <td style={{ color: H.text }}>{brl(r.valor, 2)}</td>
                      <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {r.ttclid && <span className="tt-chip">ttclid</span>}{r.fbclid && <span className="tt-chip">fbclid</span>}{r.gclid && <span className="tt-chip">gclid</span>}
                        {(r.session_id || r.click_id) && <span className="tt-chip">sessão</span>}
                        {!r.ttclid && !r.fbclid && !r.gclid && !r.session_id && !r.click_id && <span style={{ color: H.muted, fontSize: 11 }}>nenhum</span>}
                      </div></td>
                      <td><StatusPill tone={d.tone}>{d.label}</StatusPill></td>
                      <td className="tt-mono" style={{ color: H.muted, fontSize: 11 }}>{r.tiktok_event_sent_at ? new Date(r.tiktok_event_sent_at).toLocaleTimeString('pt-BR') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && s.paid.length === 0 && <Empty pad={40}>Nenhuma venda paga no período.</Empty>}
        </Panel>
        <Panel>
          <PanelHead title="Pipeline de sinal" sub="O que já roda e o que vem a seguir" />
          <div style={{ padding: '8px 18px 14px' }}>
            {LAYERS.map(l => ({ ...l, on: l.on || (!!(l as any).dynamic && s.sent > 0) })).map(l => (
              <div key={l.title} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${H.lineSoft}` }}>
                <IconOrb icon={l.icon} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: H.text, fontWeight: 600, fontSize: 12.5 }}>{l.title}</div>
                  <div style={{ color: H.muted, fontSize: 11, marginTop: 2 }}>{l.desc}</div>
                </div>
                <StatusPill tone={l.on ? 'good' : 'neutral'}>{l.on ? 'Ativo' : 'Em breve'}</StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
