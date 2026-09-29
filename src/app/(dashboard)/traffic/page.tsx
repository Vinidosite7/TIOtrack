'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, ShieldCheck, Ban, Radar, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { TrafficShell } from '@/components/traffic/TrafficShell'
import { H, Panel, PanelHead, KpiCard, TrafficPulseCard, WorldMap, BarRow, Gauge, MeterRow, Empty, num, flag, countryName } from '@/components/hawk/ui'
import { HawkBars, SeriesLegend, type SeriesDef } from '@/components/hawk/charts'

type EventRow = {
  id: string; session_id: string | null; action: string; event_name: string; country: string | null; device_type: string | null
  utm_source: string | null; risk_score: number; reason: string | null; created_at: string
}
const SERIES: SeriesDef[] = [{ key: 'allow', label: 'Permitidos', tone: 'light' }, { key: 'deny', label: 'Negados', tone: 'dim' }]

export default function TrafficOverview() {
  const { active } = useWorkspaceStore()
  const [rows, setRows] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!active?.id) return
    const wid = active.id
    let mounted = true
    ;(async () => {
      setLoading(true)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase.from('traffic_events')
        .select('id,session_id,action,event_name,country,device_type,utm_source,risk_score,reason,created_at')
        .eq('workspace_id', wid).gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
      if (mounted) { setRows((data ?? []) as EventRow[]); setLoading(false) }
    })()
    const channel = supabase.channel(`traffic-overview-${wid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_events', filter: `workspace_id=eq.${wid}` }, (payload: any) => {
        setRows(prev => [payload.new as EventRow, ...prev].slice(0, 5000))
      }).subscribe()
    const t = setInterval(() => setTick(x => x + 1), 15000)
    return () => { mounted = false; clearInterval(t); supabase.removeChannel(channel) }
  }, [active?.id])

  const s = useMemo(() => {
    const now = Date.now()
    const allowed = rows.filter(r => r.action === 'allow').length
    const challenged = rows.filter(r => r.action === 'challenge').length
    const blocked = rows.filter(r => r.action === 'block' || r.action === 'redirect').length
    const sessions = new Set(rows.map(r => r.session_id).filter(Boolean)).size
    const activeNow = new Set(rows.filter(r => now - new Date(r.created_at).getTime() < 5 * 60 * 1000).map(r => r.session_id).filter(Boolean)).size
    const avgRisk = rows.length ? rows.reduce((a, r) => a + (r.risk_score || 0), 0) / rows.length : 0
    const pulse = Array.from({ length: 30 }, () => 0)
    const hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(now - (23 - i) * 3600 * 1000)
      return { label: `${String(d.getHours()).padStart(2, '0')}h`, allow: 0, deny: 0 }
    })
    const geo: Record<string, number> = {}, src: Record<string, number> = {}, dev: Record<string, number> = {}, reasons: Record<string, number> = {}
    for (const r of rows) {
      const age = now - new Date(r.created_at).getTime()
      const m = Math.floor(age / 60000); if (m >= 0 && m < 30) pulse[29 - m]++
      const h = Math.floor(age / 3600000); if (h >= 0 && h < 24) hours[23 - h][r.action === 'allow' ? 'allow' : 'deny']++
      if (r.country) geo[r.country] = (geo[r.country] || 0) + 1
      const so = (r.utm_source || 'direto').toLowerCase(); src[so] = (src[so] || 0) + 1
      const dv = r.device_type || 'desconhecido'; dev[dv] = (dev[dv] || 0) + 1
      if (r.action !== 'allow') { const k = r.reason || 'Sem motivo registrado'; reasons[k] = (reasons[k] || 0) + 1 }
    }
    const sort = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])
    return { allowed, challenged, blocked, sessions, activeNow, avgRisk, pulse, hours, geo, src: sort(src), dev: sort(dev), reasons: sort(reasons), countries: sort(geo) }
  }, [rows])

  const total = rows.length
  return (
    <TrafficShell title="Visão geral do tráfego" subtitle="Últimas 24h · atualiza em tempo real">
      <div className="hk-kpis" style={{ marginBottom: 12 }}>
        <TrafficPulseCard active={s.activeNow} bars={s.pulse} href="/traffic/live" loading={loading} />
        <KpiCard icon={Activity} label="Requisições 24h" value={num(total)} foot={`${num(s.sessions)} sessões únicas`} progress={1} loading={loading} />
        <KpiCard icon={ShieldCheck} label="Permitidos" value={num(s.allowed)} foot={`${total ? ((s.allowed / total) * 100).toFixed(1).replace('.', ',') : 0}% do total`} progress={total ? s.allowed / total : 0} loading={loading} />
        <KpiCard icon={Ban} label="Bloqueados" value={num(s.blocked)} foot="block + redirect" progress={total ? s.blocked / total : 0} loading={loading} />
        <KpiCard icon={Radar} label="Desafiados" value={num(s.challenged)} foot="challenge" progress={total ? s.challenged / total : 0} loading={loading} />
        <KpiCard icon={Users} label="Risco médio" value={`${Math.round(s.avgRisk)}/100`} foot="score do coletor" progress={s.avgRisk / 100} loading={loading} />
      </div>

      <div className="hk-row2" style={{ marginBottom: 12 }}>
        <Panel>
          <PanelHead title="Requisições por hora" sub="Permitidos x negados · 24h" right={<SeriesLegend series={SERIES} hidden={hidden} onToggle={k => setHidden(h => ({ ...h, [k]: !h[k] }))} />} />
          <div style={{ padding: '14px 10px 10px 0' }}><HawkBars data={s.hours} series={SERIES} hidden={hidden} money={false} height={290} empty="Sem requisições nas últimas 24h." /></div>
        </Panel>
        <Panel>
          <div className="hk-geo" style={{ padding: '16px 18px', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="tt-h">Tráfego por país</h2>
              <div className="tt-cap" style={{ marginTop: 3 }}>{s.countries.length} países</div>
              <div style={{ marginTop: 10 }}>
                {s.countries.length === 0 && <Empty pad={30}>Sem tráfego ainda.</Empty>}
                {s.countries.slice(0, 5).map(([cc, v]) => <BarRow key={cc} label={`${flag(cc)} ${countryName(cc)}`} value={num(v)} right={`${((v / total) * 100).toFixed(0)}%`} ratio={v / (s.countries[0]?.[1] || 1)} />)}
              </div>
            </div>
            <div className="tt-inset" style={{ padding: 4, minWidth: 0 }}>
              {s.countries.length ? <WorldMap counts={s.geo} height={250} /> : <Empty pad={100}>—</Empty>}
            </div>
          </div>
        </Panel>
      </div>

      <div className="hk-logs">
        <Panel>
          <PanelHead title="Decisão do rule engine" sub="Saída do filtro nas últimas 24h" />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Gauge value={total} ratio={total ? s.allowed / total : 0} label="requisições" />
            <div style={{ width: '100%', marginTop: 6 }}>
              <MeterRow label="Permitidos" value={s.allowed} total={total} />
              <MeterRow label="Desafiados" value={s.challenged} total={total} />
              <MeterRow label="Bloqueados" value={s.blocked} total={total} />
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Principais motivos de bloqueio" sub="Por que o tráfego foi negado" />
          <div style={{ padding: '6px 18px 16px' }}>
            {s.reasons.length === 0 && <Empty pad={40}>Nenhum acesso negado.</Empty>}
            {s.reasons.slice(0, 6).map(([k, v]) => <BarRow key={k} label={k} value={num(v)} right={`${(((v) / Math.max(1, s.blocked + s.challenged)) * 100).toFixed(0)}%`} ratio={v / (s.reasons[0]?.[1] || 1)} />)}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Origem e dispositivo" sub="utm_source · device" />
          <div style={{ padding: '6px 18px 16px' }}>
            {s.src.slice(0, 4).map(([k, v]) => <BarRow key={k} label={<span style={{ textTransform: 'capitalize' }}>{k}</span>} value={num(v)} right={`${((v / Math.max(total, 1)) * 100).toFixed(0)}%`} ratio={v / (s.src[0]?.[1] || 1)} />)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 12 }}>
              {s.dev.slice(0, 3).map(([k, v]) => (
                <div key={k} className="tt-inset" style={{ padding: '10px 12px' }}>
                  <div style={{ color: H.muted, fontSize: 11, textTransform: 'capitalize' }}>{k}</div>
                  <div className="tt-num" style={{ fontSize: 17, marginTop: 4 }}>{num(v)}</div>
                </div>
              ))}
            </div>
            {total === 0 && <Empty pad={30}>Sem dados.</Empty>}
          </div>
        </Panel>
      </div>
    </TrafficShell>
  )
}
