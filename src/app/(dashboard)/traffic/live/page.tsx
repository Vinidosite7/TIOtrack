'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Smartphone, Monitor, Tablet, HelpCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { TrafficShell } from '@/components/traffic/TrafficShell'
import { H, Panel, PanelHead, StatusPill, Empty, MiniStat, num, flag, countryName, timeHMS } from '@/components/hawk/ui'

type Filter = 'todos' | 'allow' | 'deny'
const ACTION: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  allow: { label: 'Permitido', tone: 'good' }, challenge: { label: 'Desafiado', tone: 'warn' }, block: { label: 'Bloqueado', tone: 'bad' }, redirect: { label: 'Redirecionado', tone: 'bad' },
}
const DEVICE: Record<string, any> = { mobile: Smartphone, desktop: Monitor, tablet: Tablet }

export default function LivePage() {
  const { active } = useWorkspaceStore()
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('todos')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const buffer = useRef<any[]>([])
  const [buffered, setBuffered] = useState(0)
  const [, setTick] = useState(0)

  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => {
    if (!active?.id) return
    const wid = active.id
    ;(async () => {
      const { data } = await supabase.from('traffic_events').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(200)
      setRows(data || [])
    })()
    const channel = supabase.channel(`traffic-live-${wid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_events', filter: `workspace_id=eq.${wid}` }, (payload: any) => {
        if (pausedRef.current) { buffer.current.unshift(payload.new); setBuffered(buffer.current.length); return }
        setRows(prev => [payload.new, ...prev].slice(0, 300))
      }).subscribe()
    const t = setInterval(() => setTick(x => x + 1), 10000)
    return () => { clearInterval(t); supabase.removeChannel(channel) }
  }, [active?.id])

  function togglePause() {
    if (paused && buffer.current.length) { const b = buffer.current; buffer.current = []; setBuffered(0); setRows(prev => [...b, ...prev].slice(0, 300)) }
    setPaused(p => !p)
  }

  const stats = useMemo(() => {
    const now = Date.now()
    const lastMin = rows.filter(r => now - new Date(r.created_at).getTime() < 60000).length
    const last5 = rows.filter(r => now - new Date(r.created_at).getTime() < 300000)
    return { lastMin, activeNow: new Set(last5.map(r => r.session_id || r.ip || r.request_id).filter(Boolean)).size, denied5: last5.filter(r => r.action !== 'allow').length, total5: last5.length }
  }, [rows])

  const visible = rows.filter(r => filter === 'todos' || (filter === 'allow' ? r.action === 'allow' : r.action !== 'allow'))

  return (
    <TrafficShell title="Ao vivo" subtitle="Cada requisição que passa pelo coletor, em tempo real"
      action={<button className="tt-btn" onClick={togglePause}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? `Retomar${buffered ? ` (+${buffered})` : ''}` : 'Pausar'}</button>}>
      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <MiniStat label="Ativos agora (5 min)" value={num(stats.activeNow)} />
        <MiniStat label="Requisições no último minuto" value={num(stats.lastMin)} />
        <MiniStat label="Negados (5 min)" value={num(stats.denied5)} tone={stats.denied5 ? 'bad' : undefined} />
        <MiniStat label="Taxa de bloqueio (5 min)" value={`${stats.total5 ? Math.round((stats.denied5 / stats.total5) * 100) : 0}%`} />
      </div>

      <Panel>
        <PanelHead title="Feed de requisições" dot={!paused} sub={paused ? 'Pausado — novos eventos ficam em espera' : 'Ao vivo'}
          right={
            <div className="tt-segment">
              {([['todos', 'Todos'], ['allow', 'Permitidos'], ['deny', 'Negados']] as [Filter, string][]).map(([k, l]) => <button key={k} data-active={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
            </div>
          } />
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tt-table" style={{ minWidth: 900 }}>
            <thead><tr>{['Hora', 'País / IP', 'Dispositivo', 'Domínio / página', 'Risco', 'Decisão'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {visible.slice(0, 150).map(r => {
                const Dev = DEVICE[r.device_type] || HelpCircle
                const risk = r.risk_score ?? 0
                const meta = r.metadata || {}
                return (
                  <tr key={r.id} className="hk-row-in">
                    <td className="tt-mono" style={{ color: H.muted, fontSize: 11.5 }}>{timeHMS(r.created_at)}</td>
                    <td><div style={{ color: H.text, fontSize: 12.5 }} title={countryName(r.country)}>{flag(r.country)} {r.country || '—'}</div><div className="tt-mono" style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{r.ip || ''}</div></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: H.sub, fontSize: 12 }}><Dev size={13} />{[r.os, r.browser].filter(Boolean).join(' · ') || r.device_type || '—'}</span></td>
                    <td style={{ maxWidth: 360 }}>
                      <div style={{ color: H.text, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.hostname || '—'}</div>
                      <div className="tt-mono" style={{ color: H.muted, fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.path || '/'} <span style={{ color: H.muted }}>· {meta.route_name || r.event_name}</span></div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {r.action !== 'allow' && r.reason ? <span style={{ color: H.muted, fontSize: 11 }}>{r.reason}</span>
                          : [r.utm_source, r.utm_campaign, r.utm_content].filter(Boolean).map((u: string, i: number) => <span key={i} className="tt-chip">{u}</span>)}
                      </div>
                    </td>
                    <td style={{ width: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', overflow: 'hidden' }}>
                          <div style={{ width: `${risk}%`, height: '100%', background: risk >= 75 ? H.red : risk >= 40 ? H.amber : H.lav }} />
                        </div>
                        <span className="tt-mono" style={{ fontSize: 11, color: H.sub, minWidth: 22 }}>{risk}</span>
                      </div>
                    </td>
                    <td><StatusPill tone={ACTION[r.action]?.tone || 'neutral'}>{ACTION[r.action]?.label || r.action}</StatusPill></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <Empty pad={44}>Sem eventos por enquanto.</Empty>}
      </Panel>
    </TrafficShell>
  )
}
