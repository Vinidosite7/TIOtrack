'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, Gauge as GaugeIcon, Server, Braces, Network } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { TrafficShell } from '@/components/traffic/TrafficShell'
import { H, Panel, PanelHead, IconOrb, StatusPill, BarRow, Empty, MiniStat, num } from '@/components/hawk/ui'

const LAYERS: { title: string; desc: string; icon: any; status: 'on' | 'soon' }[] = [
  { title: 'User-Agent / clientes HTTP', desc: 'Detecta automações óbvias: curl, wget, python-requests e navegadores headless.', icon: Bot, status: 'on' },
  { title: 'Score de risco', desc: 'Combina os sinais e decide entre permitir, desafiar e bloquear.', icon: GaugeIcon, status: 'on' },
  { title: 'ASN / datacenter', desc: 'Reputação de ASN e detecção de infraestrutura cloud.', icon: Server, status: 'soon' },
  { title: 'Rate limiting', desc: 'Barra rajadas anormais por IP, sessão ou rota.', icon: Network, status: 'soon' },
  { title: 'Challenge no navegador', desc: 'Verificação (ex.: Turnstile) para risco moderado antes do bloqueio.', icon: Braces, status: 'soon' },
]

export default function Security() {
  const { active } = useWorkspaceStore()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!active?.id) return
    ;(async () => {
      setLoading(true)
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { data } = await supabase.from('traffic_events').select('action,reason,risk_score,user_agent,ip').eq('workspace_id', active.id).gte('created_at', since).limit(10000)
      setRows(data || []); setLoading(false)
    })()
  }, [active?.id])

  const s = useMemo(() => {
    const denied = rows.filter(r => r.action !== 'allow')
    const count = (list: any[], f: (r: any) => string | null) => {
      const m: Record<string, number> = {}
      for (const r of list) { const k = f(r); if (k) m[k] = (m[k] || 0) + 1 }
      return Object.entries(m).sort((a, b) => b[1] - a[1])
    }
    const buckets = [0, 0, 0, 0, 0]
    for (const r of rows) buckets[Math.min(4, Math.floor((r.risk_score || 0) / 20))]++
    return {
      denied: denied.length, highRisk: rows.filter(r => (r.risk_score || 0) >= 75).length,
      reasons: count(denied, r => r.reason || 'Sem motivo registrado'),
      ips: count(denied, r => r.ip),
      buckets,
    }
  }, [rows])

  const maxB = Math.max(1, ...s.buckets)
  return (
    <TrafficShell title="Segurança" subtitle="Camadas de proteção e o que elas pegaram nos últimos 7 dias">
      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <MiniStat label="Requisições (7d)" value={loading ? '—' : num(rows.length)} />
        <MiniStat label="Negadas (7d)" value={loading ? '—' : num(s.denied)} tone={s.denied ? 'bad' : undefined} />
        <MiniStat label="Risco ≥ 75" value={loading ? '—' : num(s.highRisk)} tone={s.highRisk ? 'warn' : undefined} />
        <MiniStat label="IPs negados únicos" value={loading ? '—' : num(s.ips.length)} />
      </div>

      <div className="hk-logs" style={{ marginBottom: 12 }}>
        <Panel>
          <PanelHead title="Distribuição de risco" sub="Quantas requisições em cada faixa" />
          <div style={{ padding: 18, display: 'flex', alignItems: 'flex-end', gap: 10, height: 210 }}>
            {s.buckets.map((v, i) => (
              <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                <span className="tt-mono" style={{ fontSize: 10.5, color: H.sub }}>{num(v)}</span>
                <div style={{ width: '70%', height: `${Math.max(3, (v / maxB) * 100)}%`, borderRadius: '5px 5px 1px 1px', background: i >= 3 ? `linear-gradient(180deg, ${H.red}, rgba(240,137,155,.35))` : i === 2 ? `linear-gradient(180deg, ${H.amber}, rgba(232,194,127,.3))` : 'linear-gradient(180deg,#f2f3ff,#7e84dc)' }} />
                <span style={{ fontSize: 10.5, color: H.muted }}>{i * 20}–{i * 20 + 19 + (i === 4 ? 1 : 0)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Motivos de bloqueio" sub="Top 6" />
          <div style={{ padding: '6px 18px 16px' }}>
            {s.reasons.length === 0 && <Empty pad={40}>Nada bloqueado no período.</Empty>}
            {s.reasons.slice(0, 6).map(([k, v]) => <BarRow key={k} label={k} value={num(v)} ratio={v / (s.reasons[0]?.[1] || 1)} />)}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="IPs mais negados" sub="Candidatos a bloqueio permanente" />
          <div style={{ padding: '6px 18px 16px' }}>
            {s.ips.length === 0 && <Empty pad={40}>Nenhum IP negado.</Empty>}
            {s.ips.slice(0, 6).map(([k, v]) => <BarRow key={k} label={<span className="tt-mono">{k}</span>} value={num(v)} ratio={v / (s.ips[0]?.[1] || 1)} />)}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead title="Camadas de proteção" sub="O que já roda no coletor e o que vem na próxima etapa (Edge/Cloudflare)" />
        <div className="tt-grid-fluid" style={{ padding: 18, gap: 12 }}>
          {LAYERS.map(l => (
            <div key={l.title} className="tt-inset" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconOrb icon={l.icon} size={32} />
                <StatusPill tone={l.status === 'on' ? 'good' : 'neutral'}>{l.status === 'on' ? 'Ativo' : 'Em breve'}</StatusPill>
              </div>
              <div style={{ color: H.text, fontWeight: 700, fontSize: 13 }}>{l.title}</div>
              <div style={{ color: H.muted, fontSize: 12, lineHeight: 1.55 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </Panel>
    </TrafficShell>
  )
}
