'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Download, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { TrafficShell } from '@/components/traffic/TrafficShell'
import { H, Panel, StatusPill, Pager, Empty, num, flag } from '@/components/hawk/ui'

const ACTION: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  allow: { label: 'Permitido', tone: 'good' }, challenge: { label: 'Desafiado', tone: 'warn' }, block: { label: 'Bloqueado', tone: 'bad' }, redirect: { label: 'Redirecionado', tone: 'bad' },
}
const PER = 30
const fmt = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function Logs() {
  const { active } = useWorkspaceStore()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [action, setAction] = useState('todas')
  const [country, setCountry] = useState('todos')
  const [open, setOpen] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!active?.id) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('traffic_events').select('*').eq('workspace_id', active.id).order('created_at', { ascending: false }).limit(1000)
      setRows(data || []); setLoading(false)
    })()
  }, [active?.id])
  useEffect(() => { setPage(0) }, [q, action, country])

  const countries = useMemo(() => Array.from(new Set(rows.map(r => r.country).filter(Boolean))).sort() as string[], [rows])
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return rows.filter(r =>
      (action === 'todas' || r.action === action) &&
      (country === 'todos' || r.country === country) &&
      (!qq || [r.request_id, r.session_id, r.click_id, r.ip, r.path, r.user_agent, r.utm_source, r.utm_campaign, r.utm_content, r.reason].some(v => v && String(v).toLowerCase().includes(qq))))
  }, [rows, q, action, country])

  function exportCSV() {
    const cols = ['created_at', 'action', 'reason', 'risk_score', 'country', 'ip', 'device_type', 'os', 'browser', 'path', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'session_id', 'click_id', 'request_id', 'user_agent']
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const blob = new Blob(['﻿' + [cols.join(';'), ...filtered.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'traffic-logs.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <TrafficShell title="Explorador de logs" subtitle="Últimos 1.000 eventos · clique numa linha para ver o request completo"
      action={<button className="tt-btn" onClick={exportCSV}><Download size={14} /> Exportar CSV</button>}>
      <Panel>
        <div style={{ display: 'flex', gap: 8, padding: '14px 18px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: 12, color: H.muted }} />
            <input className="tt-input" style={{ paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar IP, session, click_id, página, UTM ou user-agent..." />
          </div>
          <select className="tt-select" style={{ width: 170 }} value={action} onChange={e => setAction(e.target.value)}>
            <option value="todas">Todas as decisões</option>
            {Object.entries(ACTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="tt-select" style={{ width: 160 }} value={country} onChange={e => setCountry(e.target.value)}>
            <option value="todos">Todos os países</option>
            {countries.map(c => <option key={c} value={c}>{flag(c)} {c}</option>)}
          </select>
        </div>
        <div style={{ height: 1, background: H.line }} />
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table" style={{ minWidth: 980 }}>
            <thead><tr><th style={{ width: 28 }} />{['Data', 'Decisão', 'País / IP', 'Dispositivo', 'Domínio / página', 'Origem', 'Risco'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.slice(page * PER, page * PER + PER).map(r => {
                const isOpen = open === r.id
                const meta = r.metadata || {}
                return (
                  <Fragment key={r.id}>
                    <tr onClick={() => setOpen(isOpen ? null : r.id)} style={{ cursor: 'pointer', background: isOpen ? 'rgba(163,167,242,.05)' : undefined }}>
                      <td style={{ paddingRight: 0, color: H.muted }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td className="tt-mono" style={{ color: H.muted, fontSize: 11.5, whiteSpace: 'nowrap' }}>{fmt(r.created_at)}</td>
                      <td><StatusPill tone={ACTION[r.action]?.tone || 'neutral'}>{ACTION[r.action]?.label || r.action}</StatusPill></td>
                      <td style={{ whiteSpace: 'nowrap' }}><span style={{ color: H.text }}>{flag(r.country)} {r.country || '—'}</span> <span className="tt-mono" style={{ color: H.muted, fontSize: 11 }}>{r.ip || ''}</span></td>
                      <td style={{ color: H.sub, fontSize: 12 }}>{[r.device_type, r.os].filter(Boolean).join(' · ') || '—'}</td>
                      <td style={{ maxWidth: 250 }}><div style={{ color: H.text, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.hostname || '—'}</div><div className="tt-mono" style={{ color: H.muted, fontSize: 10.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path || '/'}{meta.route_name ? ` · ${meta.route_name}` : ''}</div></td>
                      <td>{r.utm_source ? <span className="tt-chip">{r.utm_source}</span> : <span style={{ color: H.muted }}>direto</span>}</td>
                      <td className="tt-mono" style={{ color: (r.risk_score ?? 0) >= 75 ? H.red : (r.risk_score ?? 0) >= 40 ? H.amber : H.sub }}>{r.risk_score ?? 0}</td>
                    </tr>
                    {isOpen && (
                      <tr><td colSpan={8} style={{ background: 'rgba(9,11,22,.35)', padding: '14px 18px 16px 46px' }}>
                        {r.reason && <div style={{ color: H.text, fontSize: 12.5, marginBottom: 10 }}>Motivo: <span style={{ color: H.sub }}>{r.reason}</span></div>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px 20px' }}>
                          {[['request_id', r.request_id], ['session_id', r.session_id], ['visitor_id', r.visitor_id], ['click_id', r.click_id], ['ttclid', r.ttclid], ['fbclid', r.fbclid], ['gclid', r.gclid],
                            ['hostname', meta.hostname], ['domain_id', meta.domain_id], ['route', meta.route_name], ['route_id', meta.route_id], ['rule', meta.rule_name], ['rule_source', meta.rule_source], ['colo', meta.colo],
                            ['utm_medium', r.utm_medium], ['utm_campaign', r.utm_campaign], ['utm_content', r.utm_content], ['utm_term', r.utm_term],
                            ['cidade', [r.city, r.region].filter(Boolean).join(', ')], ['asn', r.asn], ['idioma', r.language], ['browser', r.browser], ['referer', r.referer], ['landing_url', r.landing_url]]
                            .filter(([, v]) => v).map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}
                        </div>
                        {r.user_agent && <div style={{ marginTop: 10 }}><KV k="user_agent" v={r.user_agent} /></div>}
                      </td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <Empty pad={40}>Nenhum evento encontrado.</Empty>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px' }}>
          <span className="tt-cap">{num(filtered.length)} eventos</span>
          <Pager page={page} pages={Math.max(1, Math.ceil(filtered.length / PER))} onChange={setPage} />
        </div>
      </Panel>
    </TrafficShell>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: H.muted, fontSize: 10.5 }}>{k}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span className="tt-mono" style={{ color: H.sub, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v}>{v}</span>
        <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(v) }} aria-label={`Copiar ${k}`} style={{ color: H.muted, flexShrink: 0 }}><Copy size={11} /></button>
      </div>
    </div>
  )
}
