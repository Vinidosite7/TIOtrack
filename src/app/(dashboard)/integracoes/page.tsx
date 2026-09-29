'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, AlertCircle, Wifi, ChevronDown,
  Activity, ShieldCheck, Clock3, Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { H, Panel, KpiCard, PageHeader, StatusPill, Empty } from '@/components/hawk/ui'
import { TikTokEventsApiCard } from '@/components/integrations/TikTokEventsApiCard'

// ── Tipos ──────────────────────────────────────────────────────
type AdvAccount = { id: string; advertiser_id: string; nome: string | null; balance: number | null; currency: string | null; status: string | null }
type BC = { id: string; apelido: string; bc_id: string; ativo: boolean; last_sync: string | null; sync_status: string | null; sync_error: string | null; advertiser_accounts: AdvAccount[] }
type MetaConn = { id: string; fb_user_id: string; fb_user_name: string; created_at: string }
type MetaAcc = { id: string; account_fb_id: string; account_id: string; nome: string; balance: number | null; currency: string; status: string; last_balance_sync: string | null }

// ── Helpers ────────────────────────────────────────────────────
function toBRL(v: number, cur?: string | null) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: cur === 'USD' ? 'USD' : 'BRL', maximumFractionDigits: 0 })
}
function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`; if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}

function TikTokLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
    </svg>
  )
}
function MetaLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>{label}{hint && <span style={{ color: H.muted }}> · {hint}</span>}</span>{children}</label>
}
function FInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input className="tt-input" type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
}
function FSecret({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input className="tt-input" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ paddingRight: 36 }} />
      <button onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar' : 'Mostrar'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: H.muted, display: 'flex' }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )
}
function TestResult({ state, msg }: { state: string; msg: string }) {
  if (!msg) return null
  const ok = state === 'ok'
  return <div className="tt-mono" style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, background: ok ? 'rgba(116,211,171,.07)' : 'rgba(240,137,155,.07)', border: `1px solid ${ok ? 'rgba(116,211,171,.2)' : 'rgba(240,137,155,.2)'}`, color: ok ? H.green : H.red }}>{ok ? <CheckCircle size={11} /> : <XCircle size={11} />}{msg}</div>
}

function AccountRow({ nome, id, balance, currency, status, warn }: { nome: string; id: string; balance: number | null; currency?: string | null; status: string; warn: boolean }) {
  const activeAcc = status === 'ACTIVE' || status === '1' || status === 'STATUS_ENABLE'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '10px minmax(0,1fr) auto auto', alignItems: 'center', gap: 10, padding: '9px 18px 9px 30px', borderBottom: `1px solid ${H.lineSoft}` }}>
      <span className="tt-status-dot" style={{ width: 6, height: 6, background: activeAcc ? H.green : H.muted }} />
      <span style={{ fontSize: 12.5, color: H.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome} <span className="tt-mono" style={{ fontSize: 10.5, color: H.muted }}>#{id.slice(-6)}</span></span>
      <span className="tt-num" style={{ fontSize: 13, color: warn ? H.amber : H.text }}>{balance !== null ? toBRL(balance, currency) : '—'}</span>
      {warn ? <span title="Saldo baixo"><AlertCircle size={12} color={H.amber} /></span> : <span style={{ width: 12 }} />}
    </div>
  )
}

function SourceCard({ logo, name, desc, status, statusLabel, stats, expanded, onExpand, actions, form, children }: {
  logo: React.ReactNode; name: string; desc: string; status: 'connected' | 'partial' | 'disconnected'; statusLabel: string
  stats?: { label: string; value: string; warn?: boolean }[]; expanded?: boolean; onExpand?: () => void; actions: React.ReactNode; form?: React.ReactNode; children?: React.ReactNode
}) {
  return (
    <Panel>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#f4f5ff', background: 'radial-gradient(circle at 35% 30%, rgba(220,222,253,.30), rgba(133,139,230,.45) 55%, rgba(75,80,130,.55))', border: '1px solid rgba(220,222,253,.2)' }}>{logo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="tt-h">{name}</span>
              <StatusPill tone={status === 'connected' ? 'good' : status === 'partial' ? 'warn' : 'neutral'}>{statusLabel}</StatusPill>
            </div>
            <p style={{ fontSize: 12, color: H.muted, marginTop: 4, lineHeight: 1.5 }}>{desc}</p>
          </div>
          {onExpand && <button className="tt-icon-btn" style={{ width: 30, height: 30 }} onClick={onExpand} aria-label="Expandir contas"><ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .16s' }} /></button>}
        </div>
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))`, gap: 8, marginTop: 14 }}>
            {stats.map(s => <div key={s.label} className="tt-inset" style={{ padding: '9px 12px' }}><div style={{ fontSize: 11, color: H.muted }}>{s.label}</div><div className="tt-num" style={{ fontSize: 15, marginTop: 3, color: s.warn ? H.amber : H.text }}>{s.value}</div></div>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>{actions}</div>
      </div>
      {form && <div style={{ borderTop: `1px solid ${H.lineSoft}`, padding: '14px 18px', background: 'rgba(9,11,22,.35)', display: 'grid', gap: 10 }}>{form}</div>}
      {children}
    </Panel>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function IntegracoesPage() {
  const { active: workspace } = useWorkspaceStore()
  

  const [bcs, setBcs]               = useState<BC[]>([])
  const [metaConns, setMetaConns]   = useState<MetaConn[]>([])
  const [metaAccs, setMetaAccs]     = useState<MetaAcc[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [syncingBc, setSyncingBc]   = useState<string | null>(null)
  const [syncingMeta, setSyncingMeta] = useState<string | null>(null)
  const [showTkForm, setShowTkForm] = useState(false)
  const [showMetaForm, setShowMetaForm] = useState(false)
  const [metaToken, setMetaToken] = useState('')
  const [metaApelido, setMetaApelido] = useState('')
  const [metaTestState, setMetaTestState] = useState<'idle'|'testing'|'ok'|'fail'>('idle')
  const [metaTestMsg, setMetaTestMsg] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [expandTk, setExpandTk]     = useState(true)
  const [expandMeta, setExpandMeta] = useState(true)
  const [testState, setTestState]   = useState<'idle'|'testing'|'ok'|'fail'>('idle')
  const [testMsg, setTestMsg]       = useState('')
  const [toast, setToast]           = useState<{type:'ok'|'err';msg:string}|null>(null)
  const [form, setForm]             = useState({ apelido: '', bc_id: '', access_token: '', proxy_url: '' })

  function showToast(type: 'ok'|'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }


  const load = useCallback(async (wid: string) => {
    setLoading(true)
    const [bcRes, mcRes, maRes] = await Promise.all([
      supabase.from('bc_configs').select(`id,apelido,bc_id,ativo,last_sync,sync_status,sync_error,advertiser_accounts(id,advertiser_id,nome,balance,currency,status,last_balance_sync)`).eq('workspace_id', wid).order('created_at'),
      (supabase as any).from('meta_connections').select('id,fb_user_id,fb_user_name,created_at').eq('workspace_id', wid),
      (supabase as any).from('meta_ad_accounts').select('id,account_fb_id,account_id,nome,balance,currency,status,last_balance_sync').eq('workspace_id', wid),
    ])
    setBcs((bcRes.data as BC[]) ?? [])
    setMetaConns(((mcRes as any).data as MetaConn[]) ?? [])
    setMetaAccs(((maRes as any).data as MetaAcc[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (workspace?.id) load(workspace.id) }, [workspace?.id])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('meta_success')) { showToast('ok', `Meta Ads conectado! ${p.get('accounts')} contas importadas.`); window.history.replaceState({}, '', '/integracoes'); if (workspace?.id) load(workspace.id) }
    if (p.get('meta_error'))   { showToast('err', p.get('meta_error') === 'cancelled' ? 'Conexão cancelada.' : 'Erro ao conectar com o Meta.'); window.history.replaceState({}, '', '/integracoes') }
  }, [])

  async function handleTestMeta() {
    if (!metaToken) { setMetaTestState('fail'); setMetaTestMsg('Cole o access token primeiro.'); return }
    setMetaTestState('testing')
    try {
      const res  = await fetch(`/api/meta/sync?token=${encodeURIComponent(metaToken)}`)
      const json = await res.json()
      if (json.ok) { setMetaTestState('ok'); setMetaTestMsg(`OK — ${json.user} · ${json.accounts} conta(s)`) }
      else          { setMetaTestState('fail'); setMetaTestMsg(json.message ?? 'Token inválido.') }
    } catch { setMetaTestState('fail'); setMetaTestMsg('Erro de rede.') }
  }

  async function handleSaveMeta() {
    if (!workspace?.id || !metaToken) { showToast('err', 'Cole o access token.'); return }
    setSavingMeta(true)
    const res  = await fetch('/api/meta/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace.id, access_token: metaToken, apelido: metaApelido || undefined }) })
    const json = await res.json()
    if (json.ok) {
      showToast('ok', `Meta conectado! ${json.accounts} contas importadas.`)
      setMetaToken(''); setMetaApelido(''); setMetaTestState('idle'); setShowMetaForm(false)
      await load(workspace.id)
    } else {
      showToast('err', json.message ?? json.error ?? 'Erro ao conectar.')
    }
    setSavingMeta(false)
  }

  function handleConnectMeta() {
    if (!workspace?.id) return
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1830454530968970'
    const redir = encodeURIComponent(`${window.location.origin}/api/meta/callback`)
    const scope = 'ads_read,ads_management,business_management,read_insights'
    window.location.href = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redir}&scope=${scope}&state=${workspace.id}&response_type=code&auth_type=rerequest`
  }

  async function handleTest() {
    if (!form.bc_id || !form.access_token) { setTestState('fail'); setTestMsg('Preencha BC ID e Token.'); return }
    setTestState('testing')
    try {
      const res  = await fetch('/api/tiktok/test-bc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bc_id: form.bc_id, access_token: form.access_token }) })
      const json = await res.json()
      json.ok ? (setTestState('ok'), setTestMsg(`OK — ${json.advertisers} advertiser(s)`)) : (setTestState('fail'), setTestMsg(json.message ?? 'Falha.'))
    } catch { setTestState('fail'); setTestMsg('Erro de rede.') }
  }

  async function handleSaveBc() {
    if (!workspace?.id || !form.apelido || !form.bc_id || !form.access_token) { showToast('err', 'Preencha todos os campos.'); return }
    setSaving(true)
    const { error } = await supabase.from('bc_configs').insert({ workspace_id: workspace.id, apelido: form.apelido, bc_id: form.bc_id, access_token: form.access_token, proxy_url: form.proxy_url || null, ativo: true })
    if (error) { showToast('err', error.message); setSaving(false); return }
    setForm({ apelido: '', bc_id: '', access_token: '', proxy_url: '' }); setTestState('idle'); setShowTkForm(false)
    showToast('ok', 'BC adicionada! Clique em sincronizar.'); await load(workspace.id); setSaving(false)
  }

  async function handleSyncBc(bc: BC) {
    setSyncingBc(bc.id)
    const { error } = await supabase.functions.invoke('sync-bc', { body: { bc_config_id: bc.id, workspace_id: workspace?.id } })
    error ? showToast('err', `Sync falhou: ${error.message}`) : showToast('ok', `"${bc.apelido}" sincronizada!`)
    if (workspace?.id) await load(workspace.id); setSyncingBc(null)
  }

  async function handleDeleteBc(id: string) {
    if (!confirm('Remover esta BC?')) return
    await supabase.from('bc_configs').delete().eq('id', id)
    if (workspace?.id) load(workspace.id)
  }

  async function handleSyncMeta(conn: MetaConn) {
    setSyncingMeta(conn.fb_user_id)
    const res  = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace?.id, fb_user_id: conn.fb_user_id }) })
    const json = await res.json()
    json.ok ? showToast('ok', `Meta sincronizado — ${json.synced} contas.`) : showToast('err', json.error ?? 'Sync falhou.')
    if (workspace?.id) await load(workspace.id); setSyncingMeta(null)
  }

  async function handleDisconnectMeta(conn: MetaConn) {
    if (!confirm(`Desconectar ${conn.fb_user_name}?`)) return
    await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace?.id, fb_user_id: conn.fb_user_id }) })
    if (workspace?.id) load(workspace.id); showToast('ok', 'Desconectado.')
  }

  const totalTk   = bcs.flatMap(b => b.advertiser_accounts).reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalMeta = metaAccs.reduce((s, a) => s + (a.balance ?? 0), 0)
  const tkContas  = bcs.flatMap(b => b.advertiser_accounts).length
  const warnTk    = bcs.flatMap(b => b.advertiser_accounts).some(a => (a.balance ?? 0) < 100)
  const warnMeta  = metaAccs.some(a => (a.balance ?? 0) < 20)
  const activeSources = (bcs.length > 0 ? 1 : 0) + (metaConns.length > 0 ? 1 : 0)
  const connectedAccounts = tkContas + metaAccs.length
  const integrationWarnings = (warnTk ? 1 : 0) + (warnMeta ? 1 : 0)
  const lastTkSync = bcs.map(b => b.last_sync).filter(Boolean).sort().at(-1)
  const lastMetaSync = metaAccs.map(a => a.last_balance_sync).filter(Boolean).sort().at(-1)
  const lastSync = [lastTkSync, lastMetaSync].filter(Boolean).sort().at(-1)
  const activationPct = Math.round((activeSources / 3) * 100)

  // Status geral TikTok
  const tkStatus = bcs.length === 0 ? 'disconnected' : warnTk ? 'partial' : 'connected'
  const metaStatus = metaConns.length === 0 ? 'disconnected' : warnMeta ? 'partial' : 'connected'

  const tkStats = bcs.length > 0 ? [
    { label: 'BCs', value: String(bcs.length) },
    { label: 'Contas', value: String(tkContas) },
    { label: 'Saldo total', value: toBRL(totalTk) },
  ] : undefined

  const metaStats = metaConns.length > 0 ? [
    { label: 'Contas', value: String(metaAccs.length) },
    { label: 'Saldo total', value: toBRL(totalMeta) },
  ] : undefined


  return (
    <div className="shell-page">
      <PageHeader title="Integrações" sub="Conecte as fontes que alimentam gasto, saldo e campanhas"
        right={<StatusPill tone={integrationWarnings > 0 ? 'warn' : activeSources > 0 ? 'good' : 'neutral'}>{integrationWarnings > 0 ? `${integrationWarnings} ponto${integrationWarnings > 1 ? 's' : ''} de atenção` : activeSources > 0 ? 'Operacional' : 'Configuração pendente'}</StatusPill>} />

      {toast && (
        <div role="status" style={{ position: 'fixed', right: 20, top: 76, zIndex: 60, borderRadius: 10, padding: '10px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, background: '#161a2c', boxShadow: '0 14px 40px rgba(0,0,0,.45)', border: `1px solid ${toast.type === 'ok' ? 'rgba(116,211,171,.3)' : 'rgba(240,137,155,.3)'}`, color: toast.type === 'ok' ? H.green : H.red }}>
          {toast.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}{toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <TikTokEventsApiCard />
      </div>

      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <KpiCard icon={Activity} label="Fontes ativas" value={`${activeSources}/3`} foot="TikTok · Meta · Kwai" progress={activationPct / 100} loading={loading} />
        <KpiCard icon={ShieldCheck} label="Contas monitoradas" value={String(connectedAccounts)} foot={`${tkContas} TikTok · ${metaAccs.length} Meta`} progress={connectedAccounts ? 1 : 0} loading={loading} />
        <KpiCard icon={Wallet} label="Saldo total" value={toBRL(totalTk + totalMeta)} foot={integrationWarnings ? 'tem conta com saldo baixo' : 'saldos ok'} progress={integrationWarnings ? 0.3 : 1} loading={loading} />
        <KpiCard icon={Clock3} label="Última sincronização" value={lastSync ? timeAgo(lastSync) : '—'} foot={lastSync ? new Date(lastSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sincronize uma fonte'} progress={lastSync ? Math.max(0.05, 1 - Math.min(1, (Date.now() - new Date(lastSync).getTime()) / 86400000)) : 0} loading={loading} />
      </div>

      <div className="hk-2eq" style={{ marginBottom: 12 }}>
        {/* ── TikTok Ads ── */}
        <SourceCard logo={<TikTokLogo size={20} />} name="TikTok Ads" desc="Campanhas, adsets, criativos e saldo das contas via Business Center."
          status={tkStatus as any} statusLabel={bcs.length ? `${bcs.length} BC${bcs.length > 1 ? 's' : ''}${warnTk ? ' · saldo baixo' : ''}` : 'Não conectado'}
          stats={tkStats?.map(s => ({ ...s, warn: s.label === 'Saldo total' && warnTk }))}
          expanded={expandTk} onExpand={bcs.length ? () => setExpandTk(e => !e) : undefined}
          actions={<>
            <button className={showTkForm ? 'tt-btn' : 'tt-btn tt-btn-primary'} onClick={() => setShowTkForm(s => !s)}><Plus size={13} />{showTkForm ? 'Cancelar' : 'Adicionar BC'}</button>
            {bcs.map(bc => (
              <button key={bc.id} className="tt-btn" onClick={() => handleSyncBc(bc)} disabled={syncingBc === bc.id} title={`Sincronizar ${bc.apelido}`}>
                <RefreshCw size={12} style={{ animation: syncingBc === bc.id ? 'spin 1s linear infinite' : 'none' }} />{bcs.length > 1 ? bc.apelido : 'Sincronizar'}
              </button>
            ))}
          </>}
          form={showTkForm ? <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Apelido"><FInput value={form.apelido} onChange={v => setForm(f => ({ ...f, apelido: v }))} placeholder="Ex: BC Principal" /></Field>
              <Field label="BC ID"><FInput value={form.bc_id} onChange={v => setForm(f => ({ ...f, bc_id: v }))} placeholder="Ex: 7123456789" /></Field>
            </div>
            <Field label="Access token"><FSecret value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="Cole o access token" /></Field>
            <Field label="Proxy URL" hint="opcional"><FInput value={form.proxy_url} onChange={v => setForm(f => ({ ...f, proxy_url: v }))} placeholder="http://user:pass@ip:porta" /></Field>
            <TestResult state={testState} msg={testMsg} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tt-btn" onClick={handleTest} disabled={testState === 'testing'}><Wifi size={12} />{testState === 'testing' ? 'Testando...' : 'Testar conexão'}</button>
              <button className="tt-btn tt-btn-primary" onClick={handleSaveBc} disabled={saving}>{saving ? 'Salvando...' : 'Salvar BC'}</button>
            </div>
          </> : undefined}>
          {expandTk && bcs.length > 0 && (
            <div style={{ borderTop: `1px solid ${H.lineSoft}` }}>
              {bcs.map(bc => (
                <div key={bc.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'rgba(9,11,22,.3)', borderBottom: `1px solid ${H.lineSoft}` }}>
                    <StatusPill tone={bc.sync_error ? 'bad' : bc.ativo ? 'good' : 'neutral'}>{bc.apelido}</StatusPill>
                    <span className="tt-mono" style={{ fontSize: 10.5, color: H.muted }}>BC {bc.bc_id}</span>
                    <div style={{ flex: 1 }} />
                    {bc.sync_error && <span title={bc.sync_error} style={{ fontSize: 11, color: H.red, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bc.sync_error}</span>}
                    {bc.last_sync && <span className="tt-cap">sync há {timeAgo(bc.last_sync)}</span>}
                    <button className="tt-icon-btn" style={{ width: 26, height: 26 }} onClick={() => handleDeleteBc(bc.id)} aria-label={`Remover ${bc.apelido}`}><Trash2 size={12} /></button>
                  </div>
                  {bc.advertiser_accounts.length === 0 && <Empty pad={14}>Nenhuma conta sincronizada ainda.</Empty>}
                  {bc.advertiser_accounts.map(adv => <AccountRow key={adv.id} nome={adv.nome ?? `#${adv.advertiser_id}`} id={adv.advertiser_id} balance={adv.balance} currency={adv.currency} status={adv.status ?? 'ACTIVE'} warn={(adv.balance ?? 0) < 100} />)}
                </div>
              ))}
            </div>
          )}
        </SourceCard>

        {/* ── Meta Ads ── */}
        <SourceCard logo={<MetaLogo size={20} />} name="Meta Ads" desc="Business Manager com campanhas do Facebook e Instagram, gasto diário e saldo."
          status={metaStatus as any} statusLabel={metaConns.length ? `${metaConns.length} conexão${metaConns.length > 1 ? 'ões' : ''}${warnMeta ? ' · saldo baixo' : ''}` : 'Não conectado'}
          stats={metaStats?.map(s => ({ ...s, warn: s.label === 'Saldo total' && warnMeta }))}
          expanded={expandMeta} onExpand={metaConns.length ? () => setExpandMeta(e => !e) : undefined}
          actions={<>
            {metaConns.length === 0 && <button className="tt-btn tt-btn-primary" onClick={handleConnectMeta}><MetaLogo size={14} /> Conectar com Facebook</button>}
            {metaConns.map(conn => (
              <button key={conn.id} className="tt-btn" onClick={() => handleSyncMeta(conn)} disabled={syncingMeta === conn.fb_user_id}>
                <RefreshCw size={12} style={{ animation: syncingMeta === conn.fb_user_id ? 'spin 1s linear infinite' : 'none' }} />Sincronizar{metaConns.length > 1 ? ` ${conn.fb_user_name}` : ''}
              </button>
            ))}
            <button className="tt-btn" onClick={() => setShowMetaForm(s => !s)}><Plus size={12} />{showMetaForm ? 'Cancelar' : 'Usar token de sistema'}</button>
          </>}
          form={showMetaForm ? <>
            <Field label="Apelido" hint="opcional"><FInput value={metaApelido} onChange={setMetaApelido} placeholder="Ex: BM Principal" /></Field>
            <Field label="Access token" hint="Gerenciador de Negócios → Usuários do sistema"><FSecret value={metaToken} onChange={setMetaToken} placeholder="Cole o token aqui" /></Field>
            <TestResult state={metaTestState} msg={metaTestMsg} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tt-btn" onClick={handleTestMeta} disabled={metaTestState === 'testing'}><Wifi size={12} />{metaTestState === 'testing' ? 'Testando...' : 'Testar token'}</button>
              <button className="tt-btn tt-btn-primary" onClick={handleSaveMeta} disabled={savingMeta}>{savingMeta ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </> : undefined}>
          {expandMeta && metaConns.length > 0 && (
            <div style={{ borderTop: `1px solid ${H.lineSoft}` }}>
              {metaConns.map(conn => (
                <div key={conn.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'rgba(9,11,22,.3)', borderBottom: `1px solid ${H.lineSoft}` }}>
                    <StatusPill tone="good">{conn.fb_user_name}</StatusPill>
                    <span className="tt-mono" style={{ fontSize: 10.5, color: H.muted }}>ID {conn.fb_user_id}</span>
                    <div style={{ flex: 1 }} />
                    <button className="tt-icon-btn" style={{ width: 26, height: 26 }} onClick={() => handleDisconnectMeta(conn)} aria-label={`Desconectar ${conn.fb_user_name}`}><Trash2 size={12} /></button>
                  </div>
                  {metaAccs.map(acc => <AccountRow key={acc.id} nome={acc.nome} id={acc.account_id} balance={acc.balance} currency={acc.currency} status={acc.status} warn={(acc.balance ?? 0) < 20} />)}
                </div>
              ))}
            </div>
          )}
        </SourceCard>
      </div>

      <div className="tt-cap" style={{ margin: '4px 2px 10px', fontSize: 12, color: H.sub, fontWeight: 600 }}>Próximos canais</div>
      <div className="tt-grid-3" style={{ gap: 12 }}>
        {[
          { name: 'Kwai Ads', desc: 'Gasto, campanhas e ROAS junto com TikTok e Meta — sync via Edge Function no mesmo padrão.', tag: 'Mapeando API' },
          { name: 'Google Ads', desc: 'Search e YouTube Ads com gasto e conversões por campanha.', tag: 'Em breve' },
          { name: 'Taboola', desc: 'Native ads com gasto e conversões por campanha.', tag: 'Em breve' },
        ].map(p => (
          <Panel key={p.name} style={{ padding: 16, opacity: p.tag === 'Em breve' ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(163,167,242,.10)', color: H.lav, fontWeight: 800 }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}><div style={{ color: H.text, fontWeight: 700, fontSize: 13 }}>{p.name}</div></div>
              <span className="tt-chip">{p.tag}</span>
            </div>
            <p style={{ color: H.muted, fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{p.desc}</p>
          </Panel>
        ))}
      </div>
    </div>
  )
}
