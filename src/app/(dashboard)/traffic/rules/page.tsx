'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, CheckCircle2, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { evaluateTraffic, type TrafficRule } from '@/lib/traffic/rule-engine'
import { TrafficShell } from '@/components/traffic/TrafficShell'
import { H, Panel, PanelHead, StatusPill, Toggle, flag, countryName } from '@/components/hawk/ui'

const QUICK_COUNTRIES = ['BR', 'US', 'PT', 'MX', 'AR', 'CO', 'CL', 'ES']
const devices = [['mobile', 'Mobile'], ['desktop', 'Desktop'], ['tablet', 'Tablet']]
const osList = [['ios', 'iOS'], ['android', 'Android'], ['windows', 'Windows'], ['macos', 'macOS']]
const DENY: Record<string, string> = { block: 'Bloquear', challenge: 'Desafiar', redirect: 'Redirecionar' }
const ACTION: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  allow: { label: 'Permitido', tone: 'good' }, challenge: { label: 'Desafiado', tone: 'warn' }, block: { label: 'Bloqueado', tone: 'bad' }, redirect: { label: 'Redirecionado', tone: 'bad' },
}

const baseRule: TrafficRule & { name: string } = {
  name: 'Oferta Brasil Mobile',
  enabled: true,
  allowed_countries: ['BR'],
  allowed_devices: ['mobile'],
  allowed_os: ['ios', 'android'],
  blocked_user_agents: ['curl', 'wget', 'python-requests', 'go-http-client', 'headlesschrome'],
  challenge_risk_threshold: 40,
  block_risk_threshold: 75,
  default_action: 'allow',
  deny_action: 'block',
  redirect_url: null,
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      color: on ? '#11142a' : H.sub, background: on ? 'linear-gradient(180deg,#c3c6fa,#999eee)' : 'rgba(9,11,22,.5)', border: `1px solid ${on ? 'rgba(220,222,253,.4)' : H.line}`, transition: '.15s ease',
    }}>{children}</button>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: `1px solid ${H.lineSoft}` }}>
      <div style={{ color: H.text, fontWeight: 700, fontSize: 13 }}>{title}</div>
      {sub && <div style={{ color: H.muted, fontSize: 11.5, marginTop: 3 }}>{sub}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

export default function TrafficRulesPage() {
  const { active } = useWorkspaceStore()
  const [rule, setRule] = useState<any>(baseRule)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [dirty, setDirty] = useState(false)
  const [newCC, setNewCC] = useState('')

  useEffect(() => {
    if (!active?.id) return
    ;(async () => {
      const { data } = await supabase.from('traffic_rules').select('*').eq('workspace_id', active.id).limit(1).maybeSingle()
      if (data) setRule({ ...baseRule, ...data })
      setDirty(false)
    })()
  }, [active?.id])

  const update = (patch: any) => { setRule((r: any) => ({ ...r, ...patch })); setDirty(true) }

  async function saveRule() {
    if (!active?.id) return
    setSaving(true); setErr('')
    try {
      const response = await fetch('/api/traffic/rules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: active.id, rule }),
      })
      const data = await response.json()
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Não foi possível salvar a regra')
      if (data.rule) setRule((current: any) => ({ ...current, ...data.rule }))
      setSavedAt(new Date().toLocaleTimeString('pt-BR'))
      setDirty(false)
      if (data.edge?.status === 'error') setErr(`Regra salva, mas o Edge não sincronizou: ${data.edge.error || 'erro desconhecido'}`)
      else if (data.edge?.status === 'not_configured') setErr('Regra salva no Tiotrack. Cloudflare KV ainda não está configurado no servidor.')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Erro ao salvar a regra')
    } finally {
      setSaving(false)
    }
  }

  function toggleList(key: 'allowed_countries' | 'allowed_devices' | 'allowed_os', value: string) {
    const list = new Set<string>(rule[key] || [])
    list.has(value) ? list.delete(value) : list.add(value)
    update({ [key]: Array.from(list) })
  }

  const countryOpts = Array.from(new Set([...QUICK_COUNTRIES, ...(rule.allowed_countries || [])]))

  const simulations = useMemo(() => {
    const cases = [
      { label: 'Brasil · iPhone Safari', country: 'BR', deviceType: 'mobile', os: 'ios', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', hasJavascript: true, hasSession: true },
      { label: 'Brasil · Android Chrome', country: 'BR', deviceType: 'mobile', os: 'android', userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36', hasJavascript: true, hasSession: true },
      { label: 'Brasil · Desktop Chrome', country: 'BR', deviceType: 'desktop', os: 'windows', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', hasJavascript: true, hasSession: true },
      { label: 'Estados Unidos · iPhone', country: 'US', deviceType: 'mobile', os: 'ios', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', hasJavascript: true, hasSession: true },
      { label: 'Brasil · cliente HTTP', country: 'BR', deviceType: 'mobile', os: 'android', userAgent: 'python-requests/2.31', hasJavascript: false, hasSession: false },
    ]
    return cases.map(entry => ({ ...entry, result: evaluateTraffic(rule, entry) }))
  }, [rule])

  return (
    <TrafficShell title="Regras de tráfego" subtitle="Defina quem pode acessar e teste a decisão antes de salvar"
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {err ? <span style={{ color: H.red, fontSize: 12 }}>{err}</span>
            : dirty ? <span className="tt-cap">alterações não salvas</span>
            : savedAt && <span className="tt-badge"><CheckCircle2 size={12} color={H.green} /> salvo às {savedAt}</span>}
          <button className="tt-btn tt-btn-primary" onClick={saveRule} disabled={saving}><Save size={14} /> {saving ? 'Salvando...' : 'Salvar regra'}</button>
        </div>
      }>
      <div className="hk-split">
        <Panel>
          <div style={{ padding: '4px 18px 8px' }}>
            <Section title="Regra">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input className="tt-input" value={rule.name} onChange={e => update({ name: e.target.value })} placeholder="Ex.: Oferta Brasil Mobile" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Toggle on={!!rule.enabled} onChange={v => update({ enabled: v })} label="Regra ativa" />
                  <span style={{ fontSize: 12, color: rule.enabled ? H.green : H.muted, fontWeight: 600, width: 50 }}>{rule.enabled ? 'Ativa' : 'Pausada'}</span>
                </div>
              </div>
            </Section>

            <Section title="Países permitidos" sub="Nenhum selecionado = todos os países">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {countryOpts.map(cc => <Chip key={cc} on={rule.allowed_countries?.includes(cc)} onClick={() => toggleList('allowed_countries', cc)}>{flag(cc)} {countryName(cc)}</Chip>)}
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  <input className="tt-input" style={{ width: 70, minHeight: 30, padding: '4px 8px', textTransform: 'uppercase' }} maxLength={2} value={newCC} onChange={e => setNewCC(e.target.value.replace(/[^a-z]/gi, ''))} placeholder="CC"
                    onKeyDown={e => { if (e.key === 'Enter' && newCC.length === 2) { toggleList('allowed_countries', newCC.toUpperCase()); setNewCC('') } }} />
                  <button className="tt-icon-btn" style={{ width: 30, height: 30 }} aria-label="Adicionar país" onClick={() => { if (newCC.length === 2) { toggleList('allowed_countries', newCC.toUpperCase()); setNewCC('') } }}><Plus size={13} /></button>
                </div>
              </div>
            </Section>

            <Section title="Dispositivos">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{devices.map(([k, l]) => <Chip key={k} on={rule.allowed_devices?.includes(k)} onClick={() => toggleList('allowed_devices', k)}>{l}</Chip>)}</div>
            </Section>

            <Section title="Sistemas operacionais" sub="Nenhum selecionado = todos">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{osList.map(([k, l]) => <Chip key={k} on={rule.allowed_os?.includes(k)} onClick={() => toggleList('allowed_os', k)}>{l}</Chip>)}</div>
            </Section>

            <Section title="Limites de risco" sub="Score 0–100 calculado pelo coletor">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {([['challenge_risk_threshold', 'Desafiar a partir de', H.amber], ['block_risk_threshold', 'Bloquear a partir de', H.red]] as const).map(([key, label, color]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: H.sub, marginBottom: 8 }}><span>{label}</span><b className="tt-mono" style={{ color }}>{rule[key]}</b></div>
                    <input type="range" min={0} max={100} value={rule[key]} onChange={e => update({ [key]: Number(e.target.value) })} style={{ width: '100%', accentColor: '#a3a7f2' }} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="User-agents bloqueados" sub="Enter para adicionar">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(rule.blocked_user_agents || []).map((ua: string) => (
                  <span key={ua} className="tt-chip" style={{ height: 26, gap: 6 }}>{ua}<button aria-label={`Remover ${ua}`} onClick={() => update({ blocked_user_agents: rule.blocked_user_agents.filter((x: string) => x !== ua) })} style={{ color: H.muted, display: 'inline-flex' }}><X size={11} /></button></span>
                ))}
                <input className="tt-input" style={{ width: 170, minHeight: 26, padding: '3px 8px', fontSize: 12 }} placeholder="adicionar..."
                  onKeyDown={e => { const v = (e.target as HTMLInputElement).value.trim(); if (e.key === 'Enter' && v) { update({ blocked_user_agents: Array.from(new Set([...(rule.blocked_user_agents || []), v])) }); (e.target as HTMLInputElement).value = '' } }} />
              </div>
            </Section>

            <Section title="Quando não passar na regra">
              <div className="tt-segment">{Object.entries(DENY).map(([k, l]) => <button key={k} data-active={rule.deny_action === k} onClick={() => update({ deny_action: k })}>{l}</button>)}</div>
              {rule.deny_action === 'redirect' && <input className="tt-input" style={{ marginTop: 10 }} placeholder="https://dominio.com/indisponivel" value={rule.redirect_url || ''} onChange={e => update({ redirect_url: e.target.value || null })} />}
            </Section>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel>
            <PanelHead title="Simulação" sub="Como a regra atual decide cada caso" dot />
            <div style={{ padding: '8px 18px 14px' }}>
              {simulations.map(item => (
                <div key={item.label} style={{ padding: '10px 0', borderBottom: `1px solid ${H.lineSoft}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: H.text, fontSize: 12.5, fontWeight: 600 }}>{item.label}</span>
                    <StatusPill tone={ACTION[item.result.action]?.tone || 'neutral'}>{ACTION[item.result.action]?.label || item.result.action}</StatusPill>
                  </div>
                  <div style={{ color: H.muted, fontSize: 11, marginTop: 4 }}>risco {item.result.riskScore}/100 · {item.result.reason || 'ok'}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHead title="Resumo" />
            <div style={{ padding: '8px 18px 14px' }}>
              {[
                ['Países', rule.allowed_countries?.length ? rule.allowed_countries.join(', ') : 'todos'],
                ['Dispositivos', rule.allowed_devices?.length ? rule.allowed_devices.join(', ') : 'todos'],
                ['Sistemas', rule.allowed_os?.length ? rule.allowed_os.join(', ') : 'todos'],
                ['Se negar', DENY[rule.deny_action] || rule.deny_action],
                ['Limites', `desafio ${rule.challenge_risk_threshold} · bloqueio ${rule.block_risk_threshold}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${H.lineSoft}`, fontSize: 12.5 }}>
                  <span style={{ color: H.muted }}>{k}</span><span style={{ color: H.text, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </TrafficShell>
  )
}
